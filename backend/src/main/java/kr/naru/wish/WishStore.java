package kr.naru.wish;

import java.time.Instant;
import java.util.List;

public interface WishStore {
    List<Wish> listFor(String author, Cursor before, int limit);

    default Wish create(String author, String message) {
        return create(author, message, null);
    }

    Wish create(String author, String message, Integer assignedRoom);

    record Cursor(Instant createdAt, String id) {}

    record Wish(String id, String message, Instant createdAt) {}
}
