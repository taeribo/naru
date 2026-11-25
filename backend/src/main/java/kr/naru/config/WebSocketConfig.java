package kr.naru.config;

import kr.naru.wish.realtime.WishFeedSocket;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration(proxyBeanMethods = false)
@EnableWebSocket
class WebSocketConfig implements WebSocketConfigurer {
    private final WishFeedSocket wishFeedSocket;

    WebSocketConfig(WishFeedSocket wishFeedSocket) {
        this.wishFeedSocket = wishFeedSocket;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(wishFeedSocket, WishFeedSocket.PATH);
    }
}
