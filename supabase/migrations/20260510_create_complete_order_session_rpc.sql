create or replace function complete_order_session(p_work_session_id uuid)
returns void as $$
begin
  if not exists (
    select 1 from work_sessions
    where id = p_work_session_id and status = 'active'
  ) then
    raise exception 'work_session is not active';
  end if;

  if exists (
    select 1 from orders o
    where o.work_session_id = p_work_session_id
      and not exists (
        select 1 from allocations a where a.order_id = o.id
      )
  ) then
    raise exception 'unallocated orders exist';
  end if;

  update allocations
  set status = 'ordered', ordered_at = now()
  where order_id in (
    select id from orders where work_session_id = p_work_session_id
  ) and status = 'pending';

  update work_sessions
  set status = 'ordered', completed_at = now()
  where id = p_work_session_id;
end;
$$ language plpgsql;
