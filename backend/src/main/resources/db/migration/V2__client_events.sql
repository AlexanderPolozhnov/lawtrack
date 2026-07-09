CREATE TABLE client_events (
    id          BIGSERIAL PRIMARY KEY,
    client_id   BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    event_type  VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_events_client_id ON client_events(client_id);
