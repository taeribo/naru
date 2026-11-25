package kr.naru.fortune;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/fortunes")
class FortuneController {
    private static final Pattern UUID_V4 = Pattern.compile(
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}");
    private static final String VISITOR = "X-Visitor-Id";

    private final DailyFortune fortunes;
    private final int requestsPerSecond;
    private long window = -1;
    private int requests;

    FortuneController(DailyFortune fortunes, @Value("${NARU_FORTUNE_REQUESTS_PER_SECOND:600}") int requestsPerSecond) {
        this.fortunes = fortunes;
        this.requestsPerSecond = Math.max(1, requestsPerSecond);
    }

    @GetMapping({"", "/categories"})
    List<Category> categories() {
        return Arrays.stream(FortuneCategory.values())
                .map(category -> new Category(category, category.displayName())).toList();
    }

    @GetMapping("/daily")
    ResponseEntity<DailyFortune.Result> daily(@RequestParam("category") String code,
                                             @RequestHeader(VISITOR) String visitor) {
        return privateResponse(draw(code, visitor, HttpStatus.BAD_REQUEST));
    }

    @GetMapping("/{code}")
    ResponseEntity<LegacyResult> fortune(@PathVariable("code") String code,
                                         @RequestHeader(VISITOR) String visitor) {
        var result = draw("STUDY".equals(code) ? "GROWTH" : code, visitor, HttpStatus.NOT_FOUND);
        return privateResponse(new LegacyResult(result.category(), result.category().displayName(), result.content()));
    }

    private DailyFortune.Result draw(String code, String visitor, HttpStatus unknownCategory) {
        checkLimit();
        if (!UUID_V4.matcher(visitor).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid visitor ID");
        }
        FortuneCategory category;
        try {
            category = FortuneCategory.valueOf(code);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(unknownCategory, "Unsupported fortune category");
        }
        return fortunes.draw(UUID.fromString(visitor), category, Instant.now());
    }

    private synchronized void checkLimit() {
        long now = System.nanoTime() / 1_000_000_000;
        if (now != window) {
            window = now;
            requests = 0;
        }
        if (requests >= requestsPerSecond) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Retry later");
        }
        requests++;
    }

    private static <T> ResponseEntity<T> privateResponse(T result) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).varyBy(VISITOR).body(result);
    }

    record Category(FortuneCategory code, String name) {}
    record LegacyResult(FortuneCategory code, String name, String message) {}
}
