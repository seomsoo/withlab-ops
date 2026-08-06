-- 대시보드 뷰가 anon(비로그인)에 노출되어 있던 문제 수정
--
-- [증상]
-- anon key만으로 work_session_dashboard_view 전체를 조회할 수 있었다.
-- anon key는 브라우저 번들에 그대로 실려 있으므로 사실상 인터넷 전체에 공개된
-- 상태였다. 노출 정보: 작업건명(= 영업일), 일별 주문 수, 배정 수, 거래 공급처 수,
-- 운송장 수와 매칭 현황. 고객 개인정보는 없지만 매출 규모 추정이 가능하다.
--
-- [원인]
-- 1) 20260510_grant_table_permissions.sql 이 anon 에게 GRANT를 부여하면서
--    ALTER DEFAULT PRIVILEGES ... TO anon 까지 설정했다. 그 결과 이후 생성된
--    객체(= 이 뷰)가 자동으로 anon 권한을 물려받았다.
--    20260511_create_dashboard_view.sql 은 authenticated 에게만 GRANT 했지만
--    default privileges 가 anon 권한을 덧씌운 것이다.
-- 2) 테이블은 RLS가 anon을 막아주지만 뷰에는 RLS가 적용되지 않는다. 게다가 뷰의
--    기본 동작은 SECURITY DEFINER 라서 소유자(postgres) 권한으로 실행되며
--    기반 테이블의 RLS까지 우회한다. 그래서 뷰만 구멍이 되었다.
--
-- [주의] security_invoker = on 은 켜지 않는다.
-- 처음에 함께 적용했다가 대시보드가 57014 statement timeout 으로 죽어 되돌렸다.
-- 이 뷰는 orders 와 trackings 를 조건 없이 LEFT JOIN 해 교차곱을 만들기 때문에
-- RLS 조건이 추가되는 순간 타임아웃을 넘긴다 (20260806_rewrite_dashboard_view.sql 참조).
-- RLS 정책이 `to authenticated using (true)` 라 security_invoker 가 주는 실질적인
-- 보안 이득도 없다. 실제 구멍이었던 anon GRANT는 아래 revoke 만으로 닫힌다.
-- Supabase 린터의 "Security Definer View" 경고는 남지만 노출은 해소된 상태다.

revoke all on public.work_session_dashboard_view from anon;
grant select on public.work_session_dashboard_view to authenticated;

-- [남은 위험] ALTER DEFAULT PRIVILEGES ... TO anon 이 아직 살아 있다.
-- 앞으로 public 스키마에 새 뷰를 만들면 같은 노출이 재발한다.
-- 새 뷰를 추가할 때마다 revoke 를 잊지 말 것. 근본 해결은 default privileges
-- 자체를 회수하는 것이며, 별도 마이그레이션으로 진행한다.
