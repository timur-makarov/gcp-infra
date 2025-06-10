-- All tables are designed around 'player_id' for future sharding.
CREATE TABLE IF NOT EXISTS players (
    player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Player profiles store less-frequently updated information.
CREATE TABLE IF NOT EXISTS player_profiles (
    player_id UUID PRIMARY KEY,
    bio TEXT,
    country_code CHAR(2),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_player
        FOREIGN KEY(player_id) 
        REFERENCES players(player_id)
        ON DELETE CASCADE
);

-- This will be our highest-volume table for writes (INSERTs).
-- Every match a player completes creates a record here.
CREATE TABLE IF NOT EXISTS match_history (
    match_id BIGSERIAL,
    player_id UUID NOT NULL,
    game_id INT NOT NULL,
    score INT NOT NULL,
    is_win BOOLEAN NOT NULL,
    played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (player_id, match_id), 
    CONSTRAINT fk_player
        FOREIGN KEY(player_id)
        REFERENCES players(player_id)
        ON DELETE CASCADE
);

-- Create indexes on foreign keys for fast lookups.
CREATE INDEX IF NOT EXISTS idx_match_history_player_id ON match_history(player_id);
CREATE INDEX IF NOT EXISTS idx_match_history_game_id ON match_history(game_id);

-- This is a "duplicated" or "reference" table. In a sharded world, this small
-- table would be copied to all shards for fast joins.
CREATE TABLE IF NOT EXISTS games (
    game_id INT PRIMARY KEY,
    game_name VARCHAR(100) NOT NULL,
    genre VARCHAR(50)
);