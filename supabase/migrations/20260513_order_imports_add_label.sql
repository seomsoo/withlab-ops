-- Phase 10: order_imports에 label 컬럼 추가 + unique 제약 변경
-- 쿠팡 계정 2개 사용 시 같은 플랫폼의 별도 파일을 구분하기 위한 라벨

-- 1. label 컬럼 추가 (nullable로 시작)
alter table order_imports add column label text;

-- 2. 기존 데이터 backfill
update order_imports
set label = case
  when platform = 'coupang' then '쿠팡1'
  when platform = 'toss' then '토스1'
  else platform || '1'
end
where label is null;

-- 3. NOT NULL 제약 추가
alter table order_imports alter column label set not null;

-- 4. 기존 unique 제약 삭제 후 label 포함하여 재생성
alter table order_imports
  drop constraint if exists order_imports_work_session_id_platform_key;

alter table order_imports
  add constraint uq_order_import_ws_platform_label
  unique (work_session_id, platform, label);

-- 5. orders 테이블 order_import_id 인덱스 (라벨 join 성능)
create index if not exists idx_orders_order_import_id on orders(order_import_id);
