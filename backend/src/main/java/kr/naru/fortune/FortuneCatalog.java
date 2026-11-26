package kr.naru.fortune;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.NavigableMap;
import java.util.TreeMap;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.groupingBy;

@Component
class FortuneCatalog {
    private final NavigableMap<LocalDate, Release> releases = new TreeMap<>();

    @Autowired
    FortuneCatalog(ObjectMapper mapper) throws IOException {
        try (var stream = new ClassPathResource("fortunes/releases.json").getInputStream()) {
            List<Definition> definitions = mapper.readValue(stream, new TypeReference<>() {});
            for (Definition definition : definitions) {
                byte[] document;
                try (var source = new ClassPathResource("fortunes/" + definition.file()).getInputStream()) {
                    document = source.readAllBytes();
                }
                if (!digest(document).equals(definition.sha256())) {
                    throw new IllegalStateException("Fortune catalog checksum mismatch: " + definition.version());
                }
                List<Message> messages = mapper.readValue(document, new TypeReference<>() {});
                Release release = new Release(definition, messages);
                register(release);
            }
        }
    }

    FortuneCatalog(List<Release> snapshots) {
        snapshots.forEach(this::register);
    }

    private void register(Release release) {
        if (releases.containsKey(release.effectiveFrom())
                || releases.values().stream().anyMatch(existing -> existing.version().equals(release.version()))) {
            throw new IllegalStateException("Fortune releases must have unique versions and start dates");
        }
        releases.put(release.effectiveFrom(), release);
    }

    Release forDate(LocalDate date) {
        var entry = releases.floorEntry(date);
        return entry == null ? null : entry.getValue();
    }

    List<Release> all() {
        return List.copyOf(releases.values());
    }

    static String digest(byte[] data) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 unavailable", exception);
        }
    }

    record Definition(String version, LocalDate effectiveFrom, String keyId,
                      Map<FortuneTone, Integer> weights, String file, String sha256) {}

    record Message(String id, FortuneCategory category, FortuneTone type, String content) {}

    static final class Release {
        private final Definition definition;
        private final List<Message> messages;
        private final Map<FortuneCategory, Map<FortuneTone, List<Message>>> groups;

        Release(Definition definition, List<Message> messages) {
            this.definition = definition;
            if (!definition.keyId().matches("[A-Z0-9_]{1,24}")
                    || definition.weights().size() != FortuneTone.values().length
                    || definition.weights().values().stream().anyMatch(value -> value < 0)
                    || definition.weights().values().stream().mapToInt(Integer::intValue).sum() != 100) {
                throw new IllegalStateException("Invalid fortune release settings");
            }
            this.messages = messages.stream().sorted(Comparator.comparing(Message::id)).toList();
            if (messages.stream().map(Message::id).distinct().count() != messages.size()
                    || messages.stream().map(Message::content).distinct().count() != messages.size()
                    || messages.stream().anyMatch(message -> !validContent(message.content()))) {
                throw new IllegalStateException("Invalid or duplicate fortune messages");
            }
            this.groups = this.messages.stream().collect(groupingBy(Message::category, groupingBy(Message::type)));
            for (FortuneCategory category : FortuneCategory.values()) {
                for (FortuneTone tone : FortuneTone.values()) {
                    if ((weight(tone) > 0 && pool(category, tone).isEmpty())
                            || (definition.version().equals("v2") && pool(category, tone).size() != weight(tone))) {
                        throw new IllegalStateException("Incomplete catalog: " + category + "/" + tone);
                    }
                }
            }
        }

        String version() { return definition.version(); }
        String keyId() { return definition.keyId(); }
        LocalDate effectiveFrom() { return definition.effectiveFrom(); }
        List<Message> messages() { return messages; }
        Map<FortuneTone, Integer> weights() { return Map.copyOf(definition.weights()); }
        int weight(FortuneTone tone) { return definition.weights().getOrDefault(tone, 0); }

        List<Message> pool(FortuneCategory category, FortuneTone tone) {
            return groups.getOrDefault(category, Map.of()).getOrDefault(tone, List.of());
        }

        String fingerprint() {
            String weights = Arrays.stream(FortuneTone.values()).map(tone -> tone + "=" + weight(tone))
                    .collect(Collectors.joining(","));
            return digest((version() + "|" + effectiveFrom() + "|" + keyId() + "|" + definition.sha256() + "|" + weights)
                    .getBytes(StandardCharsets.US_ASCII));
        }

        private static boolean validContent(String text) {
            String[] sentences = text.split("\n", -1);
            return sentences.length >= 2 && sentences.length <= 3 && text.codePointCount(0, text.length()) <= 160
                    && Arrays.stream(sentences).allMatch(line -> !line.isBlank() && line.matches("[^.!?]+[.!?]"));
        }
    }
}
