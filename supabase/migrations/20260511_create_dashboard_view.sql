-- Phase 6: 대시보드용 집계 뷰
-- N+1 방지를 위해 작업건별 주문/배정/운송장 카운트를 한 번에 조회
--
-- ⚠️ 이 파일만 실행하면 안 된다. 아래 두 마이그레이션이 반드시 뒤따라야 한다.
--   - 20260806_fix_dashboard_view_security.sql : anon 노출 차단
--     (아래 GRANT는 authenticated 만 주지만, 20260510_grant_table_permissions.sql 의
--      ALTER DEFAULT PRIVILEGES ... TO anon 때문에 anon 권한이 자동으로 덧씌워진다)
--   - 20260806_rewrite_dashboard_view.sql : 교차곱 제거 (statement timeout 해소)
CREATE OR REPLACE VIEW work_session_dashboard_view AS
SELECT
  ws.id,
  ws.name,
  ws.status,
  ws.created_at,
  ws.created_by,
  ws.completed_at,
  COUNT(DISTINCT o.id) AS order_count,
  COUNT(DISTINCT a.id) AS allocation_count,
  COUNT(DISTINCT a.supplier_id) AS supplier_count,
  COUNT(DISTINCT t.id) AS tracking_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'matched') AS matched_tracking_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('unmatched', 'duplicated', 'invalid')) AS unmatched_tracking_count
FROM work_sessions ws
LEFT JOIN orders o ON o.work_session_id = ws.id
LEFT JOIN allocations a ON a.order_id = o.id
LEFT JOIN trackings t ON t.work_session_id = ws.id
GROUP BY ws.id;

GRANT SELECT ON work_session_dashboard_view TO authenticated;
