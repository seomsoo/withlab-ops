-- ✅ 2026-08-06 운영 DB 적용 완료. 적용 결과: 3,023ms → 14.5ms (약 200배)
--    적용 전 아래 검증 쿼리로 신·구 집계값을 대조했고 불일치 0행을 확인했다.
--
-- 대시보드 뷰 성능 수정 (57014 statement timeout 해소)
--
-- [문제]
-- 기존 뷰는 orders 와 trackings 를 서로 아무 조건 없이 LEFT JOIN 한다.
--
--   FROM work_sessions ws
--   LEFT JOIN orders o      ON o.work_session_id = ws.id
--   LEFT JOIN allocations a ON a.order_id = o.id
--   LEFT JOIN trackings t   ON t.work_session_id = ws.id   -- ← 여기서 교차곱
--
-- 두 테이블이 ws 를 통해서만 연결되므로 작업건 하나당 (주문 수 × 운송장 수) 행이
-- 생성된다. 실측 기준 582 × 600 ≈ 35만 행을 만든 뒤 COUNT(DISTINCT) 를 돌리고,
-- 이를 작업건 41개에 반복한다.
-- 인덱스(idx_orders_ws, idx_track_ws, idx_alloc_ws)는 이미 있으므로 인덱스 문제가
-- 아니라 순전히 쿼리 구조 문제다.
--
-- [해결]
-- 스칼라 서브쿼리로 분리해 교차곱을 없앤다. 각 서브쿼리가 work_session_id 인덱스를
-- 그대로 타므로 작업건 수에 선형으로만 비례한다.
-- allocations 에 work_session_id 가 직접 있으므로 orders 를 경유할 필요도 없다.

create or replace view public.work_session_dashboard_view as
select
  ws.id,
  ws.name,
  ws.status,
  ws.created_at,
  ws.created_by,
  ws.completed_at,
  (select count(*) from orders o
     where o.work_session_id = ws.id) as order_count,
  (select count(*) from allocations a
     where a.work_session_id = ws.id) as allocation_count,
  (select count(distinct a.supplier_id) from allocations a
     where a.work_session_id = ws.id) as supplier_count,
  (select count(*) from trackings t
     where t.work_session_id = ws.id) as tracking_count,
  (select count(*) from trackings t
     where t.work_session_id = ws.id
       and t.status = 'matched') as matched_tracking_count,
  (select count(*) from trackings t
     where t.work_session_id = ws.id
       and t.status in ('unmatched', 'duplicated', 'invalid')) as unmatched_tracking_count
from work_sessions ws;

-- create or replace view 는 GRANT를 유지하지만, 확실히 하기 위해 다시 명시한다.
-- (anon 은 20260806_fix_dashboard_view_security.sql 에서 회수한 상태)
revoke all on public.work_session_dashboard_view from anon;
grant select on public.work_session_dashboard_view to authenticated;


-- ==========================================================================
-- 적용 전 검증 쿼리 (이 파일을 실행하기 전에 SQL Editor 에서 따로 돌릴 것)
-- ==========================================================================
--
-- allocation_count 의 의미가 바뀔 수 있다. 기존 뷰는 orders 를 경유해서 셌고
-- (COUNT(DISTINCT a.id) where a.order_id = o.id), 새 뷰는 allocations 의
-- work_session_id 를 직접 쓴다. 두 값이 항상 같으려면
-- allocations.work_session_id 가 orders.work_session_id 와 일치해야 한다.
-- 아래 쿼리가 0행을 반환해야 안전하다.
--
--   select a.id, a.work_session_id as alloc_ws, o.work_session_id as order_ws
--   from allocations a
--   join orders o on o.id = a.order_id
--   where a.work_session_id is distinct from o.work_session_id;
--
-- 그리고 신·구 집계값을 직접 대조한다. 아래가 0행이어야 한다.
--
--   with old_agg as (
--     select ws.id,
--            count(distinct o.id)          as order_count,
--            count(distinct a.id)          as allocation_count,
--            count(distinct a.supplier_id) as supplier_count,
--            count(distinct t.id)          as tracking_count
--     from work_sessions ws
--     left join orders o      on o.work_session_id = ws.id
--     left join allocations a on a.order_id = o.id
--     left join trackings t   on t.work_session_id = ws.id
--     group by ws.id
--   ), new_agg as (
--     select ws.id,
--            (select count(*) from orders o where o.work_session_id = ws.id),
--            (select count(*) from allocations a where a.work_session_id = ws.id),
--            (select count(distinct a.supplier_id) from allocations a where a.work_session_id = ws.id),
--            (select count(*) from trackings t where t.work_session_id = ws.id)
--     from work_sessions ws
--   )
--   select * from old_agg
--   except
--   select * from new_agg;
--
-- ⚠️ old_agg 는 교차곱 때문에 무겁다. 업무 시간에 돌리지 말 것.
--
-- ==========================================================================
-- 적용 후
-- ==========================================================================
-- 성능이 회복되면 security_invoker 를 켜서 방어를 한 겹 더 둘 수 있다.
-- 그때 20260806_fix_dashboard_view_security.sql 의 [주의] 주석도 갱신할 것.
--
--   alter view public.work_session_dashboard_view set (security_invoker = on);
--
-- 켠 뒤 반드시 대시보드를 열어 타임아웃이 재발하지 않는지 확인한다.
