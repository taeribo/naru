package kr.naru.wish;

import java.time.Instant;
import java.util.List;

public interface WishStore {
    List<Wish> listFor(String author, Cursor before, int limit);

    Wish create(String author, String message);

    record Cursor(Instant createdAt, String id) {}

    record Wish(String id, String message, Instant createdAt) {}
}
