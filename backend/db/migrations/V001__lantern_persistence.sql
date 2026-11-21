-- Development baseline for the rooms, visitor sessions and wishes in initial ERD v1.0.
-- Apply once to an approved, empty target database. The application does not run this file.
CREATE TABLE rooms (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    room_number TINYINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_rooms_number (room_number),
    CONSTRAINT chk_rooms_number CHECK (room_number BETWEEN 1 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE visitor_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    last_room_id BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_visitor_sessions_token_hash (token_hash),
    KEY idx_visitor_sessions_expires (expires_at),
    KEY idx_visitor_sessions_room (last_room_id),
    CONSTRAINT fk_visitor_sessions_room FOREIGN KEY (last_room_id) REFERENCES rooms(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lantern_messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    room_id BIGINT UNSIGNED NOT NULL,
    session_id BIGINT UNSIGNED NULL,
    display_name VARCHAR(40) NOT NULL DEFAULT '익명의 나그네',
    content VARCHAR(200) NOT NULL,
    status ENUM('VISIBLE','HIDDEN') NOT NULL DEFAULT 'VISIBLE',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    KEY idx_lantern_messages_feed (status, created_at DESC, id DESC),
    KEY idx_lantern_messages_room_feed (room_id, status, created_at DESC, id DESC),
    KEY idx_lantern_messages_expiry (expires_at),
    CONSTRAINT fk_lantern_messages_room FOREIGN KEY (room_id) REFERENCES rooms(id),
    CONSTRAINT fk_lantern_messages_session FOREIGN KEY (session_id) REFERENCES visitor_sessions(id) ON DELETE SET NULL,
    CONSTRAINT chk_lantern_messages_content CHECK (CHAR_LENGTH(TRIM(content)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO rooms (room_number) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10);
