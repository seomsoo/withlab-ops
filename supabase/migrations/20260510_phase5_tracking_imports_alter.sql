-- Phase 5: tracking_imports 테이블에 파싱 메타 컬럼 추가
alter table tracking_imports
  add column total_rows integer not null default 0,
  add column valid_count integer not null default 0,
  add column invalid_count integer not null default 0,
  add column skipped_rows integer not null default 0,
  add column detected_courier text,
  add column invalid_rows jsonb not null default '[]'::jsonb;

-- 같은 작업건 + 같은 공급처에 중복 임포트 방지
create unique index uniq_ti_ws_supplier
  on tracking_imports(work_session_id, source_supplier_id);

-- matched 상태 tracking은 하나의 allocation에 1건만 허용
create unique index uniq_tracking_matched_alloc
  on trackings(allocation_id) where status = 'matched';
