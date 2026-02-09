-- Create Tables
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'Gold Coins', 'Reward Points'
  description TEXT
);

CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  asset_type_id INTEGER REFERENCES asset_types(id),
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, asset_type_id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id INTEGER REFERENCES wallets(id),
  amount DECIMAL(15, 2) NOT NULL, -- Positive for credit, Negative for debit
  type VARCHAR(20) NOT NULL, -- 'TOPUP', 'BONUS', 'SPEND'
  description VARCHAR(255),
  idempotency_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Data
INSERT INTO asset_types (name, description) VALUES 
('Gold Coins', 'Main in-game currency'),
('Reward Points', 'Loyalty points')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (username) VALUES 
('system_treasury'),
('alice'),
('bob')
ON CONFLICT (username) DO NOTHING;

-- Create Wallets for Users
INSERT INTO wallets (user_id, asset_type_id, balance) 
SELECT u.id, a.id, 
  CASE 
    WHEN u.username = 'system_treasury' THEN 1000000.00 
    WHEN u.username = 'alice' THEN 100.00
    WHEN u.username = 'bob' THEN 50.00
  END
FROM users u, asset_types a
ON CONFLICT (user_id, asset_type_id) DO NOTHING;
