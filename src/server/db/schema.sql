-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  gravatar VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 4,
  min_players INTEGER NOT NULL DEFAULT 2,
  created_by INTEGER REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game users (players in a game)
CREATE TABLE IF NOT EXISTS game_users (
  game_id INTEGER REFERENCES games(id),
  user_id INTEGER REFERENCES users(id),
  seat INTEGER NOT NULL,
  is_current BOOLEAN DEFAULT false,
  PRIMARY KEY (game_id, user_id)
);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  color VARCHAR(10) NOT NULL,
  value VARCHAR(20) NOT NULL,
  game_id INTEGER REFERENCES games(id),
  user_id INTEGER REFERENCES users(id),
  location VARCHAR(20) NOT NULL DEFAULT 'deck', -- deck, hand, discard
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
