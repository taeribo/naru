package kr.naru.wish;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.UUID;

@Repository
@Profile("!(mysql & wish-persistence)")
class InMemoryWishStore implements WishStore {
    private static final int MAX_WISHES = 100;
    private static final Comparator<Wish> FEED_ORDER =
            Comparator.comparing(Wish::createdAt).thenComparing(Wish::id).reversed();

    private final Deque<StoredWish> wishes = new ArrayDeque<>();

    @Override
    public synchronized List<Wish> listFor(String author, Cursor before, int limit) {
        return wishes.stream()
                .filter(wish -> !wish.author().equals(author))
                .map(StoredWish::wish)
                .filter(wish -> before == null
                        || wish.createdAt().isBefore(before.createdAt())
                        || (wish.createdAt().equals(before.createdAt()) && wish.id().compareTo(before.id()) < 0))
                .sorted(FEED_ORDER)
                .limit(limit)
                .toList();
    }

    @Override
    public synchronized Wish create(String author, String message, Integer assignedRoom) {
        Wish wish = new Wish(UUID.randomUUID().toString(), message, Instant.now());
        wishes.addFirst(new StoredWish(author, wish));
        if (wishes.size() > MAX_WISHES) {
            wishes.removeLast();
        }
        return wish;
    }

    private record StoredWish(String author, Wish wish) {}
}
