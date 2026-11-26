import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { once } from 'node:events'
import { performance } from 'node:perf_hooks'
import { setTimeout as sleep } from 'node:timers/promises'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const jar = fileURLToPath(new URL('../backend/build/libs/naru-backend-0.0.1-SNAPSHOT.jar', import.meta.url))
const levels = [60, 150, 300]
const duration = 20_000
const interval = 500

function percentile(values, fraction) {
  if (!values.length) return null
  const sorted = values.toSorted((a, b) => a - b)
  return Math.round(sorted[Math.ceil(sorted.length * fraction) - 1])
}

function summary(values) {
  return { p50: percentile(values, 0.5), p95: percentile(values, 0.95), p99: percentile(values, 0.99) }
}

async function until(predicate, description, timeout = 8_000) {
  const deadline = performance.now() + timeout
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error(`Timed out: ${description}`)
    await sleep(20)
  }
}

function resources(pid) {
  const [cpuTime, rss] = execFileSync('ps', ['-p', String(pid), '-o', 'time=', '-o', 'rss='], {
    encoding: 'utf8',
  }).trim().split(/\s+/)
  const cpuSeconds = cpuTime.split(/[:-]/).reduceRight(
    (state, part, index, parts) => state + Number(part) * [1, 60, 3600, 86400][parts.length - index - 1],
    0,
  )
  return { cpuSeconds, rssMiB: Number(rss) / 1024 }
}

async function runLoad(port, pid, count) {
  const clients = []
  const samples = []
  const commands = new Map()
  const latencies = []
  let unexpectedCloses = 0
  let socketErrors = 0
  let snapshotFrames = 0
  let measuring = false
  function connect() {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/world/ws`)
    const client = { ws, start: performance.now(), players: new Map(), expectedClose: false }
    clients.push(client)
    ws.addEventListener('open', () => ws.send(JSON.stringify({ type: 'join' })))
    ws.addEventListener('close', () => {
      if (!client.expectedClose) unexpectedCloses++
    })
    ws.addEventListener('error', () => { socketErrors++ })
    ws.addEventListener('message', ({ data }) => {
      const event = JSON.parse(data)
      if (event.type === 'joined' || event.type === 'waiting') {
        client.assignment = event
        client.assignmentMs = performance.now() - client.start
      } else if (event.type === 'snapshot') {
        if (measuring) snapshotFrames++
        for (const player of event.players) {
          const pending = commands.get(player.id)
          if (pending?.observer === client && player.z !== pending.previousZ) {
            latencies.push(performance.now() - pending.sent)
            commands.delete(player.id)
          }
          client.players.set(player.id, player)
        }
      }
    })
    return client
  }

  function close(client) {
    client.expectedClose = true
    client.ws.close()
  }

  try {
    // Ramp up in batches of ten so the largest stage reaches 300 connections in under a second.
    for (let index = 0; index < count; index++) {
      connect()
      if ((index + 1) % 10 === 0) await sleep(25)
    }
    await until(() => clients.every((client) => client.assignment?.type === 'joined'), 'all visitors joined')
    const rooms = Map.groupBy(clients, (client) => client.assignment.room)
    for (const [room, members] of rooms) {
      assert(room >= 1 && room <= 10)
      assert(members.length <= 30)
    }
    assert.equal(rooms.size, Math.min(10, Math.ceil(count / 26)))
    await until(() => clients.every((client) => client.players.has(client.assignment.id)), 'initial snapshots')

    const overload = count === 300 ? connect() : null
    if (overload) {
      await until(() => overload.assignment?.type === 'waiting', 'visitor 301 placed on the queue')
      assert.equal(overload.assignment.position, 1)
    }

    const resourceStart = resources(pid)
    const start = performance.now()
    let sends = 0
    measuring = true
    for (let round = 0; round < duration / interval; round++) {
      for (const members of rooms.values()) {
        for (const [index, client] of members.entries()) {
          const observer = members[(index + 1) % members.length]
          if (observer === client) continue
          const id = client.assignment.id
          const previousZ = observer.players.get(id)?.z
          if (previousZ === undefined || commands.has(id) || client.ws.readyState !== WebSocket.OPEN) continue

          const targetZ = previousZ < 8 ? 10.5 : 5
          commands.set(id, { observer, previousZ, sent: performance.now() })
          client.ws.send(JSON.stringify({ type: 'move', x: 0, z: targetZ }))
          sends++
        }
      }
      if (round % 2 === 0) samples.push(resources(pid))
      const next = start + (round + 1) * interval
      await sleep(Math.max(0, next - performance.now()))
    }

    const elapsedSeconds = (performance.now() - start) / 1000
    const resourceEnd = resources(pid)
    samples.push(resourceEnd)
    measuring = false
    const report = {
      clients: count,
      perRoom: Object.fromEntries([...rooms].sort(([a], [b]) => a - b).map(([room, members]) => [room, members.length])),
      queuedAtCapacity: overload?.assignment.position ?? null,
      elapsedSeconds: Number(elapsedSeconds.toFixed(1)),
      joinMs: summary(clients.slice(0, count).map((client) => client.assignmentMs)),
      movementCommands: sends,
      movementObserved: latencies.length,
      movementPeerMs: summary(latencies),
      snapshotFrames,
      unexpectedCloses,
      socketErrors,
      jvmCpuAveragePercentOfOneCore: Math.round((resourceEnd.cpuSeconds - resourceStart.cpuSeconds) / elapsedSeconds * 100),
      jvmPeakRssMiB: Math.round(Math.max(...samples.map(({ rssMiB }) => rssMiB))),
    }
    console.log(JSON.stringify(report))
    assert.equal(unexpectedCloses, 0)
    assert.equal(socketErrors, 0)
    assert(latencies.length >= sends * 0.98, 'At least 98% of movement commands should be observed by a peer')
  } finally {
    clients.forEach(close)
  }
}

for (const count of levels) {
  // Use a fresh process and a random loopback port per stage to clear reconnect reservations.
  const server = spawn('java', [
    '-Xms128m', '-Xmx512m', '-jar', jar,
    '--spring.profiles.active=load-test', '--server.address=127.0.0.1', '--server.port=0', '--naru.world.max-rooms=10',
  ], { stdio: ['ignore', 'pipe', 'inherit'] })
  const exited = once(server, 'exit')
  let port
  createInterface({ input: server.stdout }).on('line', (line) => {
    const match = line.match(/Tomcat started on port (\d+)/)
    if (match) port = Number(match[1])
  })
  try {
    await until(() => port || server.exitCode !== null, 'local Spring Boot startup', 25_000)
    assert(port, `Spring Boot exited with code ${server.exitCode}`)
    await runLoad(port, server.pid, count)
  } finally {
    server.kill()
    await exited
  }
}
