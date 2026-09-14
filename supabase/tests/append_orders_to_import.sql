-- fixtures/order_append_schema.sql과 마이그레이션을 적용한 임시 DB에서 실행한다.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', message; end if;
end;
$$;

create function pg_temp.test_order(option_id text, qty integer default 1, legacy boolean default false)
returns jsonb language sql as $$
  select jsonb_build_object(
    'id', gen_random_uuid(), 'work_session_id', '00000000-0000-4000-8000-000000000001',
    'order_import_id', '00000000-0000-4000-8000-000000000010',
    'platform', 'coupang', 'order_no', 'ORDER-1',
    'order_item_no', case when legacy then 'BOX-1' else 'BOX-1:' || option_id end,
    'matching_key', case when legacy then 'BOX-1' else 'BOX-1:' || option_id end,
    'product_name', option_id, 'option_name', '', 'quantity', qty,
    'recipient_name', '테스트', 'recipient_phone', '01012345678', 'address', '테스트 주소',
    'raw', jsonb_build_object('묶음배송번호', 'BOX-1', '옵션ID', option_id),
    'raw_values', jsonb_build_array(option_id, qty), 'raw_row_number', 3
  );
$$;

create function pg_temp.append_test(payload jsonb, bad_rows jsonb default '[]', duplicates jsonb default '[]')
returns jsonb language sql as $$
  select public.append_orders_to_import(
    '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010',
    'coupang', '추가.xlsx', payload, bad_rows, duplicates
  );
$$;

set local role authenticated;
insert into work_sessions(id, name) values ('00000000-0000-4000-8000-000000000001', '추가 검증');
insert into order_imports(id, work_session_id, platform, file_name, label, total_rows, valid_count, invalid_count, invalid_rows)
values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'coupang', '기존.xlsx', '쿠팡1', 2, 1, 1, '[{"rowNumber":9,"reason":"기존 오류","rawData":[]}]'),
  ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000001', 'coupang', '다른계정.xlsx', '쿠팡2', 0, 0, 0, '[]');

insert into orders select * from jsonb_populate_record(null::orders, pg_temp.test_order('APPLE', 1, true));
insert into allocations (id, work_session_id, order_id, supplier_id, supplier_product_name, allocated_quantity, status)
select '00000000-0000-4000-8000-000000000100', work_session_id, id,
  '00000000-0000-4000-8000-000000000200', '사과', 1, 'ordered' from orders;
insert into trackings (work_session_id, tracking_import_id, allocation_id, status, source_supplier_id, tracking_number, raw, raw_row_number)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000300',
  '00000000-0000-4000-8000-000000000100', 'matched', '00000000-0000-4000-8000-000000000200', 'TRACK-1', '{}', 2);
create temp table original_order as select to_jsonb(o) data from orders o;
create temp table original_allocation as select to_jsonb(a) data from allocations a;
create temp table original_tracking as select to_jsonb(t) data from trackings t;
create temp table other_import as select to_jsonb(i) data from order_imports i where label = '쿠팡2';

do $$
declare result jsonb;
begin
  result := pg_temp.append_test(jsonb_build_array(pg_temp.test_order('APPLE'), pg_temp.test_order('PEACH', 2)),
    '[{"rowNumber":8,"reason":"추가 오류","rawData":[]}]',
    '[{"rowNumber":7,"reason":"파일 내 중복","matchingKey":"BOX-1:PEACH","firstRowNumber":3,"rawData":[]}]');
  perform pg_temp.assert_true(result = '{"inserted_count":1,"duplicate_count":2,"total_count":2}', '기존 키 중복 제외, 새 상품 수량 보존');
  perform pg_temp.assert_true((select quantity = 2 from orders where product_name = 'PEACH'), '새 상품 수량');
  perform pg_temp.assert_true((select to_jsonb(o) = (select data from original_order) from orders o where product_name = 'APPLE'), '기존 주문 전체 필드 보존');
  perform pg_temp.assert_true((select to_jsonb(a) = (select data from original_allocation) from allocations a), '공급처 배정 보존');
  perform pg_temp.assert_true((select to_jsonb(t) = (select data from original_tracking) from trackings t), '운송장 연결 보존');
  perform pg_temp.assert_true((select to_jsonb(i) = (select data from other_import) from order_imports i where label = '쿠팡2'), '다른 계정 파일 보존');
  perform pg_temp.assert_true((select valid_count = 2 and invalid_count = 2 and duplicate_count = 2 and total_rows = 6
    and jsonb_array_length(invalid_rows) = 2 and jsonb_array_length(duplicate_rows) = 2 from order_imports where label = '쿠팡1'), '집계와 기존 오류 상세 보존');

  result := pg_temp.append_test(jsonb_build_array(pg_temp.test_order('PEACH', 9)));
  perform pg_temp.assert_true(result->>'inserted_count' = '0', '재업로드 중복 주문 없음');
  perform pg_temp.assert_true((select quantity = 2 from orders where product_name = 'PEACH'), '기존 주문 수량을 재업로드로 덮어쓰지 않음');

  result := pg_temp.append_test(jsonb_build_array(pg_temp.test_order('PEAR'), pg_temp.test_order('PEAR')));
  perform pg_temp.assert_true(result->>'inserted_count' = '1' and result->>'duplicate_count' = '1', '요청 안의 중복 방어');
end;
$$;

create temp table before_failure as select to_jsonb(i) data from order_imports i where label = '쿠팡1';
do $$
begin
  begin
    perform pg_temp.append_test(jsonb_build_array(pg_temp.test_order('GOOD'), pg_temp.test_order('BAD', 0)));
    raise exception 'FAIL: 수량 오류가 거절되지 않음';
  exception when check_violation then null;
  end;
  perform pg_temp.assert_true(not exists(select 1 from orders where product_name in ('GOOD', 'BAD')), '한 행 실패 시 전체 추가 취소');
  perform pg_temp.assert_true((select to_jsonb(i) = (select data from before_failure) from order_imports i where label = '쿠팡1'), '실패 시 집계 변경 없음');
end;
$$;

-- 주문 INSERT가 성공한 뒤 집계 UPDATE가 실패해도 주문 INSERT까지 롤백되어야 한다.
reset role;
create function pg_temp.reject_update() returns trigger language plpgsql as $$
begin raise exception 'injected metadata failure'; end;
$$;
create trigger reject_append_metadata before update on order_imports for each row execute function pg_temp.reject_update();
set local role authenticated;
do $$
begin
  begin
    perform pg_temp.append_test(jsonb_build_array(pg_temp.test_order('ROLLBACK')));
    raise exception 'FAIL: 집계 저장 오류가 거절되지 않음';
  exception when raise_exception then
    if sqlerrm <> 'injected metadata failure' then raise; end if;
  end;
  perform pg_temp.assert_true(not exists(select 1 from orders where product_name = 'ROLLBACK'), '집계 실패 시 새 주문 롤백');
  perform pg_temp.assert_true((select to_jsonb(i) = (select data from before_failure) from order_imports i where label = '쿠팡1'), '집계 실패 시 기존 집계 보존');
end;
$$;
reset role;
drop trigger reject_append_metadata on order_imports;
set local role authenticated;

do $$
begin
  begin
    perform public.append_orders_to_import('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'toss', '잘못된 플랫폼.xlsx', '[]');
    raise exception 'FAIL: 다른 플랫폼 파일을 허용함';
  exception when raise_exception then
    if sqlerrm not like '추가할 기존 주문 파일%' then raise; end if;
  end;
  begin
    perform pg_temp.append_test(jsonb_build_array(pg_temp.test_order('MISSING') #- '{raw,옵션ID}'));
    raise exception 'FAIL: 옵션ID 누락을 허용함';
  exception when raise_exception then
    if sqlerrm not like '주문 플랫폼 또는%' then raise; end if;
  end;
  update work_sessions set status = 'ordered';
  begin
    perform pg_temp.append_test(jsonb_build_array(pg_temp.test_order('CLOSED')));
    raise exception 'FAIL: 종료된 작업에 추가됨';
  exception when raise_exception then
    if sqlerrm not like '진행 중인 작업%' then raise; end if;
  end;
  perform pg_temp.assert_true((select count(*) = 3 from orders), '거절된 요청의 주문 미저장');
  perform pg_temp.assert_true((select to_jsonb(a) = (select data from original_allocation) from allocations a), '실패 후 배정 보존');
  perform pg_temp.assert_true((select to_jsonb(t) = (select data from original_tracking) from trackings t), '실패 후 운송장 보존');
end;
$$;
reset role;
select pg_temp.assert_true(not has_function_privilege('anon', 'public.append_orders_to_import(uuid,uuid,text,text,jsonb,jsonb,jsonb)', 'EXECUTE'), '익명 RPC 실행 차단');
select pg_temp.assert_true(has_function_privilege('authenticated', 'public.append_orders_to_import(uuid,uuid,text,text,jsonb,jsonb,jsonb)', 'EXECUTE'), '로그인 사용자 RPC 허용');

set local role authenticated;
update work_sessions set status = 'active';
insert into order_imports(id, work_session_id, platform, file_name, label)
values ('00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000001', 'toss', '토스.xlsx', '토스1');
do $$
declare result jsonb; payload jsonb;
begin
  -- 상품 번호가 쿠팡 키와 같아도 플랫폼이 다르면 별개 주문이다.
  payload := jsonb_build_array(pg_temp.test_order('APPLE') || '{"platform":"toss"}'::jsonb);
  result := public.append_orders_to_import('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 'toss', '토스추가.xlsx', payload);
  perform pg_temp.assert_true(result->>'inserted_count' = '1' and result->>'total_count' = '1', '토스 주문상품번호/플랫폼 구분');

  select jsonb_agg(pg_temp.test_order('BULK-' || n)) into payload from generate_series(1, 1001) n;
  result := pg_temp.append_test(payload);
  perform pg_temp.assert_true(result->>'inserted_count' = '1001', '1000건 초과 주문도 단일 요청으로 전체 저장');
  perform pg_temp.assert_true((select count(*) = 1004 from orders where platform = 'coupang'), '대량 추가 후 주문 수');
  perform pg_temp.assert_true((select to_jsonb(a) = (select data from original_allocation) from allocations a), '대량 추가 후 배정 보존');
  perform pg_temp.assert_true((select to_jsonb(t) = (select data from original_tracking) from trackings t), '대량 추가 후 운송장 보존');
end;
$$;

rollback;
\echo 'PASS: 추가·중복·계정 구분·기존 배정/운송장 보존·롤백·접근권한'
