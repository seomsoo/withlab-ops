-- H2: overwriteTrackingMatch를 단일 트랜잭션으로 처리
create or replace function overwrite_tracking_match(
  p_tracking_id uuid,
  p_allocation_id uuid
)
returns void as $$
begin
  update trackings
  set status = 'duplicated',
      invalid_reason = '수동 매칭으로 대체됨'
  where allocation_id = p_allocation_id
    and status = 'matched';

  update trackings
  set status = 'matched',
      allocation_id = p_allocation_id,
      matched_at = now(),
      invalid_reason = null
  where id = p_tracking_id;
end;
$$ language plpgsql;
