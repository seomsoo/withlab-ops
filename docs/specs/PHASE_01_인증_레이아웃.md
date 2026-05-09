# Phase 1: 인증 + 레이아웃

## 목표
Supabase Auth 기반 로그인, 사이드바 레이아웃, React Router 라우팅, 인증 가드, Toast/ErrorBoundary, 공통 UI 컴포넌트를 구현하여 이후 Phase에서 페이지를 채워넣을 수 있는 앱 셸(App Shell)을 완성한다.

> ⚠️ Phase 1부터 모든 UI는 `docs/REF_디자인_시스템.md`를 단일 진실 공급원으로 삼는다.
> `docs/design/` 시안 파일은 **디자인(색상, 간격, 스타일)의 참조**로만 사용한다.
> 구조, 메뉴 구성, 라우팅, 기능 범위는 **스펙 문서가 우선**이며 시안과 다를 경우 스펙을 따른다.

---

## 선행 조건
- Phase 0 ✅ 검증 통과
- 디자인 시스템 추출 ✅ 완료 (`docs/REF_디자인_시스템.md` 존재, `src/index.css` 토큰 교체됨)

---

## 디자인 토큰 사용 원칙

구현 코드에서 사용하는 모든 색상, 배경, 보더, 그림자, 간격, radius, font 값은 `docs/REF_디자인_시스템.md`의 토큰명을 기준으로 한다.

시안 또는 본 스펙에 등장하는 raw color 값(`#3182F6`, `#F7F8FA` 등)은 **참고값**이며, 실제 구현에서는 대응되는 CSS 변수(`var(--color-primary)` 등)를 사용한다.

Logo SVG도 색상을 하드코딩하지 않고 `currentColor` 또는 CSS variable 기반으로 구현한다:
```tsx
<svg className="text-primary" viewBox="0 0 24 24">
  <path d="M3 6c4 0 4 12 8 12s4-12 8-12" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
  <circle cx="20" cy="5" r="2" fill="currentColor"/>
</svg>
```

---

## 시안 참조 가이드

Phase 1에서 디자인 참조할 시안 파일:

| 구현 대상 | 참조 시안 파일 | 참조 범위 |
|----------|--------------|----------|
| 로그인 | `docs/design/login.css`, `docs/design/login.jsx` | 카드 레이아웃, 입력 필드 스타일, 블롭 배경, 간격/그림자 |
| 사이드바 | `docs/design/styles.css`, `docs/design/home.jsx` | 사이드바 너비, 브랜드 영역, 메뉴 아이템 스타일, 하단 사용자 영역 |
| TopBar | `docs/design/styles.css`, `docs/design/home.jsx` | 높이, 배경, 보더, 좌우 레이아웃 |

> **주의**: 시안의 메뉴 구조(5개)와 스펙의 메뉴 구조(9개)가 다름. **스펙 기준 9개 메뉴**를 시안의 디자인 스타일로 그린다.

---

## 작업 목록

### 1-1. 웹폰트 적용

`index.html`에 CDN 추가:
```html
<link rel="preconnect" href="https://cdn.jsdelivr.net" />
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/jetbrains-mono@1.0.6/css/jetbrains-mono.css" />
```

body 기본 스타일 (`src/index.css`):
```css
body {
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
  color: var(--color-t-strong);
  background: var(--color-bg);
}
```

---

### 1-2. WithLab 로고 컴포넌트

`src/components/ui/Logo.tsx`:

시안에서 공통 사용되는 SVG 로고를 재사용 가능한 컴포넌트로 추출.

```ts
type LogoProps = {
  size?: 'sm' | 'md'           // sm=22px(사이드바), md=28px(로그인)
  showText?: boolean            // "WithLab" 텍스트 포함
  showSub?: boolean             // 부제 포함
  subText?: string              // 기본값 "과일 발주 관리 시스템"
}
```

SVG 색상은 `currentColor` 사용. 부모에서 `className="text-primary"` 등으로 제어.

---

### 1-3. AuthProvider + useAuth 훅

`src/hooks/useAuth.tsx`:

```ts
type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}
```

**AuthProvider 책임:**
- `user`, `loading` 상태 보관
- `supabase.auth.getSession()` → 초기 세션 복원
- `supabase.auth.onAuthStateChange()` 구독 + cleanup
- `signIn`, `signOut` 함수 제공

**중요: AuthProvider는 `loading` 중에도 `children`을 렌더링한다.**
인증 로딩 화면은 `ProtectedRoute` / `PublicRoute`에서 처리.

```tsx
// ✅ 올바름
<AuthContext.Provider value={value}>
  {children}
</AuthContext.Provider>

// ❌ 금지 — AuthProvider 내부에서 로딩 차단하지 않음
if (loading) return <LoadingSpinner />
```

`signOut()`은 Supabase 세션 해제만 담당. 라우팅 이동은 호출하는 쪽에서 처리.

에러 메시지:
| Supabase 에러 | 한국어 |
|--------------|--------|
| `Invalid login credentials` | `이메일 또는 비밀번호가 올바르지 않습니다` |
| 기타 | `로그인 중 오류가 발생했습니다` |

---

### 1-4. 로그인 페이지

`src/pages/Login.tsx`

> **디자인 참조**: `docs/design/login.css` + `docs/design/login.jsx`의 스타일을 재현.
> **기능은 스펙 기준**: SSO 버튼, 비밀번호 찾기 링크, 계정 문의 링크 등 시안에만 있는 요소는 **제외**.

**레이아웃** (시안 `loginpage` 디자인):
- 사이드바 없음, `min-height: 100vh`, flex center
- 배경: `var(--color-bg)`
- 블루 블롭 2개:
  - 블롭1: `480×480px`, `top:-160px left:-120px`, `blur(80px) opacity(0.5)`
  - 블롭2: `380×380px`, `bottom:-140px right:-80px`, `blur(80px) opacity(0.5)`

**카드** (시안 `logincard` 디자인):
- `max-width: 420px`, padding `36px 36px 32px`
- 배경 white, border `1px solid var(--color-line)`, radius `var(--radius-xl)`
- shadow: 로그인 전용값 (`REF_디자인_시스템.md` §5 참조)

**카드 내부 구성:**
1. **브랜드**: Logo 컴포넌트 (md) + 부제
2. **이메일 입력**: 라벨 + Mail 아이콘 + input (48px, radius 12px)
3. **비밀번호 입력**: 라벨 + Lock 아이콘 + input + Eye/EyeOff 토글 (`aria-label` 필수)
4. **에러 메시지 영역**: `role="alert"`, 버튼 위에 표시
5. **[로그인] 버튼**: 풀 너비, 50px, radius 12px, primary 색상

**폼 구현:**
- `<form onSubmit={handleSubmit}>` 구조, Enter 키 제출 가능
- `email`: `type="email"`, `autoComplete="email"`, 제출 시 `trim()`
- `password`: `type="password"`, `autoComplete="current-password"`, trim **하지 않음**
- 이메일 또는 비밀번호가 비어 있으면 → 버튼 disabled
- 비밀번호 최소 길이는 클라이언트에서 강제하지 않음 (서버 인증 결과 기준)
- Supabase 원문 에러는 `console.error`로만 남기고, 사용자에게는 한국어 메시지만 표시

**포커스 스타일** (시안 `lfield__ipt:focus-within`):
- 배경 → white, border → `var(--color-primary)`, box-shadow `0 0 0 4px rgba(49,130,246,.12)`

**동작:**
- 로그인 중: 버튼에 로딩 스피너 + disabled
- 성공 → `state.from?.pathname ?? '/'` 로 replace 이동
- 실패 → 인라인 에러 메시지
- 이미 로그인 → `/` 자동 리다이렉트

---

### 1-5. AppLayout

`src/components/layout/AppLayout.tsx`

**구조:**
```
┌──────────┬────────────────────────────────────┐
│ Sidebar  │  TopBar (64px, sticky)             │
│ (240px)  ├────────────────────────────────────┤
│ sticky   │  Main Content                      │
│ 100vh    │  max-width 1200px, 중앙정렬        │
│ white bg │  padding 32px 40px                 │
└──────────┴────────────────────────────────────┘
```

- 전체: `grid-template-columns: 240px 1fr`
- 사이드바: `position: sticky`, `top: 0`, `height: 100vh`, 배경 white, 우측 border
- 메인: `<Outlet />` 렌더링
- 콘텐츠: `max-width: 1200px`, `margin: 0 auto`, padding `32px 40px`

---

### 1-6. Sidebar

`src/components/layout/Sidebar.tsx`

> **디자인 참조**: `docs/design/styles.css`의 `.sidebar*` 스타일 재현.
> **메뉴 구조**: 스펙 기준 9개 항목 + 2개 섹션 라벨.

**구조:**

1. **브랜드** (시안 `sidebar__brand` 디자인):
   - Logo (sm, 22px) + "WithLab" + "과일 발주 시스템"
   - padding `20px 16px`

2. **네비게이션** (스펙 기준 메뉴, 시안 스타일 적용):

```
[LayoutDashboard] 대시보드        → /

── 주문 관리 ──────── (섹션 라벨, caption-sm, --t-faint)
[FileText]  발주서                → /orders
[Truck]     운송장                → /tracking

── 설정 ──────────── (섹션 라벨)
[Building2]        공급처 관리     → /mapping/suppliers
[ArrowLeftRight]   품목 매핑       → /mapping/products
[Replace]          상품명 변환     → /mapping/names
[Package]          택배사 매핑     → /mapping/couriers
[FileSpreadsheet]  발주서 양식     → /settings/supplier-template
[FileUp]           운송장 양식     → /settings/platform-template
```

**아이콘**: Lucide React, 20px

**활성 경로 판별:**
```ts
function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
```

**스타일** (시안 `nav__item` 디자인):
- padding `10px 12px`, radius `10px`, gap `12px`
- 기본: color `var(--color-t-mid)`, weight 500
- hover: 배경 `var(--color-gray-200)`, color `var(--color-t-strong)`
- 활성: 배경 `var(--color-primary-50)`, color `var(--color-primary)`, weight 600

3. **하단 사용자 영역** (시안 `sidebar__foot` 디자인):
   - 아바타: 32px 원, 배경 `var(--color-primary-50)`, 텍스트 `var(--color-primary)`, 이메일 첫 글자
   - 이름: `user.email` 앞부분 (13px/600)
   - 역할: "운영팀" (11px, `var(--color-t-mute)`)
   - 클릭 → DropdownMenu: [로그아웃] → `await signOut()` 후 `navigate('/login', { replace: true })`

---

### 1-7. TopBar

`src/components/layout/TopBar.tsx`

- 높이 `64px`, sticky, `top: 0`, `z-index: 10`
- 배경 white, 하단 border `var(--color-line)`
- **좌측**: 현재 페이지 제목 (16px/700)
- **우측**: Phase 1에서는 비워둠

페이지 제목: 라우트 경로 기반 매핑
```ts
const ROUTE_TITLES: Record<string, string> = {
  '/': '홈',
  '/orders': '발주서',
  '/tracking': '운송장',
  '/mapping/suppliers': '공급처 관리',
  '/mapping/products': '품목 매핑',
  '/mapping/names': '상품명 변환',
  '/mapping/couriers': '택배사 매핑',
  '/settings/supplier-template': '발주서 양식',
  '/settings/platform-template': '운송장 양식',
}

const title = ROUTE_TITLES[pathname] ?? 'WithLab'
```

---

### 1-8. React Router 라우팅

라우팅은 `src/AppRoutes.tsx`로 분리. `App.tsx`는 provider 조립만 담당.

`src/AppRoutes.tsx`:
```tsx
<Routes>
  <Route element={<PublicRoute />}>
    <Route path="/login" element={<Login />} />
  </Route>

  <Route element={<ProtectedRoute />}>
    <Route element={<AppLayout />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/tracking" element={<Tracking />} />

      <Route path="/mapping" element={<Navigate to="/mapping/suppliers" replace />} />
      <Route path="/mapping/suppliers" element={<SupplierManage />} />
      <Route path="/mapping/products" element={<ProductMapping />} />
      <Route path="/mapping/names" element={<NameMapping />} />
      <Route path="/mapping/couriers" element={<CourierMapping />} />

      <Route path="/settings" element={<Navigate to="/settings/supplier-template" replace />} />
      <Route path="/settings/supplier-template" element={<SupplierTemplate />} />
      <Route path="/settings/platform-template" element={<PlatformTemplate />} />
    </Route>
  </Route>

  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

---

### 1-9. ProtectedRoute / PublicRoute

`src/components/layout/ProtectedRoute.tsx`:
- `loading` → 전체 화면 로딩 스피너
- `user` 없음 → `<Navigate to="/login" replace state={{ from: location }} />`
- `user` 있음 → `<Outlet />`

> `state.from`에 현재 경로를 저장하여 로그인 후 원래 경로로 복귀할 수 있게 한다.

`src/components/layout/PublicRoute.tsx`:
- `loading` → 전체 화면 로딩 스피너
- `user` 있음 → `<Navigate to="/" replace />`
- `user` 없음 → `<Outlet />`

---

### 1-10. Toast 시스템

shadcn/ui sonner 컴포넌트 사용.

```bash
npx shadcn@latest add sonner
```

```tsx
import { Toaster } from '@/components/ui/sonner'
```

Toaster는 **AuthProvider 밖에** 배치하여 loading 상태와 무관하게 항상 렌더링:
```tsx
// App.tsx
<ErrorBoundary>
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
    <Toaster position="top-right" duration={3000} />
  </BrowserRouter>
</ErrorBoundary>
```

---

### 1-11. ErrorBoundary

`src/components/ErrorBoundary.tsx`:

class component 기반 Error Boundary.

**처리 범위:**
- 렌더링 중 발생한 React 오류, 생명주기/하위 컴포넌트 렌더링 오류

**처리하지 않는 범위:**
- 비동기 함수 오류, 이벤트 핸들러 오류, Supabase API 오류, 파일 파싱 오류
- → 이들은 각 함수의 `try-catch` + `toast.error()`로 처리

**에러 시 UI:** 카드 중앙 + "오류가 발생했습니다" + 에러 메시지
- `[새로고침]`: `window.location.reload()`
- `[홈으로]`: `window.location.href = '/'`

---

### 1-12. 공통 UI 컴포넌트

#### shadcn/ui 추가
```bash
npx shadcn@latest add button input label dialog dropdown-menu separator sonner
```

#### 직접 작성

**`PageHeader.tsx`**:
```ts
type PageHeaderProps = {
  title: string
  description?: string
  actions?: React.ReactNode   // 우측 액션 영역
}
```

**`StatusBadge.tsx`**:
```ts
type StatusBadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'pending' | 'muted'
type StatusBadgeProps = {
  variant?: StatusBadgeVariant
  children: React.ReactNode
}
```
`REF_디자인_시스템.md` §7 Badge 패턴 참조.

**`EmptyState.tsx`**:
```ts
type EmptyStateProps = {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode   // 버튼 등 액션 요소
}
```

**`LoadingSpinner.tsx`**:
```ts
type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg'   // 16px / 24px / 32px
  label?: string               // 스크린 리더용
}
```

**`FileUpload.tsx`**:
```ts
type FileUploadProps = {
  accept?: string              // 기본값 '.xlsx,.xls'
  maxSizeMb?: number           // 기본값 10
  disabled?: boolean
  onFileSelect: (file: File) => void
}
```
FileUpload은 파일 선택/드래그앤드롭 UI만 담당. 파일 확장자/크기 검증은 `src/utils/file.ts`의 `validateExcelFile()` 사용. 엑셀 파싱, Storage 업로드, 도메인 검증은 수행하지 않음.

시안 `docs/design/styles.css`의 `.dropzone*` 디자인 참조.

**`ConfirmDialog.tsx`**:
```ts
type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmText?: string        // 기본값 '확인'
  cancelText?: string         // 기본값 '취소'
  variant?: 'default' | 'destructive'
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onOpenChange: (open: boolean) => void
}
```

---

### 1-13. Placeholder 페이지 9개

| 파일 | 제목 | EmptyState 메시지 |
|------|------|------------------|
| `pages/Dashboard.tsx` | 대시보드 | Phase 6에서 구현됩니다 |
| `pages/orders/Orders.tsx` | 발주서 | Phase 3에서 구현됩니다 |
| `pages/tracking/Tracking.tsx` | 운송장 | Phase 5에서 구현됩니다 |
| `pages/mapping/SupplierManage.tsx` | 공급처 관리 | Phase 2에서 구현됩니다 |
| `pages/mapping/ProductMapping.tsx` | 품목↔공급처 매핑 | Phase 2에서 구현됩니다 |
| `pages/mapping/NameMapping.tsx` | 상품명 변환 매핑 | Phase 2에서 구현됩니다 |
| `pages/mapping/CourierMapping.tsx` | 택배사 매핑 | Phase 2에서 구현됩니다 |
| `pages/settings/SupplierTemplate.tsx` | 발주서 양식 관리 | Phase 4에서 구현됩니다 |
| `pages/settings/PlatformTemplate.tsx` | 운송장 양식 관리 | Phase 5에서 구현됩니다 |

각 Placeholder: `PageHeader` + `EmptyState` 구성.

---

### 1-14. 앱 진입점

`src/App.tsx` — provider 조립만 담당:
```tsx
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
        <Toaster position="top-right" duration={3000} />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
```

`src/AppRoutes.tsx` — 라우팅 정의.

---

## 완료 기준

### 인증
- [ ] `AuthProvider` 적용, `useAuth()` 훅 동작
- [ ] AuthProvider는 loading 중에도 children 렌더링
- [ ] 인증 loading 화면은 ProtectedRoute/PublicRoute에서 처리
- [ ] 세션 복원(`getSession`), 구독(`onAuthStateChange`), cleanup
- [ ] signIn 실패 시 한국어 에러 메시지
- [ ] signOut → Supabase 세션 해제만 (라우팅은 호출 측)

### 로그인 페이지
- [ ] 시안 디자인 재현 (블롭 배경, 카드, 입력필드, 포커스링)
- [ ] SSO/비밀번호찾기 등 시안 전용 요소 제외
- [ ] `<form onSubmit>` 구조, Enter 키 제출 가능
- [ ] email: `type="email"`, `autoComplete="email"`, 제출 시 trim
- [ ] password: `type="password"`, `autoComplete="current-password"`, trim 하지 않음
- [ ] 비밀번호 최소 길이는 클라이언트에서 강제하지 않음
- [ ] 비밀번호 보기/숨기기 버튼에 `aria-label` 적용
- [ ] 에러 메시지 영역에 `role="alert"` 적용
- [ ] disabled/로딩/에러/리다이렉트 동작
- [ ] 로그인 성공 → `state.from?.pathname ?? '/'`로 replace 이동

### 레이아웃
- [ ] 사이드바 240px + 메인 그리드, 시안 디자인 재현
- [ ] TopBar 64px, 라우트 기반 페이지 제목
- [ ] 콘텐츠 max-width 1200px, padding 32px 40px

### 사이드바 (스펙 기준 9개 메뉴)
- [ ] 9개 메뉴 + 2개 섹션 라벨("주문 관리", "설정"), Lucide 아이콘
- [ ] 활성 경로: exact match + 하위 경로 prefix (`isActivePath` 규칙)
- [ ] 하단 사용자 + 로그아웃 드롭다운 (로그아웃 → `/login` replace)

### 라우팅
- [ ] AppRoutes는 `src/AppRoutes.tsx`로 분리
- [ ] ProtectedRoute: 미인증 → `/login` (state.from 저장)
- [ ] PublicRoute: 인증 → `/`
- [ ] `/mapping` → `/mapping/suppliers`, `/settings` → `/settings/supplier-template` 리다이렉트
- [ ] 404 → `/` 리다이렉트

### Toast / ErrorBoundary
- [ ] Toaster는 AuthProvider 밖에 배치 (loading 무관 렌더링)
- [ ] shadcn/ui sonner 사용 (`@/components/ui/sonner`)
- [ ] ErrorBoundary: 렌더링 오류 전용, async 오류는 try-catch + toast

### 디자인 토큰
- [ ] `REF_디자인_시스템.md`의 토큰명과 구현 코드 토큰명 일치
- [ ] raw color 값을 직접 사용하지 않고 CSS 변수로 치환
- [ ] Logo SVG는 `currentColor` 사용

### 공통 UI
- [ ] Logo, PageHeader, StatusBadge, EmptyState, LoadingSpinner, FileUpload, ConfirmDialog
- [ ] 각 컴포넌트 props 타입 명시
- [ ] FileUpload은 `validateExcelFile()` 사용, 파싱/업로드 수행하지 않음
- [ ] shadcn/ui: button, input, label, dialog, dropdown-menu, separator, sonner

### Placeholder
- [ ] 9개 페이지, 라우팅 접근 가능

### 빌드
- [ ] build, typecheck, lint, test:run 통과
- [ ] 콘솔 에러 없음

---

## 참조 문서

| 문서 | 용도 |
|------|------|
| `docs/REF_디자인_시스템.md` | 토큰/패턴 — 최우선 |
| `docs/design/login.css` | 로그인 디자인 |
| `docs/design/login.jsx` | 로그인 디자인 |
| `docs/design/styles.css` | 공통 레이아웃 디자인 |
| `docs/design/home.jsx` | 사이드바/TopBar 디자인 |
| `src/hooks/CLAUDE.md` | 훅 규칙 |
| `src/pages/CLAUDE.md` | 페이지 규칙 |
| `src/components/CLAUDE.md` | 컴포넌트 규칙 |

---

## 산출물

아래 파일을 포함한다. shadcn/ui 생성 파일 수는 CLI 버전과 설정에 따라 달라질 수 있으므로 정확한 파일 개수는 완료 기준으로 삼지 않는다.

```
src/
├── App.tsx                              # [수정] provider 조립
├── AppRoutes.tsx                        # [신규] 라우팅 분리
├── index.css                            # [수정] body 스타일
├── components/
│   ├── ErrorBoundary.tsx                # [신규]
│   ├── layout/
│   │   ├── AppLayout.tsx                # [신규]
│   │   ├── Sidebar.tsx                  # [신규]
│   │   ├── TopBar.tsx                   # [신규]
│   │   ├── ProtectedRoute.tsx           # [신규]
│   │   └── PublicRoute.tsx              # [신규]
│   └── ui/
│       ├── Logo.tsx                     # [신규]
│       ├── PageHeader.tsx               # [신규]
│       ├── StatusBadge.tsx              # [신규]
│       ├── EmptyState.tsx               # [신규]
│       ├── LoadingSpinner.tsx           # [신규]
│       ├── FileUpload.tsx               # [신규]
│       ├── ConfirmDialog.tsx            # [신규]
│       └── (shadcn/ui 생성 파일들)      # [추가]
├── hooks/useAuth.tsx                    # [신규]
├── pages/
│   ├── Login.tsx                        # [신규]
│   ├── Dashboard.tsx                    # [신규] Placeholder
│   ├── orders/Orders.tsx                # [신규] Placeholder
│   ├── tracking/Tracking.tsx            # [신규] Placeholder
│   ├── mapping/
│   │   ├── SupplierManage.tsx           # [신규] Placeholder
│   │   ├── ProductMapping.tsx           # [신규] Placeholder
│   │   ├── NameMapping.tsx              # [신규] Placeholder
│   │   └── CourierMapping.tsx           # [신규] Placeholder
│   └── settings/
│       ├── SupplierTemplate.tsx         # [신규] Placeholder
│       └── PlatformTemplate.tsx         # [신규] Placeholder
```
