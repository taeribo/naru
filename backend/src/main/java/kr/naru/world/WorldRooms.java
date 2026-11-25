package kr.naru.world;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class WorldRooms {
    private static final int CAPACITY = 30;
    private static final int OPEN_THRESHOLD = 26;
    private static final long RECONNECT_GRACE = 15_000;

    private final int maxRooms;
    private final Map<Integer, Room> rooms = new LinkedHashMap<>();
    private final Map<String, Member> members = new LinkedHashMap<>();
    private final Map<String, Member> connections = new LinkedHashMap<>();
    private final ArrayDeque<Member> queue = new ArrayDeque<>();

    public WorldRooms(@Value("${naru.world.max-rooms:2}") int maxRooms) {
        if (maxRooms < 1 || maxRooms > 10) {
            throw new IllegalArgumentException("naru.world.max-rooms must be between 1 and 10");
        }
        this.maxRooms = maxRooms;
    }

    public synchronized String join(String connection, String token) {
        if (connections.containsKey(connection)) return null;
        expire(System.currentTimeMillis());
        Member member = token == null ? null : members.get(token);
        String replaced = null;
        if (member == null) {
            member = new Member();
            members.put(member.token, member);
            queue.addLast(member);
        } else {
            replaced = member.connection;
            if (replaced != null) connections.remove(replaced);
            if (member.room != null) member.room.dirty = true;
        }
        member.connection = connection;
        member.needsWelcome = true;
        member.leftAt = 0;
        connections.put(connection, member);
        fillQueue();
        return replaced;
    }

    public synchronized void leave(String connection) {
        Member member = connections.remove(connection);
        if (member == null) return;
        member.connection = null;
        member.leftAt = System.currentTimeMillis();
        if (member.room == null) {
            members.remove(member.token);
            queue.remove(member);
        } else {
            member.targetX = member.x;
            member.targetZ = member.z;
            member.room.dirty = true;
        }
    }

    public synchronized void move(String connection, double x, double z) {
        Member member = connections.get(connection);
        if (member == null || member.room == null || !Double.isFinite(x) || !Double.isFinite(z)) return;
        if (x < -27 || x > 27 || z < -19 || z > 36 || Math.hypot(x, z) < 2.7) return;
        member.targetX = x;
        member.targetZ = z;
    }

    synchronized List<Delivery> tick(long now) {
        expire(now);
        fillQueue();
        List<Delivery> deliveries = new ArrayList<>();
        int position = 0;
        for (Member member : queue) {
            position++;
            if (member.needsWelcome || member.queuePosition != position) {
                deliveries.add(new Delivery(List.of(member.connection),
                        new Waiting("waiting", member.token, position)));
                member.needsWelcome = false;
                member.queuePosition = position;
            }
        }
        for (Room room : rooms.values()) {
            List<String> recipients = new ArrayList<>();
            List<Player> players = new ArrayList<>();
            for (Member member : room.members) {
                if (member.connection == null) continue;
                recipients.add(member.connection);
                if (member.needsWelcome) {
                    deliveries.add(new Delivery(List.of(member.connection),
                            new Joined("joined", member.token, member.id, room.number)));
                    member.needsWelcome = false;
                    room.dirty = true;
                }
                if (advance(member)) room.dirty = true;
                players.add(new Player(member.id, member.x, member.z));
            }
            if (room.dirty && !recipients.isEmpty()) {
                deliveries.add(new Delivery(recipients, new Snapshot("snapshot", players)));
            }
            room.dirty = false;
        }
        return deliveries;
    }

    public synchronized Integer roomFor(String token) {
        Member member = token == null ? null : members.get(token);
        return member == null || member.connection == null || member.room == null ? null : member.room.number;
    }

    synchronized List<String> peers(String token) {
        Member member = token == null ? null : members.get(token);
        if (member == null || member.connection == null || member.room == null) return List.of();
        return member.room.members.stream()
                .filter(peer -> peer != member && peer.connection != null)
                .map(peer -> peer.connection).toList();
    }

    private void expire(long now) {
        var iterator = members.values().iterator();
        while (iterator.hasNext()) {
            Member member = iterator.next();
            if (member.leftAt == 0 || now - member.leftAt < RECONNECT_GRACE) continue;
            member.room.members.remove(member);
            member.room.dirty = true;
            iterator.remove();
        }
    }

    private void fillQueue() {
        while (!queue.isEmpty()) {
            Room room = availableRoom();
            if (room == null) return;
            Member member = queue.removeFirst();
            member.room = room;
            member.needsWelcome = true;
            int spawn = room.members.size();
            // 입장 계단 남쪽 아래: 가로 10명씩 줄을 지어 시작한다.
            member.x = member.targetX = (spawn % 10 - 4.5) * 0.7;
            member.z = member.targetZ = 30.6 + spawn / 10 * 0.8;
            room.members.add(member);
            room.dirty = true;
            if (room.members.size() == OPEN_THRESHOLD && rooms.size() < maxRooms
                    && rooms.values().stream().allMatch(active -> active.members.size() >= OPEN_THRESHOLD)) {
                openRoom();
            }
        }
    }

    private Room availableRoom() {
        for (Room room : rooms.values()) {
            if (room.members.size() < OPEN_THRESHOLD) return room;
        }
        if (rooms.size() < maxRooms) return openRoom();
        return rooms.values().stream().filter(room -> room.members.size() < CAPACITY).findFirst().orElse(null);
    }

    private Room openRoom() {
        int number = rooms.size() + 1;
        Room room = new Room(number);
        rooms.put(number, room);
        return room;
    }

    private static boolean advance(Member member) {
        double dx = member.targetX - member.x;
        double dz = member.targetZ - member.z;
        double distance = Math.hypot(dx, dz);
        if (distance < 0.001) return false;
        double step = Math.min(1, 0.45 / distance);
        double x = member.x + dx * step;
        double z = member.z + dz * step;
        if (Math.hypot(x, z) < 2.65) {
            member.targetX = member.x;
            member.targetZ = member.z;
            return false;
        }
        member.x = x;
        member.z = z;
        return true;
    }

    private static final class Member {
        final String id = UUID.randomUUID().toString();
        final String token = UUID.randomUUID().toString();
        String connection;
        Room room;
        long leftAt;
        boolean needsWelcome;
        int queuePosition;
        double x;
        double z;
        double targetX;
        double targetZ;
    }

    private static final class Room {
        final int number;
        final List<Member> members = new ArrayList<>();
        boolean dirty;

        Room(int number) { this.number = number; }
    }

    record Delivery(List<String> connections, Object event) {}
    record Waiting(String type, String token, int position) {}
    record Joined(String type, String token, String id, int room) {}
    record Player(String id, double x, double z) {}
    record Snapshot(String type, List<Player> players) {}
}
