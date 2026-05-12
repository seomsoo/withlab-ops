-- Phase 8: trackings 테이블 ignored 필드 추가
alter table trackings
  add column if not exists ignored boolean not null default false;

alter table trackings
  add column if not exists ignored_reason text;
