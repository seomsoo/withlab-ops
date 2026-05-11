-- Phase 6: 대시보드용 집계 뷰
-- N+1 방지를 위해 작업건별 주문/배정/운송장 카운트를 한 번에 조회
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
