package kr.naru.api;

import kr.naru.wish.WishStore;
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

import java.util.List;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/wishes")
public class WishController {
    private static final int MAX_MESSAGE_LENGTH = 200;
    private static final Pattern AUTHOR_PATTERN = Pattern.compile("[a-f0-9]{32}");

    private final WishStore store;

    public WishController(WishStore store) {
        this.store = store;
    }

    @GetMapping
    public List<Wish> list(@RequestParam("author") String author) {
        validateAuthor(author);
        return store.listFor(author);
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

    public record WishRequest(String author, String message) {}
}
