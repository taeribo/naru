package kr.naru.fortune;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;

@Component
@Profile("mysql & fortune-catalog")
class FortuneCatalogRegistration implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final FortuneCatalog catalog;
    private final ObjectMapper mapper;

    FortuneCatalogRegistration(JdbcTemplate jdbc, FortuneCatalog catalog, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.catalog = catalog;
        this.mapper = mapper;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void run(ApplicationArguments args) throws Exception {
        var registered = new HashSet<>(jdbc.queryForList("""
                SELECT version_id FROM fortune_content_versions ORDER BY effective_from FOR UPDATE
                """, String.class));
        var packaged = catalog.all().stream().map(FortuneCatalog.Release::version).toList();
        if (!packaged.containsAll(registered)) {
            throw new IllegalStateException("Published fortune releases cannot be removed");
        }
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        for (var release : catalog.all()) {
            if (!registered.isEmpty() && !registered.contains(release.version()) && !release.effectiveFrom().isAfter(today)) {
                throw new IllegalStateException("New fortune releases must be scheduled for a future Seoul date");
            }
            String version = release.version();
            jdbc.update("""
                    INSERT INTO fortune_content_versions (version_id, effective_from, key_id, fingerprint, weights)
                    VALUES (?, ?, ?, ?, CAST(? AS JSON))
                    ON DUPLICATE KEY UPDATE version_id = fortune_content_versions.version_id
                    """, version, Date.valueOf(release.effectiveFrom()), release.keyId(),
                    release.fingerprint(), mapper.writeValueAsString(release.weights()));
            var fingerprints = jdbc.queryForList("""
                    SELECT fingerprint FROM fortune_content_versions WHERE version_id = ? FOR UPDATE
                    """, String.class, version);
            if (fingerprints.size() != 1 || !release.fingerprint().equals(fingerprints.get(0))) {
                throw new IllegalStateException("Fortune release already registered with different data: " + version);
            }
            var existing = jdbc.query("""
                    SELECT id, category, message_type, content FROM fortune_messages
                    WHERE version_id = ? ORDER BY id
                    """, (row, ignored) -> new FortuneCatalog.Message(row.getString("id"),
                    FortuneCategory.valueOf(row.getString("category")), FortuneTone.valueOf(row.getString("message_type")),
                    row.getString("content")), version);
            if (existing.isEmpty()) {
                jdbc.batchUpdate("""
                        INSERT INTO fortune_messages (version_id, id, category, message_type, content)
                        VALUES (?, ?, ?, ?, ?)
                        """, release.messages(), 200, (statement, message) -> {
                    statement.setString(1, version);
                    statement.setString(2, message.id());
                    statement.setString(3, message.category().name());
                    statement.setString(4, message.type().name());
                    statement.setString(5, message.content());
                });
            } else if (!existing.equals(release.messages())) {
                throw new IllegalStateException("Registered fortune content differs from its published version: " + version);
            }
        }
    }
}
