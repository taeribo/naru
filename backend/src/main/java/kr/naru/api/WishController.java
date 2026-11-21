package kr.naru.api;

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

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wishes")
public class WishController {
    private static final int MAX_MESSAGE_LENGTH = 120;
    private static final int MAX_WISHES = 100;
    private static final int LIST_SIZE = 30;

    private final Deque<StoredWish> wishes = new ArrayDeque<>();

    @GetMapping
    public synchronized List<WishResponse> list(@RequestParam("author") String author) {
        validateAuthor(author);
        return wishes.stream()
                .filter(wish -> !wish.author().equals(author))
                .limit(LIST_SIZE)
                .map(StoredWish::response)
                .toList();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public synchronized WishResponse create(@RequestBody WishRequest request) {
        validateAuthor(request.author());
        String message = request.message() == null ? "" : request.message().strip();
        if (message.isBlank() || message.length() > MAX_MESSAGE_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A wish must contain 1 to 120 characters");
        }

        WishResponse response = new WishResponse(UUID.randomUUID(), message);
        wishes.addFirst(new StoredWish(request.author(), response));
        if (wishes.size() > MAX_WISHES) {
            wishes.removeLast();
        }
        return response;
    }

    private static void validateAuthor(String author) {
        if (author == null || !author.matches("[a-f0-9]{32}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid wish author");
        }
    }

    public record WishRequest(String author, String message) {}
    public record WishResponse(UUID id, String message) {}
    private record StoredWish(String author, WishResponse response) {}
}
