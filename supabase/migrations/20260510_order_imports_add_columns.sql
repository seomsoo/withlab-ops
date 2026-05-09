-- Phase 3: order_imports 테이블에 파싱 결과 요약 컬럼 추가
alter table order_imports
  add column total_rows integer not null default 0,
  add column valid_count integer not null default 0,
  add column invalid_count integer not null default 0,
  add column duplicate_count integer not null default 0,
  add column invalid_rows jsonb not null default '[]',
  add column duplicate_rows jsonb not null default '[]';
