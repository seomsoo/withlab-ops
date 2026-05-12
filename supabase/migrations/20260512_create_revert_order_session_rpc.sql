create or replace function revert_order_session(p_work_session_id uuid)
returns void as $$
begin
  if not exists (
    select 1 from work_sessions
    where id = p_work_session_id and status = 'ordered'
  ) then
    raise exception 'work_session is not in ordered status';
  end if;

  update allocations
  set status = 'pending', ordered_at = null
  where order_id in (
    select id from orders where work_session_id = p_work_session_id
  ) and status = 'ordered';

  update work_sessions
  set status = 'active', completed_at = null
  where id = p_work_session_id;
end;
$$ language plpgsql;
