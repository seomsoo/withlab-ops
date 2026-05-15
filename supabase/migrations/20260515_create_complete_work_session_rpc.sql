-- H3: completeWorkSession을 단일 트랜잭션으로 처리
create or replace function complete_work_session(p_session_id uuid)
returns void as $$
declare
  v_status text;
  v_matched_count int;
begin
  select status into v_status
  from work_sessions
  where id = p_session_id;

  if v_status is null then
    raise exception 'work_session not found';
  end if;

  if v_status = 'completed' then
    return;
  end if;

  if v_status not in ('active', 'ordered') then
    raise exception '진행중 또는 발주완료 상태의 작업건만 완료할 수 있습니다';
  end if;

  select count(*) into v_matched_count
  from trackings
  where work_session_id = p_session_id
    and status = 'matched';

  if v_matched_count = 0 then
    raise exception '매칭된 운송장이 없습니다. 운송장을 먼저 업로드해 주세요.';
  end if;

  if v_status = 'active' then
    update allocations
    set status = 'ordered'
    where order_id in (
      select id from orders where work_session_id = p_session_id
    ) and status = 'pending';

    update work_sessions
    set ordered_at = now()
    where id = p_session_id;
  end if;

  update work_sessions
  set status = 'completed', completed_at = now()
  where id = p_session_id;
end;
$$ language plpgsql;
