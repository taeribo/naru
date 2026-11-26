package kr.naru.fortune;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DailyFortuneTest {
    private static final String TEST_KEY = "0123456789abcdef".repeat(4);
    private static final UUID VISITOR = UUID.fromString("a7b7af5d-4bd9-437a-a744-baa9a929e182");
    private static final LocalDate FIRST_DAY = LocalDate.parse("2026-11-25");

    private final FortuneCatalog catalog;

    DailyFortuneTest() throws Exception {
        catalog = new FortuneCatalog(new ObjectMapper().findAndRegisterModules());
    }

    @Test
    void keepsTheSameReadingAcrossProcessesAndUsesTheSeoulDate() {
        var before = Instant.parse("2026-11-25T14:59:59Z");
        var after = before.plusSeconds(1);
        var result = service(catalog).draw(VISITOR, FortuneCategory.LOVE, before);
        assertThat(result.date()).isEqualTo(FIRST_DAY);
        assertThat(service(catalog).draw(VISITOR, FortuneCategory.LOVE, before.minusSeconds(600))).isEqualTo(result);
        assertThat(service(catalog).draw(VISITOR, FortuneCategory.LOVE, after).date()).isEqualTo(FIRST_DAY.plusDays(1));
        assertThat(service(catalog).draw(VISITOR, FortuneCategory.WEALTH, before).category()).isEqualTo(FortuneCategory.WEALTH);
    }

    @Test
    void sortingAndFutureReleasesDoNotChangeTodaysResult() {
        var first = catalog.forDate(FIRST_DAY);
        var reordered = new ArrayList<>(first.messages());
        Collections.reverse(reordered);
        var same = new FortuneCatalog.Release(definition("v2", FIRST_DAY, first), reordered);
        var future = new FortuneCatalog.Release(definition("v3", FIRST_DAY.plusDays(1), first), first.messages());
        var extended = new FortuneCatalog(List.of(future, same));
        var instant = Instant.parse("2026-11-25T14:59:59Z");
        assertThat(service(extended).draw(VISITOR, FortuneCategory.LOVE, instant))
                .isEqualTo(service(catalog).draw(VISITOR, FortuneCategory.LOVE, instant));
        assertThat(extended.forDate(FIRST_DAY.plusDays(1)).version()).isEqualTo("v3");
        assertThatThrownBy(() -> new FortuneCatalog.Release(definition("v3", FIRST_DAY, first), List.of()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void bundlesOnlyTheRevisedCatalogForPreview() {
        assertThat(catalog.all()).extracting(FortuneCatalog.Release::version).containsExactly("v2");
        assertThat(catalog.forDate(FIRST_DAY).messages()).hasSize(800);
    }

    @Test
    void verifiesInitialCountsAndApproximateWeightedFrequency() {
        var release = catalog.forDate(FIRST_DAY);
        assertThat(release.messages()).hasSize(800);
        for (var category : FortuneCategory.values()) {
            int total = 0;
            for (var tone : FortuneTone.values()) {
                assertThat(release.pool(category, tone)).hasSize(release.weight(tone));
                total += release.pool(category, tone).size();
            }
            assertThat(total).isEqualTo(100);
        }
        var counts = new EnumMap<FortuneTone, Integer>(FortuneTone.class);
        var ranks = new EnumMap<FortuneRank, Integer>(FortuneRank.class);
        byte[] key = java.util.HexFormat.of().parseHex(TEST_KEY);
        for (int index = 1; index <= 20_000; index++) {
            var choice = DailyFortune.pick(release, key, new UUID(17, index), FIRST_DAY, FortuneCategory.GROWTH);
            counts.merge(choice.message().type(), 1, Integer::sum);
            ranks.merge(choice.rank(), 1, Integer::sum);
            assertThat(choice.rank() == FortuneRank.CAUTION).isEqualTo(choice.message().type() == FortuneTone.CAUTION);
        }
        for (var tone : FortuneTone.values()) {
            assertThat(counts.get(tone) / 200.0).isCloseTo((double) release.weight(tone), org.assertj.core.data.Offset.offset(1.2));
        }
        var expectedRanks = Map.of(
                FortuneRank.GREAT_LUCK, 10.0, FortuneRank.LUCK, 20.0, FortuneRank.MEDIUM_LUCK, 30.0,
                FortuneRank.SMALL_LUCK, 20.0, FortuneRank.LATER_LUCK, 15.0, FortuneRank.CAUTION, 5.0);
        assertThat(ranks.keySet()).containsExactlyInAnyOrder(FortuneRank.values());
        expectedRanks.forEach((rank, expected) ->
                assertThat(ranks.get(rank) / 200.0).isCloseTo(expected, org.assertj.core.data.Offset.offset(1.2)));
    }

    @Test
    void handlesUnavailableReleaseAndKeyWithoutBreakingOtherFeatures() {
        var day = Instant.parse("2026-11-25T03:00:00Z");
        assertThatThrownBy(() -> new DailyFortune(catalog, new MockEnvironment()).draw(VISITOR, FortuneCategory.LOVE, day))
                .isInstanceOfSatisfying(ResponseStatusException.class, error -> assertThat(error.getStatusCode().value()).isEqualTo(503));
        assertThatThrownBy(() -> service(new FortuneCatalog(List.of())).draw(VISITOR, FortuneCategory.LOVE, day))
                .isInstanceOfSatisfying(ResponseStatusException.class, error -> assertThat(error.getStatusCode().value()).isEqualTo(503));
    }

    private static DailyFortune service(FortuneCatalog catalog) {
        return new DailyFortune(catalog, new MockEnvironment().withProperty("NARU_FORTUNE_KEY_V1", TEST_KEY));
    }

    private static FortuneCatalog.Definition definition(String version, LocalDate date, FortuneCatalog.Release reference) {
        return new FortuneCatalog.Definition(version, date, "V1", reference.weights(), "unused", "unused");
    }
}
