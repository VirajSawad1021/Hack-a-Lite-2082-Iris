-- ============================================================
-- NexOS — Migration 004 (Part A): Extend agent_type enum
-- ✅ ALREADY RUN — do not run again
-- ============================================================
-- PostgreSQL requires ALTER TYPE ADD VALUE to be committed alone
-- before the new value can be used in any DML/DDL.
-- Part B (004b_deep_research_data.sql) contains the INSERT + functions.
-- ============================================================

ALTER TYPE agent_type ADD VALUE IF NOT EXISTS 'deep_research';
