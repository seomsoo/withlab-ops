-- 기존 주문/배정/운송장을 보존하며, 추가 주문과 업로드 집계를 함께 커밋한다.
create or replace function public.append_orders_to_import(
  p_work_session_id uuid,
  p_order_import_id uuid,
  p_platform text,
  p_file_name text,
  p_orders jsonb,
  p_invalid_rows jsonb default '[]'::jsonb,
  p_duplicate_rows jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status text;
  v_import public.order_imports%rowtype;
  v_inserted integer;
  v_duplicates jsonb;
  v_total integer;
begin
  if jsonb_typeof(p_orders) is distinct from 'array'
    or jsonb_typeof(p_invalid_rows) is distinct from 'array'
    or jsonb_typeof(p_duplicate_rows) is distinct from 'array' then
    raise exception '주문과 오류 목록은 배열이어야 합니다';
  end if;

  -- 같은 작업의 동시 추가를 직렬화하고, 완료 처리와의 경합도 막는다.
  select status into v_status from public.work_sessions
  where id = p_work_session_id for update;
  if not found or v_status <> 'active' then
    raise exception '진행 중인 작업에만 주문을 추가할 수 있습니다';
  end if;

  select * into v_import from public.order_imports
  where id = p_order_import_id
    and work_session_id = p_work_session_id
    and platform = p_platform
  for update;
  if not found then
    raise exception '추가할 기존 주문 파일을 찾을 수 없습니다. 목록을 새로고침해주세요';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_orders) item
    where item->>'platform' is distinct from p_platform
      or (p_platform = 'coupang' and (
        nullif(btrim(item->'raw'->>'묶음배송번호'), '') is null
        or nullif(btrim(item->'raw'->>'옵션ID'), '') is null
      ))
  ) then
    raise exception '주문 플랫폼 또는 쿠팡 상품 식별값이 올바르지 않습니다';
  end if;

  with incoming as materialized (
    select o.*, src.position,
      case when p_platform = 'coupang'
        then btrim(o.raw->>'묶음배송번호') || ':' || btrim(o.raw->>'옵션ID')
        else o.matching_key end as item_key
    from jsonb_array_elements(p_orders) with ordinality as src(item, position)
    cross join lateral jsonb_populate_record(null::public.orders, src.item) o
  ), ranked as (
    select incoming.*,
      row_number() over (partition by item_key order by position) as item_rank,
      first_value(raw_row_number) over (partition by item_key order by position) as first_input_row
    from incoming
  ), existing as materialized (
    -- 이전 버전의 묶음번호 키도 원본 옵션ID로 비교한다.
    select case when platform = 'coupang'
        and nullif(btrim(raw->>'묶음배송번호'), '') is not null
        and nullif(btrim(raw->>'옵션ID'), '') is not null
      then btrim(raw->>'묶음배송번호') || ':' || btrim(raw->>'옵션ID')
      else matching_key end as item_key,
      min(raw_row_number) as first_row
    from public.orders
    where work_session_id = p_work_session_id and platform = p_platform
    group by 1
  ), inserted as (
    insert into public.orders (
      id, work_session_id, order_import_id, platform, order_no, order_item_no,
      matching_key, order_date, product_name, option_name, display_product_name,
      quantity, buyer_name, buyer_phone, buyer_phone_digits, recipient_name,
      recipient_phone, recipient_phone_digits, zip_code, address, delivery_message,
      raw, raw_values, raw_row_number
    )
    select r.id, p_work_session_id, p_order_import_id, p_platform, r.order_no,
      case when p_platform = 'coupang' then r.item_key else r.order_item_no end,
      r.item_key, r.order_date, r.product_name, r.option_name, r.display_product_name,
      r.quantity, r.buyer_name, r.buyer_phone, r.buyer_phone_digits, r.recipient_name,
      r.recipient_phone, r.recipient_phone_digits, r.zip_code, r.address, r.delivery_message,
      r.raw, r.raw_values, r.raw_row_number
    from ranked r left join existing e on e.item_key = r.item_key
    where r.item_rank = 1 and e.item_key is null
    on conflict (work_session_id, platform, matching_key) do nothing
    returning id
  )
  select (select count(*) from inserted),
    p_duplicate_rows || coalesce((
      select jsonb_agg(jsonb_build_object(
        'rowNumber', r.raw_row_number,
        'reason', case when e.item_key is not null then '기존 파일과 중복' else '중복 주문' end,
        'matchingKey', r.item_key,
        'firstRowNumber', coalesce(e.first_row, r.first_input_row),
        'rawData', r.raw_values
      ) order by r.position)
      from ranked r
      left join existing e on e.item_key = r.item_key
      where r.item_rank > 1 or not exists (select 1 from inserted i where i.id = r.id)
    ), '[]'::jsonb)
  into v_inserted, v_duplicates;

  -- 기존 파일 ID, 라벨, 기존 오류 상세와 다른 계정의 파일은 그대로 유지한다.
  update public.order_imports set
    file_name = case when file_name = p_file_name then file_name
      else file_name || ' + ' || p_file_name end,
    total_rows = total_rows + jsonb_array_length(p_orders)
      + jsonb_array_length(p_invalid_rows) + jsonb_array_length(p_duplicate_rows),
    valid_count = (select count(*) from public.orders where order_import_id = p_order_import_id),
    invalid_count = invalid_count + jsonb_array_length(p_invalid_rows),
    duplicate_count = duplicate_count + jsonb_array_length(v_duplicates),
    invalid_rows = invalid_rows || p_invalid_rows,
    duplicate_rows = duplicate_rows || v_duplicates
  where id = p_order_import_id;

  select count(*) into v_total from public.orders
  where work_session_id = p_work_session_id and platform = p_platform;
  return jsonb_build_object(
    'inserted_count', v_inserted,
    'duplicate_count', jsonb_array_length(v_duplicates),
    'total_count', v_total
  );
end;
$$;

revoke all on function public.append_orders_to_import(uuid, uuid, text, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.append_orders_to_import(uuid, uuid, text, text, jsonb, jsonb, jsonb) to authenticated;
