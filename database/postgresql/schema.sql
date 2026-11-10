
-- ============================================
-- PlaceSmart PostgreSQL Schema
-- Purpose: Semantic Resume-Job Matching
-- Database: placesmart_vector_db
-- Embedding Model: all-MiniLM-L6-v2
-- Vector Dimensions: 384
-- ============================================

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================
-- 1. Resume Embeddings
-- ============================================

CREATE TABLE IF NOT EXISTS resume_embeddings (
    embedding_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    student_id INT NOT NULL,
    resume_id INT NOT NULL,

    resume_text TEXT NOT NULL,

    embedding VECTOR(384) NOT NULL,

    model_name VARCHAR(100) NOT NULL
        DEFAULT 'all-MiniLM-L6-v2',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (resume_id)
);


-- ============================================
-- 2. Job Embeddings
-- ============================================

CREATE TABLE IF NOT EXISTS job_embeddings (
    embedding_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    drive_id INT NOT NULL UNIQUE,

    job_description TEXT NOT NULL,

    embedding VECTOR(384) NOT NULL,

    model_name VARCHAR(100) NOT NULL
        DEFAULT 'all-MiniLM-L6-v2',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- 3. Semantic Match Results
-- ============================================

CREATE TABLE IF NOT EXISTS match_results (
    match_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    student_id INTEGER NOT NULL,
    resume_id INTEGER NOT NULL,
    drive_id INTEGER NOT NULL,

    -- Semantic similarity between resume and job description
    semantic_score DOUBLE PRECISION NOT NULL
        CHECK (semantic_score >= -1 AND semantic_score <= 1),

    -- Required skill coverage
    skill_coverage DOUBLE PRECISION
        CHECK (skill_coverage IS NULL OR
               (skill_coverage >= 0 AND skill_coverage <= 100)),

    -- Individual scoring components (0–100)
    required_skills_score DOUBLE PRECISION
        CHECK (required_skills_score IS NULL OR
               (required_skills_score >= 0 AND required_skills_score <= 100)),

    project_relevance DOUBLE PRECISION
        CHECK (project_relevance IS NULL OR
               (project_relevance >= 0 AND project_relevance <= 100)),

    experience_relevance DOUBLE PRECISION
        CHECK (experience_relevance IS NULL OR
               (experience_relevance >= 0 AND experience_relevance <= 100)),

    additional_skills_score DOUBLE PRECISION
        CHECK (additional_skills_score IS NULL OR
               (additional_skills_score >= 0 AND additional_skills_score <= 100)),

    -- Overall suitability score
    final_score DOUBLE PRECISION
        CHECK (final_score IS NULL OR
               (final_score >= 0 AND final_score <= 100)),

    matched_skills TEXT[],
    missing_skills TEXT[],

    model_name VARCHAR(100) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_resume_drive UNIQUE (resume_id, drive_id)
);

CREATE INDEX IF NOT EXISTS idx_match_student
ON match_results(student_id);

CREATE INDEX IF NOT EXISTS idx_match_drive
ON match_results(drive_id);