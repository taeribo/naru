package kr.naru.world;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WorldWebSocketTest {
    @LocalServerPort
    private int port;

    @Autowired
    private ObjectMapper json;

    @Autowired
    private TestRestTemplate http;

    @Test
    void capsRoomsAndScopesMovementAndDoesNotPublishWishAnimations() throws Exception {
        var client = HttpClient.newHttpClient();
        var visitors = new ArrayList<Visitor>();
        try {
            for (int index = 0; index < 61; index++) {
                visitors.add(connect(client, null));
            }

            var firstRoom = new ArrayList<Visitor>();
            var secondRoom = new ArrayList<Visitor>();
            var waiting = new ArrayList<Visitor>();
            for (var visitor : visitors) {
                visitor.assignment = visitor.await(event -> is(event, "joined") || is(event, "waiting"));
                switch (visitor.assignment.path("room").asInt()) {
                    case 1 -> firstRoom.add(visitor);
                    case 2 -> secondRoom.add(visitor);
                    default -> waiting.add(visitor);
                }
            }
            assertThat(firstRoom).hasSize(30);
            assertThat(secondRoom).hasSize(30);
            assertThat(waiting).singleElement()
                    .satisfies(visitor -> assertThat(visitor.assignment.path("position").asInt()).isEqualTo(1));

            var mover = firstRoom.get(0);
            var peer = firstRoom.get(1);
            var otherRoom = secondRoom.get(0);
            String moverId = mover.assignment.path("id").asText();
            mover.send(Map.of("type", "move", "x", 0, "z", 10.5));
            var moved = peer.await(event -> is(event, "snapshot")
                    && hasPosition(event, moverId, 10.5));
            assertThat(moved.path("players").size()).isEqualTo(30);
            assertThat(otherRoom.await(event -> is(event, "snapshot")).path("players").toString())
                    .doesNotContain(moverId);

            String token = mover.assignment.path("token").asText();
            mover.socket.abort();
            var resumed = connect(client, token);
            visitors.add(resumed);
            assertThat(resumed.await(event -> is(event, "joined"))).isEqualTo(mover.assignment);

            var response = http.postForEntity("/api/wishes",
                    Map.of("author", "47".repeat(16), "message", "소원패 공개 등록 확인", "roomToken", token),
                    JsonNode.class);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
            String wishId = response.getBody().path("id").asText();
            var page = http.getForEntity("/api/wishes/page?author=" + "65".repeat(16), JsonNode.class);
            assertThat(page.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(page.getBody().path("items").toString()).contains(wishId);

            // The world socket should send the next position snapshot without a wish animation.
            resumed.send(Map.of("type", "move", "x", 0, "z", 12));
            assertThat(peer.await(event -> event.path("id").asText().equals(wishId)
                    || (is(event, "snapshot") && hasPosition(event, moverId, 12))).path("type").asText())
                    .isEqualTo("snapshot");
        } finally {
            visitors.forEach(visitor -> visitor.socket.abort());
        }
    }

    private Visitor connect(HttpClient client, String token) throws Exception {
        var visitor = new Visitor();
        visitor.socket = client.newWebSocketBuilder().connectTimeout(Duration.ofSeconds(5))
                .header("Origin", "http://localhost:" + port)
                .buildAsync(URI.create("ws://localhost:" + port + "/api/world/ws"), visitor)
                .get(5, TimeUnit.SECONDS);
        visitor.send(token == null ? Map.of("type", "join") : Map.of("type", "join", "token", token));
        return visitor;
    }

    private static boolean is(JsonNode event, String type) {
        return event.path("type").asText().equals(type);
    }

    private static boolean hasPosition(JsonNode event, String id, double z) {
        for (var player : event.path("players")) {
            if (player.path("id").asText().equals(id) && player.path("z").asDouble() == z) return true;
        }
        return false;
    }

    private final class Visitor implements WebSocket.Listener {
        private final StringBuilder buffer = new StringBuilder();
        private final LinkedBlockingQueue<String> messages = new LinkedBlockingQueue<>();
        private WebSocket socket;
        private JsonNode assignment;

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            buffer.append(data);
            if (last) {
                messages.add(buffer.toString());
                buffer.setLength(0);
            }
            webSocket.request(1);
            return null;
        }

        void send(Map<String, ?> message) throws Exception {
            socket.sendText(json.writeValueAsString(message), true).get(5, TimeUnit.SECONDS);
        }

        JsonNode await(Predicate<JsonNode> matches) throws Exception {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
            while (true) {
                String message = messages.poll(deadline - System.nanoTime(), TimeUnit.NANOSECONDS);
                if (message == null) throw new AssertionError("Expected WebSocket event was not received");
                JsonNode event = json.readTree(message);
                if (matches.test(event)) return event;
            }
        }
    }
}
