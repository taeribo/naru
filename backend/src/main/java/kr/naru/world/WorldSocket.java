package kr.naru.world;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.naru.wish.realtime.WishCreated;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WorldSocket extends TextWebSocketHandler {
    public static final String PATH = "/api/world/ws";

    private final WorldRooms rooms;
    private final ObjectMapper json;
    private final ConcurrentHashMap<String, WebSocketSession> sockets = new ConcurrentHashMap<>();

    WorldSocket(WorldRooms rooms, ObjectMapper json) {
        this.rooms = rooms;
        this.json = json;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        session.setTextMessageSizeLimit(512);
        sockets.put(session.getId(), new ConcurrentWebSocketSessionDecorator(session, 2_000, 24_576));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        JsonNode input = json.readTree(message.getPayload());
        if (input == null || !input.isObject()) return;
        switch (input.path("type").asText()) {
            case "join" -> {
                String token = input.path("token").asText(null);
                String replaced = rooms.join(session.getId(), token);
                if (replaced != null) disconnect(replaced, CloseStatus.POLICY_VIOLATION);
            }
            case "move" -> {
                if (input.path("x").isNumber() && input.path("z").isNumber()) {
                    rooms.move(session.getId(), input.path("x").asDouble(), input.path("z").asDouble());
                }
            }
            default -> { }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sockets.remove(session.getId());
        rooms.leave(session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        disconnect(session.getId(), CloseStatus.SERVER_ERROR);
    }

    @Scheduled(fixedDelay = 100)
    void updateWorld() throws IOException {
        for (WorldRooms.Delivery delivery : rooms.tick(System.currentTimeMillis())) {
            send(delivery.connections(), delivery.event());
        }
    }

    @TransactionalEventListener(fallbackExecution = true)
    public void wishCreated(WishCreated event) throws IOException {
        List<String> peers = rooms.peers(event.roomToken());
        if (!peers.isEmpty()) send(peers, new Lantern("lantern", event.wishId()));
    }

    private void send(List<String> recipients, Object payload) throws IOException {
        TextMessage message = new TextMessage(json.writeValueAsString(payload));
        for (String id : recipients) {
            WebSocketSession socket = sockets.get(id);
            if (socket == null) continue;
            try {
                socket.sendMessage(message);
            } catch (IOException | RuntimeException exception) {
                disconnect(id, CloseStatus.SERVER_ERROR);
            }
        }
    }

    private void disconnect(String id, CloseStatus reason) {
        WebSocketSession socket = sockets.remove(id);
        rooms.leave(id);
        if (socket == null) return;
        try {
            socket.close(reason);
        } catch (IOException | IllegalStateException ignored) {
            // Transport cleanup can already be in progress.
        }
    }

    record Lantern(String type, String id) {}
}
