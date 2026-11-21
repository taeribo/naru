package kr.naru.wish;

import java.time.Instant;
import java.util.List;

public interface WishStore {
    List<Wish> listFor(String author);

    Wish create(String author, String message);

    record Wish(String id, String message, Instant createdAt) {}
}
