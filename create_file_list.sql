CREATE TABLE IF NOT EXISTS file_list (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    district VARCHAR(50),
    note TEXT,
    content_format VARCHAR(20),
    doc1 TEXT,
    entry_date VARCHAR(50),
    entry_date_real DATE,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    semantic_vector VECTOR
);

CREATE INDEX IF NOT EXISTS idx_file_list_category ON file_list (category);
CREATE INDEX IF NOT EXISTS idx_file_list_entry_date ON file_list (entry_date_real);
CREATE INDEX IF NOT EXISTS idx_search_vector ON file_list USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_semantic_vector ON file_list USING ivfflat (semantic_vector vector_cosine_ops);
