package kr.naru.config;

import jakarta.servlet.DispatcherType;
import kr.naru.wish.realtime.WishFeedSocket;
import kr.naru.world.WorldSocket;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.ignoringRequestMatchers(PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/wishes")))
                .authorizeHttpRequests(requests -> requests
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/wishes", "/api/wishes/page", WishFeedSocket.PATH).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/fortunes", "/api/fortunes/*", WorldSocket.PATH).permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/wishes").permitAll()
                        .anyRequest().denyAll())
                .build();
    }
}
