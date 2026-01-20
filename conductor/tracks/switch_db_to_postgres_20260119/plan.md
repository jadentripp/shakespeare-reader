# Plan: Switch DB to Postgres

## Phase 1: Infrastructure and Schema [checkpoint: ]
- [x] Task: Add `sqlx` and `tokio` (with full features) to `src-tauri/Cargo.toml` and remove `rusqlite`. (6904cb2)
- [x] Task: Create `src-tauri/src/db/postgres.rs` for Postgres connection pooling and management. (7d86411)
- [x] Task: Port the SQLite schema to a Postgres migration file or initialization script. (7d86411)
- [x] Task: Implement `init` function to establish connection and run initial schema setup. (7d86411)

## Phase 2: Core Domain Implementation [checkpoint: ]
- [x] Task: Update `Book` domain logic to use `sqlx` and Postgres. (7d86411)
- [x] Task: Update `Settings` domain logic to use `sqlx` and Postgres. (7d86411)
- [x] Task: Update `Highlights` and `Annotations` domain logic. (7d86411)
- [x] Task: Update `Chat` (Threads and Messages) domain logic. (7d86411)

## Phase 3: Integration and Verification [checkpoint: ]
- [~] Task: Update Tauri command handlers in `lib.rs` to work with the new async database logic.
- [ ] Task: Refactor existing Rust unit tests to run against a test Postgres instance.
- [ ] Task: Perform manual verification of all library, reading, and chat features.
