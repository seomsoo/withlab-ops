-- H4: switchDefaultSupplier를 단일 트랜잭션으로 처리
create or replace function switch_default_supplier(
  p_platform text,
  p_product_name text,
  p_option_name text,
  p_new_supplier_id uuid
)
returns void as $$
begin
  update product_mappings
  set is_default = false
  where platform = p_platform
    and product_name = p_product_name
    and option_name = p_option_name
    and is_default = true
    and supplier_id != p_new_supplier_id;

  if exists (
    select 1 from product_mappings
    where platform = p_platform
      and product_name = p_product_name
      and option_name = p_option_name
      and supplier_id = p_new_supplier_id
  ) then
    update product_mappings
    set is_default = true, priority = 0
    where platform = p_platform
      and product_name = p_product_name
      and option_name = p_option_name
      and supplier_id = p_new_supplier_id;
  else
    insert into product_mappings (
      platform, product_name, option_name,
      supplier_id, is_default, priority
    ) values (
      p_platform, p_product_name, p_option_name,
      p_new_supplier_id, true, 0
    );
  end if;
end;
$$ language plpgsql;
