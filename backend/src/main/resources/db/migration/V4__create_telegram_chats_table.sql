CREATE TABLE telegram_chats (
    chat_id    VARCHAR(50) PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
