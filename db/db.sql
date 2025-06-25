CREATE TABLE IF NOT EXISTS arc_graphs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    timestamp INT NOT NULL
);

CREATE TABLE IF NOT EXISTS arc_staff (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    permissions JSON NOT NULL
);

INSERT INTO arc_staff (id, type, permissions)
SELECT '1', 'CEO', '["super_admin"]'
WHERE NOT EXISTS (
    SELECT 1 FROM arc_staff WHERE id = 1
);

CREATE TABLE IF NOT EXISTS arc_players (
    player_id VARCHAR(50) PRIMARY KEY,
    data JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS arc_bans (
    ban_id INT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL,
    identifiers JSON NOT NULL, -- Adiciona o campo de identificadores
    reason TEXT NOT NULL,
    cooldown INT NOT NULL,
    author VARCHAR(100) NOT NULL,
    date DATETIME NOT NULL,
    expiration DATETIME
);

CREATE TABLE IF NOT EXISTS arc_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    description TEXT NOT NULL,
    images JSON NOT NULL,
    author VARCHAR(50) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    date VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    concluded TINYINT(1) NOT NULL DEFAULT 0,
    timestamp BIGINT NOT NULL,
    messages JSON NOT NULL,
    concluded_by VARCHAR(100),
    concluded_date VARCHAR(50)
);