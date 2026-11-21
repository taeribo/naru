package kr.naru.wish;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;

@Repository
@Profile("mysql & wish-persistence")
class MysqlWishStore implements WishStore {
    private static final int LIST_SIZE = 30;
    private static final RowMapper<Wish> WISH_ROW = (row, index) -> new Wish(
            row.getString("id"),
            row.getString("content"),
            row.getObject("created_at", LocalDateTime.class).toInstant(ZoneOffset.UTC));

    private final JdbcTemplate jdbc;
    private final int roomNumber;
    private final int sessionTtlHours;

    MysqlWishStore(JdbcTemplate jdbc,
                   @Value("${naru.wishes.bootstrap-room:1}") int roomNumber,
                   @Value("${naru.wishes.session-ttl-hours:24}") int sessionTtlHours) {
        this.jdbc = jdbc;
        this.roomNumber = roomNumber;
        this.sessionTtlHours = sessionTtlHours;
    }

    @Override
    public List<Wish> listFor(String author) {
        return jdbc.query("""
                SELECT message.id, message.content, message.created_at
                FROM lantern_messages message
                LEFT JOIN visitor_sessions viewer
                  ON viewer.token_hash = ? AND viewer.id = message.session_id
                WHERE message.status = 'VISIBLE'
                  AND (message.expires_at IS NULL OR message.expires_at > UTC_TIMESTAMP(3))
                  AND viewer.id IS NULL
                ORDER BY message.created_at DESC, message.id DESC
                LIMIT ?
                """, WISH_ROW, hash(author), LIST_SIZE);
    }

    @Override
    @Transactional
    public Wish create(String author, String message) {
        String authorHash = hash(author);
        jdbc.update("""
                INSERT INTO visitor_sessions (token_hash, created_at, last_seen_at, expires_at)
                VALUES (?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), TIMESTAMPADD(HOUR, ?, UTC_TIMESTAMP(3)))
                ON DUPLICATE KEY UPDATE
                    last_seen_at = UTC_TIMESTAMP(3),
                    expires_at = TIMESTAMPADD(HOUR, ?, UTC_TIMESTAMP(3))
                """, authorHash, sessionTtlHours, sessionTtlHours);

        int inserted = jdbc.update("""
                INSERT INTO lantern_messages (room_id, session_id, content, created_at)
                SELECT room.id, visitor.id, ?, UTC_TIMESTAMP(3)
                FROM rooms room
                CROSS JOIN visitor_sessions visitor
                WHERE room.room_number = ? AND visitor.token_hash = ?
                """, message, roomNumber, authorHash);
        if (inserted != 1) {
            throw new IllegalStateException("The configured wish room is missing");
        }

        return jdbc.queryForObject("""
                SELECT id, content, created_at
                FROM lantern_messages
                WHERE id = LAST_INSERT_ID()
                """, WISH_ROW);
    }

    private static String hash(String author) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(author.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
