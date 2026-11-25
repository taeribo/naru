package kr.naru.api;

import kr.naru.wish.WishStore;
import kr.naru.wish.WishStore.Cursor;
import kr.naru.wish.WishStore.Wish;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.List;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/wishes")
public class WishController {
    private static final int MAX_MESSAGE_LENGTH = 200;
    private static final int PAGE_SIZE = 30;
    private static final int MAX_CURSOR_LENGTH = 128;
    private static final Instant MAX_CURSOR_TIME = Instant.parse("9999-12-31T23:59:59.999999999Z");
    private static final Pattern UUID_ID = Pattern.compile("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}");
    private static final Pattern NUMERIC_ID = Pattern.compile("[1-9][0-9]{0,19}");
    private static final Pattern AUTHOR_PATTERN = Pattern.compile("[a-f0-9]{32}");

    private final WishStore store;

    public WishController(WishStore store) {
        this.store = store;
    }

    @GetMapping
    public List<Wish> list(@RequestParam("author") String author) {
        validateAuthor(author);
        return store.listFor(author, null, PAGE_SIZE);
    }

    @GetMapping("/page")
    public WishPage page(@RequestParam("author") String author,
                         @RequestParam(name = "cursor", required = false) String token) {
        validateAuthor(author);
        Cursor before = token == null ? null : decodeCursor(token);
        List<Wish> rows = store.listFor(author, before, PAGE_SIZE + 1);
        if (rows.size() <= PAGE_SIZE) {
            return new WishPage(rows, null);
        }
        Wish last = rows.get(PAGE_SIZE - 1);
        String cursor = Base64.getUrlEncoder().withoutPadding().encodeToString(
                (last.createdAt() + "|" + last.id()).getBytes(StandardCharsets.UTF_8));
        return new WishPage(rows.subList(0, PAGE_SIZE), cursor);
    }

    private static Cursor decodeCursor(String token) {
        if (token.isEmpty() || token.length() > MAX_CURSOR_LENGTH) {
            throw invalidCursor();
        }
        try {
            String[] parts = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8).split("\\|", -1);
            if (parts.length != 2) {
                throw invalidCursor();
            }
            Instant createdAt = Instant.parse(parts[0]);
            if (createdAt.isBefore(Instant.EPOCH) || createdAt.isAfter(MAX_CURSOR_TIME)) {
                throw invalidCursor();
            }
            String id = parts[1];
            if (!UUID_ID.matcher(id).matches()) {
                if (!NUMERIC_ID.matcher(id).matches()) {
                    throw invalidCursor();
                }
                Long.parseUnsignedLong(id);
            }
            return new Cursor(createdAt, id);
        } catch (IllegalArgumentException | DateTimeParseException exception) {
            throw invalidCursor();
        }
    }

    private static ResponseStatusException invalidCursor() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid wish cursor");
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Wish create(@RequestBody WishRequest request) {
        validateAuthor(request.author());
        String message = request.message() == null ? "" : request.message().strip();
        if (message.isBlank() || message.codePointCount(0, message.length()) > MAX_MESSAGE_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A wish must contain 1 to 200 characters");
        }

        return store.create(request.author(), message);
    }

    private static void validateAuthor(String author) {
        if (author == null || !AUTHOR_PATTERN.matcher(author).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid wish author");
        }
    }

    public record WishPage(List<Wish> items, String nextCursor) {}

    public record WishRequest(String author, String message) {}
}
