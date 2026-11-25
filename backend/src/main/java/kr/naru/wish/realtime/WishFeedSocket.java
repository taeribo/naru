package kr.naru.wish.realtime;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class WishFeedSocket extends TextWebSocketHandler {
    public static final String PATH = "/api/wishes/ws";
    private static final TextMessage WISH_CREATED = new TextMessage("wish-created");

    private final ConcurrentMap<String, WebSocketSession> subscribers = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        session.setTextMessageSizeLimit(256);
        subscribers.put(session.getId(), new ConcurrentWebSocketSessionDecorator(session, 2_000, 1_024));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        subscribers.remove(session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        disconnect(session);
    }

    @TransactionalEventListener(fallbackExecution = true)
    public void wishCreated(WishCreated event) {
        for (WebSocketSession session : subscribers.values()) {
            try {
                session.sendMessage(WISH_CREATED);
            } catch (IOException | RuntimeException exception) {
                disconnect(session);
            }
        }
    }

    private void disconnect(WebSocketSession session) {
        subscribers.remove(session.getId());
        try {
            session.close(CloseStatus.SERVER_ERROR);
        } catch (IOException | IllegalStateException ignored) {
            // The transport can close independently after a failed send.
        }
    }
}
