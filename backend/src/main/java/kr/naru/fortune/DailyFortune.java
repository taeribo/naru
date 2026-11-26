package kr.naru.fortune;

import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HexFormat;
import java.util.UUID;

@Service
class DailyFortune {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final String HMAC = "HmacSHA256";
    private static final int GREAT_LUCK_PARTS = 3;

    private final FortuneCatalog catalog;
    private final Environment environment;

    DailyFortune(FortuneCatalog catalog, Environment environment) {
        this.catalog = catalog;
        this.environment = environment;
    }

    Result draw(UUID visitor, FortuneCategory category, Instant instant) {
        LocalDate date = instant.atZone(SEOUL).toLocalDate();
        var release = catalog.forDate(date);
        if (release == null) throw unavailable();

        String key = environment.getProperty("NARU_FORTUNE_KEY_" + release.keyId(), "");
        if (!key.matches("[0-9a-fA-F]{64}")) throw unavailable();
        var draw = pick(release, HexFormat.of().parseHex(key), visitor, date, category);
        return new Result(category, date, draw.rank().label(), draw.message().content());
    }

    static Draw pick(FortuneCatalog.Release release, byte[] key, UUID visitor,
                                       LocalDate date, FortuneCategory category) {
        String seed = "naru-fortune|" + release.version() + "|" + visitor + "|" + date + "|" + category;
        try {
            Mac mac = Mac.getInstance(HMAC);
            mac.init(new SecretKeySpec(key, HMAC));
            int ticket = index(mac, seed + "|tone", 100);
            for (FortuneTone tone : FortuneTone.values()) {
                ticket -= release.weight(tone);
                if (ticket < 0) {
                    var pool = release.pool(category, tone);
                    if (pool.isEmpty()) throw unavailable();
                    var message = pool.get(index(mac, seed + "|message|" + tone, pool.size()));
                    boolean greatLuck = tone == FortuneTone.HOPE
                            && index(mac, seed + "|rank", GREAT_LUCK_PARTS) == 0;
                    return new Draw(message, FortuneRank.forTone(tone, greatLuck));
                }
            }
            throw unavailable();
        } catch (GeneralSecurityException exception) {
            throw unavailable();
        }
    }

    private static int index(Mac mac, String input, int bound) {
        long sample = ByteBuffer.wrap(mac.doFinal(input.getBytes(StandardCharsets.US_ASCII))).getLong();
        return (int) Long.remainderUnsigned(sample, bound);
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Fortune temporarily unavailable");
    }

    record Draw(FortuneCatalog.Message message, FortuneRank rank) {}

    record Result(FortuneCategory category, LocalDate date, FortuneRank.Label grade, String content) {}
}
