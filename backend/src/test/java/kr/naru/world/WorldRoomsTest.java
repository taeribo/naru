package kr.naru.world;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class WorldRoomsTest {
    private final WorldRooms world = new WorldRooms(2);

    @Test
    void opensNextRoomAndCapsBothRoomsAndReleasesQueueInOrder() {
        IntStream.rangeClosed(1, 62).forEach(index -> world.join("c" + index, null));
        var initial = world.tick(System.currentTimeMillis());

        assertThat(joined(initial, "c26").room()).isEqualTo(1);
        assertThat(joined(initial, "c27").room()).isEqualTo(2);
        assertThat(initial.stream().map(WorldRooms.Delivery::event)
                .filter(WorldRooms.Snapshot.class::isInstance).map(WorldRooms.Snapshot.class::cast)
                .map(snapshot -> snapshot.players().size()).toList()).containsExactly(30, 30);
        assertThat(waiting(initial, "c61").position()).isEqualTo(1);
        assertThat(waiting(initial, "c62").position()).isEqualTo(2);

        world.leave("c1");
        var stillReserved = world.tick(System.currentTimeMillis());
        assertThat(stillReserved.stream().noneMatch(delivery -> delivery.connections().contains("c61"))).isTrue();

        var released = world.tick(System.currentTimeMillis() + 16_000);
        assertThat(joined(released, "c61").room()).isEqualTo(1);
        assertThat(waiting(released, "c62").position()).isEqualTo(1);
    }

    @Test
    void reconnectsToOriginalRoomAndKeepsMovementRoomScoped() {
        IntStream.rangeClosed(1, 27).forEach(index -> world.join("c" + index, null));
        var initial = world.tick(System.currentTimeMillis());
        var visitor = joined(initial, "c27");
        assertThat(visitor.room()).isEqualTo(2);
        var before = player(initial, "c27", visitor.id());

        world.move("c27", before.x() + 2, before.z());
        var moved = world.tick(System.currentTimeMillis());
        assertThat(player(moved, "c27", visitor.id()).x()).isGreaterThan(before.x());
        assertThat(moved.stream().noneMatch(delivery -> delivery.connections().contains("c1"))).isTrue();

        world.leave("c27");
        world.join("returning", visitor.token());
        var returned = world.tick(System.currentTimeMillis());
        assertThat(joined(returned, "returning")).isEqualTo(visitor);
        assertThat(world.roomFor(visitor.token())).isEqualTo(2);
    }

    @Test
    void freshPageStartsOutsideWhileNetworkReconnectKeepsPosition() {
        long now = System.currentTimeMillis();
        world.join("initial", null);
        var initial = world.tick(now);
        var visitor = joined(initial, "initial");
        var spawn = player(initial, "initial", visitor.id());
        assertThat(spawn.z()).isGreaterThan(33);
        assertThat(Math.abs(spawn.x())).isLessThan(3);

        world.move("initial", spawn.x(), 17);
        var moved = player(world.tick(now + 100), "initial", visitor.id());
        assertThat(moved.z()).isLessThan(spawn.z());

        world.leave("initial");
        world.join("retry", visitor.token(), false);
        var reconnected = world.tick(now + 200);
        assertThat(player(reconnected, "retry", visitor.id())).isEqualTo(moved);

        world.join("reload", visitor.token(), true);
        var refreshed = world.tick(now + 300);
        assertThat(joined(refreshed, "reload")).isEqualTo(visitor);
        assertThat(player(refreshed, "reload", visitor.id())).isEqualTo(spawn);
    }

    @Test
    void restoresQueuePositionAfterBriefDisconnect() {
        IntStream.rangeClosed(1, 62).forEach(index -> world.join("c" + index, null));
        var first = waiting(world.tick(System.currentTimeMillis()), "c61");

        world.leave("c61");
        assertThat(waiting(world.tick(System.currentTimeMillis()), "c62").position()).isEqualTo(1);

        world.join("returning", first.token());
        var returned = world.tick(System.currentTimeMillis());
        assertThat(waiting(returned, "returning")).isEqualTo(first);
        assertThat(waiting(returned, "c62").position()).isEqualTo(2);
    }

    @Test
    void expiresDisconnectedQueueMembersWhenOpeningASeat() {
        IntStream.rangeClosed(1, 62).forEach(index -> world.join("c" + index, null));
        world.tick(System.currentTimeMillis());

        world.leave("c1");
        world.leave("c61");
        var released = world.tick(System.currentTimeMillis() + 15_000);
        assertThat(joined(released, "c62").room()).isEqualTo(1);
    }

    @Test
    void acceptsMovementInTheExpandedCourtyardButRejectsTargetsOutsideIt() {
        world.join("visitor", null);
        long now = System.currentTimeMillis();
        var visitor = joined(world.tick(now), "visitor");

        world.move("visitor", 54, 72);
        List<WorldRooms.Delivery> movement = List.of();
        for (int tick = 1; tick <= 240; tick++) {
            var update = world.tick(now + tick * 100L);
            if (!update.isEmpty()) movement = update;
        }
        var atCorner = player(movement, "visitor", visitor.id());
        assertThat(atCorner.x()).isEqualTo(54);
        assertThat(atCorner.z()).isEqualTo(72);

        world.move("visitor", 54.1, 72);
        assertThat(world.tick(now + 24_100)).isEmpty();
        world.move("visitor", 54, 72.1);
        assertThat(world.tick(now + 24_200)).isEmpty();
    }

    private static WorldRooms.Joined joined(List<WorldRooms.Delivery> messages, String connection) {
        return (WorldRooms.Joined) messages.stream()
                .filter(message -> message.connections().contains(connection) && message.event() instanceof WorldRooms.Joined)
                .findFirst().orElseThrow().event();
    }

    private static WorldRooms.Waiting waiting(List<WorldRooms.Delivery> messages, String connection) {
        return (WorldRooms.Waiting) messages.stream()
                .filter(message -> message.connections().contains(connection) && message.event() instanceof WorldRooms.Waiting)
                .findFirst().orElseThrow().event();
    }

    private static WorldRooms.Player player(List<WorldRooms.Delivery> messages, String connection, String id) {
        return messages.stream()
                .filter(message -> message.connections().contains(connection) && message.event() instanceof WorldRooms.Snapshot)
                .map(message -> (WorldRooms.Snapshot) message.event()).flatMap(snapshot -> snapshot.players().stream())
                .filter(player -> player.id().equals(id)).findFirst().orElseThrow();
    }
}
