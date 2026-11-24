package kr.naru.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WishHttpErrorTest {
    @Autowired
    private TestRestTemplate http;

    @Test
    void returnsBadRequestThroughEmbeddedTomcat() {
        var response = http.postForEntity("/api/wishes",
                Map.of("author", "a".repeat(32), "message", "🌸".repeat(201)), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(http.getForEntity("/error", String.class).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
