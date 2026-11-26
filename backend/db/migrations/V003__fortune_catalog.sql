-- Review and apply once to an approved MySQL database. No visitor identifiers or draws are stored.
CREATE TABLE fortune_content_versions (
    version_id VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    effective_from DATE NOT NULL,
    key_id VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    fingerprint CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    weights JSON NOT NULL,
    registered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (version_id),
    UNIQUE KEY uq_fortune_effective_from (effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fortune_messages (
    version_id VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    id VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    category VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    message_type VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    content VARCHAR(160) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (version_id, id),
    KEY idx_fortune_messages_pool (version_id, category, message_type, id),
    CONSTRAINT fk_fortune_messages_version FOREIGN KEY (version_id) REFERENCES fortune_content_versions(version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
