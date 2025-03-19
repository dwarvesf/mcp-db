CREATE TABLE observation_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY, -- Removed PRIMARY KEY
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL,
    operation TEXT NOT NULL DEFAULT 'insert' CHECK (operation = 'insert'),
    confidence REAL,
    processed_timestamp TIMESTAMPTZ,
    CHECK (jsonb_typeof(payload) = 'object')
);

-- Convert to hypertable
SELECT create_hypertable('observation_log', 'timestamp', chunk_time_interval => INTERVAL '1 month');

-- Create a GIN index on the payload for efficient JSONB queries
CREATE INDEX idx_observation_log_payload ON observation_log USING GIN (payload);

CREATE MATERIALIZED VIEW content_trends
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 week', timestamp) AS bucket,
    lower(regexp_replace(payload->>'content', '[^a-zA-Z0-9 ]', '', 'g')) AS content_text,
    COUNT(*) AS mention_count,
    MIN(timestamp) AS first_observed
FROM observation_log
WHERE payload->>'content' IS NOT NULL
GROUP BY time_bucket('1 week', timestamp), content_text
HAVING COUNT(*) > 1;

-- SELECT add_continuous_aggregate_policy('content_trends',
--     start_offset => INTERVAL '1 month',
--     end_offset => INTERVAL '1 minute',
--     schedule_interval => INTERVAL '1 hour');

CREATE MATERIALIZED VIEW entity_trends
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 week', timestamp) AS bucket,
    payload->'entities'->>'name' AS entity_name,
    COUNT(*) AS mention_count,
    MIN(timestamp) AS first_observed
FROM observation_log,
    jsonb_array_elements(payload->'entities') AS entities
GROUP BY time_bucket('1 week', timestamp), payload->'entities'->>'name';

-- SELECT add_continuous_aggregate_policy('entity_trends',
--     start_offset => INTERVAL '1 month',
--     end_offset => INTERVAL '1 minute',
--     schedule_interval => INTERVAL '1 hour');

CREATE MATERIALIZED VIEW relation_trends
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 week', timestamp) AS bucket,
    payload->'relations'->>'from' AS from_entity,
    payload->'relations'->>'to' AS to_entity,
    payload->'relations'->>'type' AS relation_type,
    COUNT(*) AS relation_count,
    MIN(timestamp) AS first_observed
FROM observation_log,
    jsonb_array_elements(payload->'relations') AS relations
GROUP BY time_bucket('1 week', timestamp), from_entity, to_entity, relation_type;

-- SELECT add_continuous_aggregate_policy('relation_trends',
--     start_offset => INTERVAL '1 month',
--     end_offset => INTERVAL '1 minute',
--     schedule_interval => INTERVAL '1 hour');

CREATE MATERIALIZED VIEW coined_term_trends
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 week', timestamp) AS bucket,
    payload->'coined_terms'->>'name' AS term_name,
    COUNT(*) AS mention_count,
    MIN(timestamp) AS first_observed
FROM observation_log,
    jsonb_array_elements(payload->'coined_terms') AS coined_terms
GROUP BY time_bucket('1 week', timestamp), payload->'coined_terms'->>'name';

-- SELECT add_continuous_aggregate_policy('coined_term_trends',
--     start_offset => INTERVAL '1 month',
--     end_offset => INTERVAL '1 minute',
--     schedule_interval => INTERVAL '1 hour');

CREATE MATERIALIZED VIEW tag_trends
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 week', timestamp) AS bucket,
    tag AS tag_name,
    COUNT(*) AS tag_count,
    MIN(timestamp) AS first_observed
FROM observation_log,
    jsonb_array_elements_text(payload->'tags') AS tag
GROUP BY time_bucket('1 week', timestamp), tag;

-- SELECT add_continuous_aggregate_policy('tag_trends',
--     start_offset => INTERVAL '1 month',
--     end_offset => INTERVAL '1 minute',
--     schedule_interval => INTERVAL '1 hour');

SELECT DISTINCT ON (entities->>'name')
    entities->>'name' AS name,
    entities->>'type' AS entity_type,
    MIN(timestamp) AS first_observed
FROM observation_log,
    jsonb_array_elements(payload->'entities') AS entities
GROUP BY entities->>'name', entities->>'type';

-- SELECT DISTINCT ON (coined_terms->>'name')
--     coined_terms->>'name' AS term_name,
--     coined_terms->>'type' AS term_type,
--     coined_terms->>'description' AS description,
--     MIN(timestamp) AS first_observed
-- FROM observation_log,
--     jsonb_array_elements(payload->'coined_terms') AS coined_terms
-- GROUP BY coined_terms->>'name', coined_terms->>'type', coined_terms->>'description';
