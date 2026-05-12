-- Phase 8: allocation_reason 컬럼 추가
alter table allocations
  add column if not exists allocation_reason text;
