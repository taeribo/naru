package kr.naru.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.net.http.WebSocketHandshakeException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WishWebSocketTest {
    @Autowired
    private TestRestTemplate http;

    @LocalServerPort
    private int port;

    @Test
    void notifiesSubscribersOnlyWhenAWishIsRegistered() throws Exception {
        var messages = new LinkedBlockingQueue<String>();
        var socket = connect("http://localhost:" + port, new WebSocket.Listener() {
            private final StringBuilder text = new StringBuilder();

            @Override
            public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                text.append(data);
                if (last) {
                    messages.add(text.toString());
                    text.setLength(0);
                }
                webSocket.request(1);
                return null;
            }
        });

        try {
            String author = "31".repeat(16);
            assertThat(http.postForEntity("/api/wishes", Map.of("author", author, "message", " "), String.class)
                    .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(http.postForEntity("/api/wishes", Map.of("author", author, "message", "풍등 알림 검증"),
                    String.class).getStatusCode()).isEqualTo(HttpStatus.CREATED);
            assertThat(messages.poll(5, TimeUnit.SECONDS)).isEqualTo("wish-created");
            assertThat(messages.poll(250, TimeUnit.MILLISECONDS)).isNull();
        } finally {
            socket.abort();
        }
    }

    @Test
    void rejectsCrossOriginSubscriptions() {
        assertThatThrownBy(() -> connect("https://unrelated.example", new WebSocket.Listener() {}))
                .hasCauseInstanceOf(WebSocketHandshakeException.class);
    }

    private WebSocket connect(String origin, WebSocket.Listener listener) throws Exception {
        return HttpClient.newHttpClient()
                .newWebSocketBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .header("Origin", origin)
                .buildAsync(URI.create("ws://localhost:" + port + "/api/wishes/ws"), listener)
                .get(5, TimeUnit.SECONDS);
    }
}
