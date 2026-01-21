# Specification: Switch DB to Postgres

## Overview
Migrate the application's backend from SQLite to PostgreSQL. This change is driven by the need for better concurrency, scalability, and robust features like advanced full-text search and JSONB support, which will benefit AI-heavy features.

## Functional Requirements
- **Database Backend:** Replace `rusqlite` with a PostgreSQL client (e.g., `sqlx` or `diesel`).
- **Schema Migration:** Port the existing SQLite schema to PostgreSQL, ensuring all tables, indices, and foreign key relationships are preserved.
- **Connection Management:** Implement a connection pool for efficient database access in the Tauri/Rust backend.
- **Environment Configuration:** Support connection strings via environment variables or a configuration file.
- **Data Parity:** Ensure all existing application features (Library, Highlights, Chat, Settings) function identically with the new backend.

## Non-Functional Requirements
- **Performance:** Maintain or improve query performance compared to SQLite.
- **Reliability:** Ensure transaction integrity and handle connection failures gracefully.

## Acceptance Criteria
- [ ] Application successfully initializes and connects to a PostgreSQL instance.
- [ ] All existing database operations (CRUD for books, highlights, chat, settings) are fully functional.
- [ ] The schema is correctly initialized in Postgres on first run.
- [ ] Automated tests pass against a test Postgres instance.

## Out of Scope
- Migrating existing local SQLite data to the new Postgres instance (a fresh start is acceptable for this phase).
- Implementing new Postgres-specific features (e.g., pgvector) during this initial migration.
