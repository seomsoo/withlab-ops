# Phase 6: 대시보드 + 마무리

## 목표
대시보드 페이지를 구현하여 사용자가 시스템의 핵심 기능에 빠르게 접근할 수 있도록 하고, 다크모드를 지원하며, 전체 프로젝트의 빌드/린트/테스트 최종 점검 후 Vercel 배포 설정과 사용 가이드를 완성한다.

> ⚠️ Phase 6에서도 모든 UI는 `docs/REF_디자인_시스템.md`를 단일 진실 공급원으로 삼는다.
> `docs/design/` 시안 파일은 **디자인(색상, 간격, 스타일)의 참조**로만 사용한다.
> 구조, 기능 범위, 데이터 흐름은 **스펙 문서가 우선**이며 시안과 다를 경우 스펙을 따른다.

---

## 선행 조건
- Phase 5 ✅ 검증 통과

---

## 시안 참조 가이드

| 구현 대상 | 참조 시안 파일 | 참조 범위 |
|----------|--------------|----------|
| 대시보드 | `docs/design/home.css`, `docs/design/home.jsx` | 인사말, 빠른 작업 카드, 최근 작업건 리스트, 바로가기 |

---

## 작업 목록

### 6-1. 대시보드 전용 타입 + Supabase API

`src/lib/supabase/dashboard.ts`:

#### 대시보드 전용 타입

기존 `WorkSession` 타입은 변경하지 않고, 대시보드 전용 확장 타입을 정의한다.

```ts
export interface DashboardWorkSession extends WorkSession {
  orderCount: number          // 해당 작업건의 주문 라인 수
  allocationCount: number     // 해당 작업건의 배정 수
  supplierCount: number       // 해당 작업건에 배정된 distinct supplier_id 수
  trackingCount: number       // 해당 작업건의 전체 trackings 수
  matchedTrackingCount: number    // status='matched' trackings 수
  unmatchedTrackingCount: number  // status in ('unmatched','duplicated','invalid') trackings 수
}

export interface DashboardStats {
  activeSessionCount: number      // status='active' 작업건 수
  orderedSessionCount: number     // status='ordered' 작업건 수
  totalSupplierCount: number      // is_active=true 공급처 수
  totalMappingCount: number       // product_mappings 총 건수
  unmatchedTrackingCount: number  // ordered 작업건 기준 unresolved tracking 수
}
```

#### 집계 쿼리 — DB View 권장

N+1 쿼리를 방지하기 위해 DB View를 생성한다.

```sql
CREATE VIEW work_session_dashboard_view AS
SELECT
  ws.id,
  ws.name,
  ws.status,
  ws.created_at,
  ws.updated_at,
  COUNT(DISTINCT o.id) AS order_count,
  COUNT(DISTINCT a.id) AS allocation_count,
  COUNT(DISTINCT a.supplier_id) AS supplier_count,
  COUNT(DISTINCT t.id) AS tracking_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'matched') AS matched_tracking_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('unmatched', 'duplicated', 'invalid')) AS unmatched_tracking_count
FROM work_sessions ws
LEFT JOIN orders o ON o.work_session_id = ws.id
LEFT JOIN allocations a ON a.order_id = o.id
LEFT JOIN trackings t ON t.allocation_id = a.id
GROUP BY ws.id;
```

> View 생성이 어려우면 개별 count 쿼리를 `Promise.all`로 병렬 처리하되, 최근 5건 각각에 대한 N+1 조회가 과도하지 않도록 주의한다.

#### API 함수

```ts
/** 최근 작업건 조회 (최신 5건, 모든 status) — view 기반 */
export async function getRecentWorkSessions(limit?: number): Promise<DashboardWorkSession[]>

/** 대시보드 요약 통계 — count 쿼리 병렬 */
export async function getDashboardStats(): Promise<DashboardStats>
```

`getDashboardStats` 쿼리 기준:
- `activeSessionCount`: `work_sessions` WHERE `status = 'active'` → count
- `orderedSessionCount`: `work_sessions` WHERE `status = 'ordered'` → count
- `totalSupplierCount`: `suppliers` WHERE `is_active = true` → count
- `totalMappingCount`: `product_mappings` → count
- `unmatchedTrackingCount`: `trackings` JOIN `allocations` JOIN `orders` JOIN `work_sessions` WHERE `work_sessions.status = 'ordered'` AND `trackings.status IN ('unmatched', 'duplicated', 'invalid')` → count

> `unmatchedTrackingCount`는 **`ordered` 상태 작업건만** 집계한다. `completed` 작업건의 미매칭은 운영상 종료된 것으로 보고 대시보드 경고에 포함하지 않는다.

---

### 6-2. 대시보드 훅

`src/hooks/useDashboard.ts`:

```ts
export function useDashboard() {
  const [recentSessions, setRecentSessions] = useState<DashboardWorkSession[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 로드: Promise.all([getRecentWorkSessions(5), getDashboardStats()])
  // 에러 시 error 상태 세팅 (전체 앱을 깨뜨리지 않음)

  async function refetch() { /* 재호출 */ }

  return { recentSessions, stats, loading, error, refetch }
}
```

**에러 처리 정책**:
- 대시보드 데이터 조회 실패 시 전체 앱을 깨뜨리지 않는다
- PageHeader 아래에 인라인 에러 배너 표시 + [다시 시도] 버튼 제공

---

### 6-3. 작업건 유틸 함수

`src/utils/workSession.ts`:

작업건 관련 공통 유틸을 한 곳에 모은다. Dashboard와 WorkSessionSelector가 같은 유틸을 사용한다.

```ts
/** 작업건 기본 이름 생성 (Asia/Seoul 기준) */
export function getDefaultWorkSessionName(now?: Date): string

/** 진행 단계 판단 */
export function getSessionProgress(session: DashboardWorkSession): {
  label: string
  percentage: number
}

/** 작업건 클릭 시 이동 경로 결정 */
export function getSessionEntryPath(session: DashboardWorkSession): string
```

#### getSessionProgress 로직

```ts
export function getSessionProgress(session: DashboardWorkSession): {
  label: string
  percentage: number
} {
  if (session.status === 'completed') {
    return { label: '운송장 처리 완료', percentage: 100 }
  }

  if (session.status === 'ordered') {
    if (session.trackingCount === 0) {
      return { label: '발주 완료 · 운송장 업로드 대기', percentage: 75 }
    }
    if (session.matchedTrackingCount === 0) {
      return { label: '운송장 업로드 완료 · 매칭 확인 필요', percentage: 85 }
    }
    if (session.unmatchedTrackingCount > 0) {
      return { label: '운송장 일부 매칭 · 확인 필요', percentage: 90 }
    }
    return { label: '운송장 매칭 완료 · 완료 처리 대기', percentage: 95 }
  }

  // active
  if (session.orderCount === 0) {
    return { label: '주문 업로드 대기', percentage: 0 }
  }
  if (session.allocationCount === 0) {
    return { label: '주문 업로드 완료 · 공급처 배정 대기', percentage: 25 }
  }
  return { label: '공급처 배정 완료 · 발주서 다운로드 대기', percentage: 50 }
}
```

#### getSessionEntryPath 로직

```ts
export function getSessionEntryPath(session: DashboardWorkSession): string {
  if (session.status === 'completed') {
    return `/tracking/${session.id}/download`
  }

  if (session.status === 'ordered') {
    if (session.trackingCount > 0 && session.matchedTrackingCount > 0) {
      return `/tracking/${session.id}/download`
    }
    if (session.trackingCount > 0) {
      return `/tracking/${session.id}/match`
    }
    return `/tracking/${session.id}/upload`
  }

  // active
  if (session.orderCount === 0) {
    return `/orders/${session.id}/upload`
  }
  if (session.allocationCount === 0) {
    return `/orders/${session.id}/allocation`
  }
  return `/orders/${session.id}/download`
}
```

> `getDefaultWorkSessionName`은 Phase 3에서 이미 구현된 것을 이 파일로 이동(또는 import)한다. 중복 구현하지 않는다.

---

### 6-4. 작업건 생성 Dialog 공통 컴포넌트

`src/components/work-session/CreateWorkSessionDialog.tsx`:

Phase 3의 WorkSessionSelector와 대시보드에서 동일한 작업건 생성 모달을 사용하므로 공통 컴포넌트로 추출한다.

```ts
type CreateWorkSessionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultName?: string   // 기본값: getDefaultWorkSessionName()
  onCreate: (name: string) => Promise<WorkSession>
  onCreated?: (session: WorkSession) => void
}
```

- Dashboard: `onCreated` → `navigate(/orders/${session.id}/upload)`
- WorkSessionSelector: `onCreated` → `navigate(/orders/${session.id}/upload)`
- 기존 WorkSessionSelector 내부의 모달 코드를 이 컴포넌트로 대체한다

---

### 6-5. 대시보드 페이지 UI

`src/pages/Dashboard.tsx`:

Phase 1에서 만든 Placeholder 페이지를 교체.

**시안 참조**: `docs/design/home.css`, `docs/design/home.jsx`

**시간대 기준**: 인사말, 날짜 표시, 작업건 기본 이름은 모두 **Asia/Seoul** 기준이다. 브라우저 로컬 시간대가 달라도 한국 운영 기준으로 표시한다.

**구성** (시안 구조와 동일):

#### 상단: 인사말 (Greet)
- 시간대별 인사 (Asia/Seoul 기준):
  - 06:00 이상 12:00 미만: "좋은 아침이에요 👋"
  - 12:00 이상 18:00 미만: "좋은 오후예요 👋"
  - 18:00 이상 또는 06:00 미만: "좋은 저녁이에요 👋"
- 부제: "오늘의 발주 작업을 시작해볼까요?"
- 날짜 표시: "2026년 5월 10일 토요일" (Asia/Seoul, `ko-KR` 로케일)

#### 빠른 작업 카드 2개 (QuickActions)
가로 2열 배치. 시안의 `qaction` 스타일 참조.

> 카드 전체가 클릭 가능하므로 `<button>` 또는 `<Link>`로 구현한다. `<div onClick>`은 사용하지 않는다. 키보드 포커스, Enter/Space 동작, `aria-label`을 지원한다.

**카드 1: 새 발주 작업 시작**
- 아이콘: ClipboardList (lucide-react) 또는 시안의 OrderArt 일러스트를 CSS로 재현
- STEP 01 라벨
- 제목: "새 발주 작업 시작"
- 설명: "쿠팡·토스 주문 엑셀을 올리면 공급처별 발주서가 자동으로 만들어져요."
- 클릭: `CreateWorkSessionDialog` 열기 → 생성 후 `/orders/:sessionId/upload` 이동

**카드 2: 운송장 매칭 시작**
- 아이콘: Truck (lucide-react) 또는 시안의 TrackArt 일러스트를 CSS로 재현
- STEP 02 라벨
- 제목: "운송장 매칭 시작"
- 설명: "공급처에서 받은 운송장 파일을 올리면 주문번호와 자동으로 연결돼요."
- 클릭: `/tracking` 페이지로 이동

#### 최근 작업건 리스트 (RecentJobs)
- 섹션 헤더: "최근 작업건" + "진행중·완료된 발주 작업을 한눈에 볼 수 있어요"
- 우측: "전체 보기 →" 링크 → `/orders`
- 작업건 리스트 (최대 5건):
  - 작업건 이름
  - 생성일 + `공급처 N · 주문 N건` 부제
  - 진행 상태 표시:
    - `active`: "진행중" 뱃지 (파란색) + 펄스 아이콘
    - `ordered`: "발주완료" 뱃지 (초록색) + 체크 아이콘
    - `completed`: "완료" 뱃지 (회색) + 체크 아이콘
  - 진행 단계: `getSessionProgress()` 결과의 `label` + `percentage` 프로그레스 바
  - 클릭: `getSessionEntryPath()` 결과로 이동
  - 각 row는 `<Link>` 또는 `<button>`으로 구현 (키보드 접근 가능)
- 작업건 없을 때: EmptyState ("아직 작업건이 없어요. 새 발주 작업을 시작해보세요!") + [새 발주 작업 시작] 버튼

진행률 바(progress bar)는 시안의 `job__bar` + `job__bar-fill` 스타일 참조.

#### 하단 바로가기 (Shortcuts)
가로 3열 배치. 시안의 `shortcut` 스타일 참조.

**카드 1: 매핑 관리**
- 아이콘: ArrowLeftRight (lucide-react)
- 제목: "매핑 관리"
- 설명: "품목 ↔ 공급처 연결 관리"
- 건수: `stats.totalMappingCount`개
- 미매핑 경고: `stats.unmatchedTrackingCount > 0`이면 "미매칭 N건" 표시
- 클릭: `/mapping/products`

**카드 2: 양식 관리**
- 아이콘: FileSpreadsheet (lucide-react)
- 제목: "양식 관리"
- 설명: "공급처별 발주 양식 관리"
- 클릭: `/settings/supplier-template`

**카드 3: 공급처 관리**
- 아이콘: Building2 (lucide-react)
- 제목: "공급처 관리"
- 설명: "거래처와 연락처 관리"
- 건수: `stats.totalSupplierCount`개
- 클릭: `/mapping/suppliers`

#### 데이터 없을 때 (초기 빈 상태)

처음 사용하는 경우 공급처, 매핑, 작업건이 모두 없을 수 있다.

- 최근 작업건 없음: EmptyState + [새 발주 작업 시작] 버튼
- 공급처 0개: 바로가기 카드에 "0개" 표시
- 매핑 0개: 바로가기 카드에 "0개" 표시
- 통계 로드 실패: 인라인 에러 배너 + [다시 시도] 버튼 (전체 앱은 깨지지 않음)

---

### 6-6. 다크모드

#### 동작 방식
- **기본값: 시스템 설정 따르기** — OS/브라우저의 `prefers-color-scheme` 감지
- **수동 전환**: 사이드바 하단에 테마 전환 DropdownMenu (시스템 / 라이트 / 다크 명시적 선택)
- 선택값은 `localStorage` (키: `withlab-theme`)에 저장하여 새로고침 후에도 유지

#### 구현 상세

**1) 커스텀 ThemeProvider (Vite SPA 방식)**

이 프로젝트는 Next.js가 아니라 Vite SPA이므로 `next-themes`를 사용하지 않고 shadcn/ui Vite 공식 패턴에 따라 커스텀 ThemeProvider를 구현한다.

`src/components/theme-provider.tsx`:

```ts
type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}
```

동작:
- `localStorage[storageKey]`에 선택값 저장
- `system` 선택 시 `window.matchMedia('(prefers-color-scheme: dark)')` 감지
- `document.documentElement`에 `light` 또는 `dark` class 적용
- 기본값: `system`, 저장 키: `withlab-theme`

> `next-themes` 패키지가 이미 설치되어 있다면 제거하거나, 사용하지 않는 상태로 둔다. Phase 0 스코프 크립으로 기록된 패키지이므로 이 기회에 정리한다.

App 구조:

```tsx
<ThemeProvider defaultTheme="system" storageKey="withlab-theme">
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
      <Toaster position="top-right" duration={3000} />
    </BrowserRouter>
  </ErrorBoundary>
</ThemeProvider>
```

**2) 다크 테마 CSS 토큰 — Semantic Token 중심**

gray scale 숫자를 뒤집는 방식은 기존 코드에서 `gray-50`, `gray-900`을 직접 사용하는 곳이 많으면 혼란이 생기므로, **semantic token 중심으로** 다크모드를 정의한다.

`src/index.css`에 `.dark` 선택자 추가:

```css
.dark {
  /* 배경 */
  --color-bg: #0F1114;
  --color-surface: #1A1D23;
  --color-surface-hover: #22262E;

  /* 테두리 */
  --color-border: #2A2E37;
  --color-border-light: #22262E;

  /* 텍스트 */
  --color-t-strong: #F2F4F6;
  --color-t-mid: #ADB5BD;
  --color-t-mute: #8B95A1;

  /* Primary */
  --color-primary: #4A9AFF;
  --color-primary-light: #1A2A40;

  /* Status */
  --color-success: #30D158;
  --color-success-light: #0D2B1A;
  --color-error: #FF453A;
  --color-error-light: #2D1215;
  --color-warning: #FFD60A;
  --color-warning-light: #2D2A0D;

  /* shadcn 호환 */
  --color-background: #0F1114;
  --color-foreground: #F2F4F6;
  --color-card: #1A1D23;
  --color-card-foreground: #F2F4F6;
  --color-popover: #1A1D23;
  --color-popover-foreground: #F2F4F6;
  --color-muted: #22262E;
  --color-muted-foreground: #8B95A1;
  --color-accent: #22262E;
  --color-accent-foreground: #F2F4F6;
  --color-input: #2A2E37;
  --color-ring: #4A9AFF;
}
```

> 위 값은 초안이며, 실제 구현 시 `REF_디자인_시스템.md`의 라이트 토큰과 대비/가독성을 맞춰 조정한다.

**3) 하드코딩 색상 정리**

Phase 6에서 반드시 수행:
- `bg-white`, `text-gray-900`, `border-gray-200` 등 하드코딩 Tailwind class를 전체 검색
- semantic token class 또는 CSS variable 기반 class로 교체
- `REF_디자인_시스템.md`에 light/dark semantic token 매핑 표 추가

**4) ModeToggle — DropdownMenu 방식**

`src/components/ModeToggle.tsx`:

사이드바 하단 (로그아웃 버튼 위)에 배치.

```tsx
import { useTheme } from '@/components/theme-provider'
import { Sun, Moon, Monitor } from 'lucide-react'
// shadcn DropdownMenu 사용

// 메뉴 항목:
// - 시스템 (Monitor 아이콘) — 현재 선택 시 체크
// - 라이트 (Sun 아이콘) — 현재 선택 시 체크
// - 다크 (Moon 아이콘) — 현재 선택 시 체크
```

- 현재 선택된 테마를 체크 표시로 명확히 표시
- 3단 순환 대신 명시적 선택 (클릭마다 예상치 못한 모드로 바뀌지 않음)
- 트리거 버튼: 현재 테마에 맞는 아이콘 표시

**5) 주의사항**

- 로그인 페이지도 다크모드 적용 대상
- `REF_디자인_시스템.md`에 다크 테마 토큰 섹션 추가

---

### 6-7. Vercel 배포 설정

#### `vercel.json` (프로젝트 루트)

```json
{
  "rewrites": [
    { "source": "/:path*", "destination": "/index.html" }
  ]
}
```

> SPA이므로 모든 경로를 `index.html`로 리라이트한다. 직접 URL 접근(`/orders/...`, `/tracking/...`) 시 새로고침해도 404가 발생하지 않아야 한다.

#### 환경변수 설정 가이드

Vercel 프로젝트 Settings → Environment Variables에 다음 설정:

| 변수명 | 값 | 환경 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | Supabase 퍼블릭 anon 키 | Production, Preview |

#### 배포 설정

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Node.js Version: 20.x

#### Vercel 플랜 주의

> 개발/테스트 배포는 Vercel Hobby 플랜으로 가능하지만, 이 프로젝트는 내부 B2B 운영 도구이므로 실제 운영 배포 전 Vercel 플랜 정책(상업적 사용 제한)을 확인한다. 상업적 운영 환경에서는 Pro 이상 또는 대체 호스팅(Cloudflare Pages 등)을 검토한다.

---

### 6-8. Supabase 운영 환경 체크리스트

Vercel 배포만으로 운영 준비가 끝나지 않으므로, Supabase 쪽 운영 설정도 확인한다.

- [ ] Production Supabase URL/anon key가 Vercel 환경변수에 설정됨
- [ ] Auth Email/Password 활성화
- [ ] 운영 계정 최소 1개 생성
- [ ] Site URL / Redirect URLs에 Vercel 도메인 등록
- [ ] 모든 테이블 RLS 활성화 + authenticated 정책 정상 동작
- [ ] Storage `templates` 버킷 private 상태 + RLS 정책 정상
- [ ] 실제 템플릿 업로드/다운로드 운영 환경에서 검증
- [ ] Phase 6 DB View (`work_session_dashboard_view`) 생성 완료

---

### 6-9. 사용 가이드 문서

`docs/USER_GUIDE.md` 작성.

사용자(관리자/직원)가 시스템을 처음 접했을 때 참고할 수 있는 가이드.

**목차**:

1. **시작하기**
   - 접속 URL
   - 로그인

2. **매일 운영 순서 요약**
   1. 로그인
   2. 대시보드에서 [새 발주 작업 시작]
   3. 쿠팡 주문 엑셀 업로드
   4. 토스 주문 엑셀 업로드
   5. 공급처 배정 확인 (미분류 있으면 공급처 지정)
   6. 공급처별 발주서 다운로드
   7. 공급처에 발주서 전달 (외부)
   8. [발주 완료 처리]
   9. 공급처 운송장 수신 후 [운송장 매칭 시작]
   10. 공급처별 운송장 엑셀 업로드
   11. 매칭 결과 확인 (미매칭 있으면 수동 매칭)
   12. 쿠팡/토스 운송장 파일 다운로드
   13. 각 플랫폼에 업로드 (외부)

3. **발주서 상세**
   - 주문 업로드
   - 공급처 배정
   - 발주서 다운로드
   - 발주 완료 처리

4. **운송장 처리 상세**
   - 운송장 업로드
   - 매칭 결과 확인
   - 수동 매칭
   - 플랫폼 파일 다운로드

5. **매핑 관리**
   - 공급처 추가/수정
   - 품목↔공급처 매핑
   - 상품명 변환
   - 택배사 매핑

6. **양식 관리**
   - 공급처 발주서 양식 등록
   - 플랫폼 운송장 양식 등록

7. **자주 묻는 질문**
   - 새 품목이 나왔을 때
   - 공급처를 변경하고 싶을 때
   - 운송장이 매칭 안 될 때
   - 토스 엑셀이 파싱되지 않을 때

---

### 6-10. README.md 업데이트

기존 `README.md`에 다음 내용 추가/갱신:

- 배포 URL (Vercel)
- 사용 가이드 링크 (`docs/USER_GUIDE.md`)
- 환경변수 설정 가이드 보완 (Vercel 배포용)
- Phase 0~6 전체 완료 반영
- 문서 구분 섹션 추가:

```md
## 문서 구분
- README.md: 개발/배포/환경변수 설정 (개발자용)
- docs/USER_GUIDE.md: 운영자 사용 가이드
- docs/REF_*.md: 스펙/레퍼런스
```

---

### 6-11. 전체 빌드 / 린트 / 테스트 최종 점검

Phase 6 구현 완료 후 전체 프로젝트 대상 최종 점검:

```bash
npm run build        # 프로덕션 빌드
npm run typecheck    # 타입 체크
npm run lint         # 린트
npm run test:run     # 전체 테스트
```

모든 명령이 에러 없이 통과해야 한다.

---

### 6-12. 실제 데이터 E2E 수동 테스트 체크리스트

브라우저에서 프로젝트에 첨부된 실제 엑셀 파일을 사용하여 전체 흐름을 테스트.

#### 사용할 테스트 파일

| 표시명 | 실제 파일명 |
|--------|-----------|
| 쿠팡 주문 엑셀 | `1. 쿠팡 주문 엑셀.xlsx` |
| 토스 주문 엑셀 | `1. 토스 주문 엑셀.xlsx` |
| A업체 발주서 양식 | `2. a업체_공급처별 발주서 양식 .xlsx` |
| B업체 발주서 양식 | `2. b업체_공급처별 발주서 양식 .xlsx.xlsx` |
| A업체 운송장 | `3. a업체_공급처 운송장 엑셀.xlsx` |
| B업체 운송장 | `3. b업체_공급처 운송장 엑셀.xlsx` |
| 쿠팡 운송장 양식 | `4. 쿠팡 운송장 업로드 양식.xlsx` |
| 토스 운송장 양식 | `4. 토스 운송장 업로드 양식.xlsx` |
| A업체 공급처 목록 | `5. a업체_ 공급처 목록.xlsx` |
| B업체 공급처 목록 | `5. b업체_ 공급처 목록.xlsx` |

#### 테스트 시나리오

**시나리오 1: 초기 설정**
- [ ] 로그인 성공
- [ ] 공급처 등록 (A업체, B업체 — 공급처 목록 참조)
- [ ] A업체 발주서 양식 등록 + 컬럼 매핑
- [ ] B업체 발주서 양식 등록 + 컬럼 매핑
- [ ] 쿠팡 플랫폼 운송장 양식 등록
- [ ] 토스 플랫폼 운송장 양식 등록

**시나리오 2: 발주 작업**
- [ ] 대시보드에서 "새 발주 작업 시작" 클릭 → 작업건 생성 모달 표시
- [ ] 쿠팡 주문 엑셀 업로드
  - 기대값: Delivery 시트 파싱, matchingKey = 묶음배송번호, 정상/오류/중복 건수 표시
- [ ] 토스 주문 엑셀 업로드
  - 기대값: 주문내역 시트 5행부터 파싱, matchingKey = 주문상품번호
- [ ] 공급처 배정 탭 이동 → 자동 배정 확인
- [ ] 미분류 품목이 있으면 공급처 지정
- [ ] 발주서 다운로드
  - 기대값: 각 공급처 양식에 맞게 주문번호/상품코드/상품명/수량/수취인/주소가 채워짐
  - 기대값: 템플릿 샘플 데이터가 남아 있지 않음
  - 기대값: matchingKey 포함
- [ ] 발주 완료 처리

**시나리오 3: 운송장 처리**
- [ ] 대시보드에서 해당 작업건 클릭 → 운송장 페이지로 이동
- [ ] A업체 운송장 엑셀 업로드 → 파싱 + 매칭 확인
- [ ] B업체 운송장 엑셀 업로드 → 파싱 + 매칭 확인
- [ ] 매칭 결과 확인 (매칭/미매칭/중복 건수)
- [ ] 미매칭 건이 있으면 수동 매칭 시도
- [ ] 쿠팡 운송장 파일 다운로드
  - 기대값: D열 택배사, E열 운송장번호 채워짐
- [ ] 토스 운송장 파일 다운로드
  - 기대값: D열 주문상태 "배송중", F열 택배사, G열 송장번호 채워짐
  - 기대값: 1~4행 안내/헤더 영역 보존

**시나리오 4: 대시보드 + 다크모드 확인**
- [ ] 대시보드에 최근 작업건 표시 확인 (상태 뱃지, 진행 단계, 프로그레스 바)
- [ ] 작업건 클릭 → 상태/진행 단계에 맞는 페이지로 이동
- [ ] 바로가기 카드의 건수 표시 확인
- [ ] 다크모드 전환 → 전체 UI가 다크 테마로 변경
- [ ] 라이트모드 전환 → 전체 UI가 라이트 테마로 복귀
- [ ] 시스템 모드 → OS 설정에 따라 자동 전환
- [ ] 새로고침 후 선택한 테마 유지

> ⚠️ 이 체크리스트는 **사용자가 브라우저에서 직접 수행**하는 수동 테스트이다. 자동화된 E2E 테스트(Playwright 등)는 이 Phase의 범위에 포함하지 않는다.

---

### 6-13. 배포 후 Smoke Test

Vercel Preview/Production 배포 후 아래를 검증한다.

- [ ] Vercel 배포 URL 접속 성공
- [ ] `/login` 직접 접근 → 로그인 페이지 표시
- [ ] `/orders` 직접 접근 시 로그인 가드 정상 (미인증 → 로그인 리다이렉트)
- [ ] 로그인 성공 후 대시보드 표시
- [ ] 새로고침 후 세션 유지
- [ ] `/orders/:sessionId/upload` 직접 URL 접근 시 404 없음
- [ ] `/tracking/:sessionId/download` 직접 URL 접근 시 404 없음
- [ ] 템플릿 파일 업로드/다운로드 정상
- [ ] 엑셀 파일 다운로드 정상
- [ ] 로그아웃 → 재접속 시 로그인 가드 정상

---

## 완료 기준

### 대시보드 API / 데이터
- [ ] `src/lib/supabase/dashboard.ts` — `getRecentWorkSessions`, `getDashboardStats` 함수 존재
- [ ] `DashboardWorkSession`에 `orderCount`, `allocationCount`, `supplierCount`, `trackingCount`, `matchedTrackingCount`, `unmatchedTrackingCount` 포함
- [ ] `DashboardStats`에 `orderedSessionCount` 포함
- [ ] 대시보드 미매칭 카운트는 `ordered` 작업건 기준으로 계산
- [ ] 집계 쿼리는 DB View 또는 Promise.all 병렬 처리 (N+1 방지)
- [ ] `src/hooks/useDashboard.ts` — `error`, `refetch` 포함
- [ ] 대시보드 조회 실패 시 인라인 에러 + [다시 시도] 버튼 표시

### 대시보드 UI
- [ ] `src/pages/Dashboard.tsx` — Placeholder 교체 완료
- [ ] 인사말 영역: Asia/Seoul 기준 시간대별 인사 + 날짜 표시
- [ ] 빠른 작업 카드 2개: 새 발주 작업 시작 + 운송장 매칭 시작
- [ ] QuickAction 카드는 `<button>` 또는 `<Link>`로 키보드 접근 가능
- [ ] 최근 작업건 리스트 (최대 5건, 상태 뱃지, 진행 단계, 프로그레스 바)
- [ ] 최근 작업건 row도 `<Link>` 또는 `<button>` (키보드 접근 가능)
- [ ] 작업건 없을 때 EmptyState + [새 발주 작업 시작] 버튼
- [ ] 하단 바로가기 3개 (매핑 관리, 양식 관리, 공급처 관리) + 건수 표시
- [ ] 시안 디자인 재현 (home.css/jsx 참조)
- [ ] 로딩 상태 처리 (스켈레톤 또는 LoadingSpinner)

### 작업건 유틸 + 네비게이션
- [ ] `src/utils/workSession.ts` — `getDefaultWorkSessionName`, `getSessionProgress`, `getSessionEntryPath` 존재
- [ ] 작업건 기본 이름 생성은 Asia/Seoul 기준 공통 유틸 재사용 (중복 구현 금지)
- [ ] 최근 작업건 클릭 시 상태와 진행 단계에 맞는 페이지로 이동:
  - active + 주문 없음 → 주문 업로드
  - active + 주문 있음 + 배정 없음 → 공급처 배정
  - active + 배정 있음 → 발주서 다운로드
  - ordered + 운송장 없음 → 운송장 업로드
  - ordered + 운송장 매칭됨 → 다운로드
  - completed → 운송장 다운로드
- [ ] `src/components/work-session/CreateWorkSessionDialog.tsx` — Dashboard와 WorkSessionSelector에서 재사용

### 다크모드
- [ ] `src/components/theme-provider.tsx` — 커스텀 ThemeProvider (Vite SPA 방식, next-themes 미사용)
- [ ] `src/components/ModeToggle.tsx` — DropdownMenu로 시스템/라이트/다크 명시적 선택
- [ ] 현재 선택된 테마 표시 (체크 또는 하이라이트)
- [ ] `App.tsx`에 `ThemeProvider` 래핑 (`defaultTheme="system"`, `storageKey="withlab-theme"`)
- [ ] `src/index.css`에 `.dark` 선택자 — semantic token 중심 다크 테마 토큰 정의
- [ ] `bg-white`, `text-gray-*` 등 하드코딩 색상 class 제거 또는 최소화
- [ ] 라이트/다크/시스템 모든 모드에서 UI 깨짐 없음
- [ ] 로그인 페이지 다크모드 적용
- [ ] `docs/REF_디자인_시스템.md`에 light/dark semantic token 매핑 표 추가

### Vercel 배포
- [ ] `vercel.json` 존재 (`/:path*` → `/index.html` rewrite)
- [ ] 직접 URL 새로고침 시 404 없음 (Vercel Preview에서 검증)
- [ ] README.md에 배포 가이드 포함
- [ ] 실제 운영 배포 전 Vercel 플랜 정책 검토

### Supabase 운영
- [ ] Supabase Auth Site URL / Redirect URLs에 운영 도메인 반영
- [ ] Supabase Storage 템플릿 업로드/다운로드 운영 환경에서 검증
- [ ] Phase 6 DB View 생성 완료

### 문서
- [ ] `docs/USER_GUIDE.md` 작성 완료 (매일 운영 순서 요약 포함)
- [ ] `README.md` 업데이트 (배포 URL, 사용 가이드 링크, 문서 구분)
- [ ] 수동 E2E 체크리스트에 각 단계별 기대값 포함
- [ ] 테스트 파일명이 실제 파일명과 일치

### 빌드 / 린트 / 테스트
- [ ] `npm run build` 성공
- [ ] `npm run typecheck` 성공
- [ ] `npm run lint` 에러 없음
- [ ] `npm run test:run` 전체 통과

### 배포 후
- [ ] Vercel Preview/Production Smoke Test 통과

---

## 프로젝트 범위 외 (향후 확장 가능)

- ❌ 자동화된 E2E 테스트 (Playwright, Cypress 등)
- ❌ 대시보드 실시간 업데이트 (Supabase Realtime 구독)
- ❌ 대시보드 차트/그래프 (매출, 주문 추이 등)
- ❌ 알림 시스템 (이메일, 푸시 등)
- ❌ 모바일 반응형 (PC Chrome 전용)
- ❌ 사용자 관리 페이지 (계정 추가/삭제 — Supabase 대시보드에서 직접)
- ❌ 작업건 삭제 기능
- ❌ 데이터 백업/복원 기능
