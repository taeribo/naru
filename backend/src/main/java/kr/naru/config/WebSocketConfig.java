package kr.naru.config;

import kr.naru.wish.realtime.WishFeedSocket;
import kr.naru.world.WorldSocket;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration(proxyBeanMethods = false)
@EnableScheduling
@EnableWebSocket
class WebSocketConfig implements WebSocketConfigurer {
    private final WishFeedSocket wishFeedSocket;

    private final WorldSocket worldSocket;

    WebSocketConfig(WishFeedSocket wishFeedSocket, WorldSocket worldSocket) {
        this.wishFeedSocket = wishFeedSocket;
        this.worldSocket = worldSocket;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(wishFeedSocket, WishFeedSocket.PATH);
        registry.addHandler(worldSocket, WorldSocket.PATH);
    }
}
