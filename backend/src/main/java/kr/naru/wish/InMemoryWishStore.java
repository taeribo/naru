package kr.naru.wish;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.UUID;

@Repository
@Profile("!(mysql & wish-persistence)")
class InMemoryWishStore implements WishStore {
    private static final int MAX_WISHES = 100;
    private static final int LIST_SIZE = 30;

    private final Deque<StoredWish> wishes = new ArrayDeque<>();

    @Override
    public synchronized List<Wish> listFor(String author) {
        return wishes.stream()
                .filter(wish -> !wish.author().equals(author))
                .limit(LIST_SIZE)
                .map(StoredWish::wish)
                .toList();
    }

    @Override
    public synchronized Wish create(String author, String message) {
        Wish wish = new Wish(UUID.randomUUID().toString(), message, Instant.now());
        wishes.addFirst(new StoredWish(author, wish));
        if (wishes.size() > MAX_WISHES) {
            wishes.removeLast();
        }
        return wish;
    }

    private record StoredWish(String author, Wish wish) {}
}
