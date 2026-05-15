-- H1: replaceAllocationsForGroup를 단일 트랜잭션으로 처리
create or replace function replace_allocations_for_group(
  p_work_session_id uuid,
  p_order_ids uuid[],
  p_new_allocations jsonb
)
returns setof allocations as $$
begin
  delete from allocations
  where work_session_id = p_work_session_id
    and order_id = any(p_order_ids);

  return query
    insert into allocations (
      work_session_id, order_id, supplier_id,
      supplier_product_name, supplier_product_code,
      allocated_quantity, status, is_temporary_override,
      name_mapping_applied, smart_allocation_applied,
      supplier_price, allocation_reason
    )
    select
      p_work_session_id,
      (item->>'order_id')::uuid,
      (item->>'supplier_id')::uuid,
      item->>'supplier_product_name',
      item->>'supplier_product_code',
      (item->>'allocated_quantity')::int,
      'pending',
      coalesce((item->>'is_temporary_override')::bool, false),
      item->>'name_mapping_applied',
      coalesce((item->>'smart_allocation_applied')::bool, false),
      (item->>'supplier_price')::numeric,
      item->>'allocation_reason'
    from jsonb_array_elements(p_new_allocations) as item
    returning *;
end;
$$ language plpgsql;
