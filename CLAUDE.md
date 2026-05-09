# WithLab 과일 발주 관리 시스템

## 프로젝트 요약

쿠팡/토스 플랫폼에서 발생하는 과일 주문을 업로드하여, 품목별·공급처별로 주문을 분류하고, 각 공급처에 전달할 발주서 엑셀을 자동 생성하는 내부 관리자 시스템.
발주 후 공급처에서 받은 운송장을 각 플랫폼 양식에 맞춰 자동 매칭하는 기능도 포함.

- **사용자**: 관리자 + 직원 1~2명 (계정 공유)
- **환경**: PC Chrome 전용, 매일 아침 9시 작업
- **운영비**: 0원 (Supabase + Vercel 무료 플랜)

---

## 기술 스택

| 구분 | 기술 | 버전/비고 |
|------|------|----------|
| 프레임워크 | React + TypeScript | React 19 (Vite 최신 템플릿 기준), strict mode |
| 런타임 | Node.js | 20 이상 (`.nvmrc` + `engines.node` 고정) |
| 빌드 | Vite | 최신 |
| UI | Tailwind CSS + shadcn/ui | Tailwind v4 (@tailwindcss/vite) |
| 상태관리 | React 기본 (useState/useContext) | 복잡한 경우에만 Zustand |
| 데이터 검증 | Zod | 모든 외부 데이터 경계에서 사용 |
| 백엔드/DB | Supabase | Auth + PostgreSQL + Storage + RLS |
| 엑셀 읽기 | SheetJS (xlsx) | 읽기 전용 — 생성에 사용 금지 |
| 엑셀 생성 | ExcelJS | 템플릿 기반 쓰기 전용 |
| 테스트 | Vitest | 파서, 매칭엔진 등 핵심 로직만 |
| 알림 | Sonner | toast 알림 |
| 아이콘 | Lucide React | |
| 배포 | Vercel | 무료 플랜 |

---

## 핵심 비즈니스 규칙

> 아래 규칙은 코드 전체에서 예외 없이 지켜야 한다. 위반 시 데이터 정합성이 깨진다.

### 수량 분배
- **한 주문 라인 = 한 공급처만 배정** (수량 분할 절대 금지)
- DB `allocations` 테이블에 `unique(order_id)` 제약으로 강제
- 같은 품목의 여러 주문 라인을 공급처별로 나누는 것은 허용 (주문 라인 단위 배분)

### 매칭키 (운송장 매칭 기준)
- **쿠팡**: `matchingKey = 주문번호` (쿠팡은 상품마다 주문번호가 따로 발급)
- **토스**: `matchingKey = 주문상품번호` (토스는 1주문에 여러 상품 → 주문번호만으로 구분 불가)
- 이 규칙은 파서, 매칭엔진, 발주서 생성, 운송장 출력 모든 경로에서 동일해야 함

### 엑셀 생성
- **새 워크북 생성 금지** — 반드시 Supabase Storage에서 업로드된 빈 양식 템플릿을 로드
- 템플릿의 헤더/서식을 그대로 유지하고 데이터 행만 채워 넣음
- **컬럼 매핑은 인덱스(위치) 기반** — 컬럼명으로 검색 금지 (B업체 양식에 빈/중복 컬럼 존재)

### 전화번호
- **저장 시**: 플랫폼 원본 그대로 보존 (하이픈 포함 여부 무관)
- **출력 시점에만** 포맷 변환 (raw/hyphen/digits), SupplierTemplate.columnMappings.format 기준

### 토스 엑셀 구조
- 1행: 안내문구 → 스킵
- 2행: 그룹 헤더 → 스킵
- 3행: **진짜 컬럼 헤더**
- 4행: "수정 가능/불가" 표시 → 스킵
- 5행부터: **실제 데이터**

### 기타 규칙
- **보내는분 정보**: 발주서에서 항상 빈 칸
- **중복 주문 감지**: `platform + matchingKey` 기준, DB unique 제약으로 강제
- **재업로드**: 같은 work_session + 같은 platform → 기존 데이터 cascade 삭제 후 새로 생성 (확인 모달 필수)
- **상품명 특수문자**: 이모지(❤️, ◆, ☆ 등) 포함 가능 → 매핑 시 정규화 고려
- **택배사 변환**: Tracking에는 공급처 원본명만 저장, 플랫폼 출력 시점에 CourierMapping으로 변환
- **토스 운송장 출력 시**: 주문상태 컬럼을 "배송중"으로 변경

---

## 프로젝트 구조

```
withlab/
├── CLAUDE.md                        # 프로젝트 루트 컨텍스트
├── .claude/commands/                # Claude Code 슬래시 커맨드
├── docs/
│   ├── STATUS.md                    # 현재 단계 추적 (자동 갱신)
│   ├── REF_데이터_모델.md            # 도메인 타입 정의 근거
│   ├── REF_엑셀_구조.md             # 실제 엑셀 파일 분석 결과
│   ├── REF_DB_스키마.md             # SQL 마이그레이션 + 제약조건
│   └── specs/                       # Phase별 스펙 + 검증 결과
│       ├── PHASE_00_프로젝트_셋업.md
│       ├── PHASE_00-verify.md       # verify 커맨드가 생성
│       └── ...
├── src/
│   ├── components/
│   │   ├── ui/                      # shadcn/ui 컴포넌트
│   │   └── layout/                  # AppLayout, Sidebar, PageHeader
│   ├── pages/
│   │   ├── orders/                  # 발주서 (업로드 → 배정 → 다운로드)
│   │   ├── tracking/                # 운송장 (업로드 → 매칭 → 출력)
│   │   ├── mapping/                 # 매핑 관리 (공급처, 품목, 상품명, 택배사)
│   │   └── settings/                # 양식 관리 (발주서 템플릿, 운송장 템플릿)
│   ├── lib/
│   │   ├── parsers/                 # 엑셀 파싱 (쿠팡, 토스, 운송장)
│   │   ├── matching/                # 운송장 매칭 엔진
│   │   ├── generators/              # 엑셀 생성 (발주서, 운송장)
│   │   ├── schemas/                 # Zod 스키마 + DB row 변환
│   │   ├── supabase/                # Supabase 클라이언트 + API 함수
│   │   └── utils.ts                 # cn() (clsx + tailwind-merge)
│   ├── hooks/                       # useAuth, useSuppliers, useWorkSession 등
│   ├── types/                       # TypeScript 도메인 타입
│   └── utils/                       # phone.ts, excel.ts
├── .env.example
├── .prettierrc
└── vitest.config.ts
```

---

## 코딩 컨벤션

### TypeScript
- **strict mode 필수**: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitReturns: true`
- `any` 사용 금지. 불가피한 경우 `unknown` + 타입 가드 또는 Zod 파싱
- 타입 단언 (`as`) 최소화. 사용 시 `// as 사용 사유: ...` 주석 필수
- 유니온 리터럴 사용 (`"coupang" | "toss"`), enum 사용 금지
- `type` 사용 (`interface` 아님 — 프로젝트 전체 일관성)

### 네이밍
- **파일**: 컴포넌트 `PascalCase.tsx`, 로직/유틸 `camelCase.ts`, 타입 전용 `camelCase.ts`
- **변수/함수**: `camelCase`
- **타입**: `PascalCase`
- **상수**: `UPPER_SNAKE_CASE` (매직 넘버 인라인 금지, 상수로 추출)
- **DB 컬럼**: `snake_case` (Supabase 기본)
- **TS 필드**: `camelCase` → `src/lib/supabase/` 안에서 변환 함수 필수

### import 순서
```ts
// 1. React / 외부 라이브러리
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// 2. 내부 lib / hooks / utils (@ alias)
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

// 3. 컴포넌트
import { Button } from '@/components/ui/Button'

// 4. 타입 (type-only import)
import type { Supplier } from '@/types'
```

### 컴포넌트 패턴
- 페이지 컴포넌트: `export default function PageName()`
- 공통 컴포넌트: `export function ComponentName()` (named export)
- Props: 타입을 컴포넌트 바로 위에 정의
```ts
type SupplierCardProps = {
  supplier: Supplier
  onEdit: (id: string) => void
}

export function SupplierCard({ supplier, onEdit }: SupplierCardProps) { ... }
```

### 비동기 처리
- `async/await` 사용 (`.then()` 체이닝 금지)
- 모든 비동기 호출에 try-catch + toast 알림
```ts
try {
  const result = await createSupplier(form)
  toast.success('공급처를 추가했습니다')
} catch (err) {
  console.error('공급처 추가 실패:', err)
  toast.error(err instanceof Error ? err.message : '오류가 발생했습니다')
}
```

### Supabase 호출
- 컴포넌트에서 `supabase` 직접 import 금지
- 반드시 `src/lib/supabase/` 안의 API 함수를 통해 호출
- 또는 커스텀 훅(`src/hooks/`)을 경유
- API 함수 안에서 snake_case → camelCase 변환 처리

### Prettier
```json
{ "semi": false, "singleQuote": true, "tabWidth": 2, "trailingComma": "es5" }
```

### 주석
- 함수 상단에 `/** JSDoc */` — 복잡한 비즈니스 로직 또는 비직관적인 코드에만
- `// TODO: 스펙 확인 필요 — [사유]` — 스펙과 충돌하는 판단이 필요한 경우
- `// HACK:` — 임시 해결책, 반드시 이유와 개선 계획 기술
- 자명한 코드에 불필요한 주석 금지

### 파일 업로드 검증
- 허용 확장자: `.xlsx`, `.xls`
- 최대 크기: 10MB
- MIME 타입 체크: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` 등

---

## Git 규칙

### 브랜치 전략
- **`main`**: 항상 배포 가능한 상태. 검증 통과한 코드만 머지.
- **`phase/{번호}-{슬러그}`**: Phase 단위 작업 브랜치 (예: `phase/00-setup`, `phase/01-auth-layout`)
- **`feat/{설명}`**: Phase 내부에서 큰 기능을 분리할 때 (예: `feat/coupang-parser`)
- **`fix/{설명}`**: 버그 수정 (예: `fix/toss-matching-key`)
- **`docs/{설명}`**: 문서만 변경 (예: `docs/phase-2-spec`)

브랜치 슬러그는 영문 소문자 + 하이픈 사용. 한글 금지.

### 커밋 메시지 — Conventional Commits

#### 형식
```
<type>(<scope>): <subject>

<body (선택)>

<footer (선택)>
```

#### type
| type | 의미 | 예시 |
|------|------|------|
| `feat` | 새 기능 | `feat(parsers): 쿠팡 주문 엑셀 파서 구현` |
| `fix` | 버그 수정 | `fix(matching): 토스 매칭키를 주문상품번호로 수정` |
| `refactor` | 동작 변경 없는 구조 개선 | `refactor(api): 공급처 API를 도메인별로 분리` |
| `style` | 코드 의미 변화 없는 포맷팅 | `style: prettier 적용` |
| `test` | 테스트 추가/수정 | `test(parsers): 토스 파서 엣지케이스 추가` |
| `docs` | 문서만 변경 | `docs(spec): Phase 2 스펙 작성` |
| `chore` | 빌드, 패키지, 설정 등 기타 | `chore: tailwind v4 업그레이드` |
| `perf` | 성능 개선 | `perf(generators): 발주서 생성 메모리 사용량 개선` |

#### scope (선택)
주요 영역을 괄호로 명시. 생략 가능.
- `parsers`, `matching`, `generators`, `supabase`, `auth`, `ui`
- 페이지명: `orders`, `tracking`, `mapping`, `settings`
- 또는 Phase 번호: `phase-2`

#### subject 규칙
- 한글 사용 OK (팀이 한국어 사용)
- 50자 이내
- 명령형보다는 **현재형 서술**: "추가했음" → "추가" / "추가함"
- 끝에 마침표 없음
- 무엇을 + 왜를 한 줄로

#### body (선택)
- 72자에서 줄바꿈
- "왜" 변경했는지 설명 (코드는 "무엇"을 보여주므로 "왜"가 더 중요)
- 주요 구현 결정 사항 기록

#### footer (선택)
- 이슈 참조: `Refs: #12`, `Closes: #15`
- BREAKING CHANGE 명시: `BREAKING CHANGE: ...`

#### 좋은 예
```
feat(parsers): 토스 주문 엑셀 파서 구현

토스는 1~4행이 메타데이터(안내문구, 그룹헤더, 컬럼헤더, 수정가능여부)이고
5행부터 데이터가 시작됨. 또한 matchingKey는 주문번호가 아닌 주문상품번호를
사용해야 함 (1주문 다상품 케이스 때문).

Refs: docs/REF_엑셀_구조.md#2
```

```
fix(matching): 매칭키 비교 시 공백 무시

공급처가 주문번호 앞뒤에 공백을 넣어 보낸 케이스 발견.
trim() 후 비교하도록 수정.
```

#### 나쁜 예
```
update            ← 무엇을 했는지 모름
수정함.           ← 끝에 마침표, 정보 없음
fix bug           ← 어떤 버그인지 모름
WIP               ← 머지된 커밋에 WIP 금지 (작업 중에만 임시 사용)
```

### 커밋 단위
- **1 커밋 = 1 논리적 변경**. 여러 기능을 한 커밋에 묶지 않는다.
- Phase 단위로 PR을 묶되, **Phase 내부는 작업 단위로 자주 커밋**한다.
- 예: Phase 0에서
  - `chore: vite + react + ts 프로젝트 초기화`
  - `chore: tailwind v4 + 디자인 토큰 설정`
  - `chore: supabase 클라이언트 + 환경변수`
  - `feat(types): 도메인 타입 정의`
  - `feat(schemas): Zod 스키마 정의`
  - `feat(utils): phone, excel 유틸 함수 + 테스트`
  - `chore(db): Supabase 마이그레이션 12테이블`

### PR (Pull Request) 규칙

> 1인 개발이라도 PR을 만드는 이유: 변경 이력 추적, 검증 결과 첨부, 머지 전 셀프 리뷰.

#### PR 단위
- **Phase 단위로 PR 1개**가 기본
- Phase 내에서 큰 기능은 별도 sub-PR로 분리해서 phase 브랜치에 머지 가능

#### PR 제목
`Phase {번호}: {Phase 이름}` 형식
- 예: `Phase 0: 프로젝트 셋업`
- 예: `Phase 3: 주문 업로드 + 파싱`

#### PR 본문 템플릿
```markdown
## 요약
이 Phase에서 무엇을 했는지 3~5줄 요약.

## 산출물
docs/STATUS.md의 해당 Phase 산출물 체크리스트와 동일.
- [x] ...
- [x] ...

## 검증 결과
`/project:verify` 결과: ✅ 통과
- 검증 리포트: docs/specs/PHASE_{번호}-verify.md

## 의사결정
스펙과 다르게 판단한 부분 (있으면):
- ...

## 알려진 이슈
다음 Phase로 미루는 항목 (있으면):
- ...

## 스크린샷
UI 변경이 있는 Phase에만.
```

#### 머지 전 체크리스트 (셀프 리뷰)
- [ ] Codex 코드리뷰 실시 (P1 지적사항 모두 수정)
- [ ] `/project:verify` 종합 판정이 ✅
- [ ] `npm run build` 성공
- [ ] `npm run test -- --run` 모든 테스트 통과
- [ ] PR 본문에 검증 리포트 링크 포함
- [ ] 커밋 메시지가 컨벤션 준수
- [ ] 스코프 크립 없음 (verify 결과 확인)
- [ ] 의사결정 로그가 STATUS.md에 반영됨

### 머지 전략
- **Squash merge** 권장 (1 Phase = 1 커밋으로 main 히스토리 깔끔하게)
- Squash 커밋 메시지는 PR 제목과 동일하게: `Phase 0: 프로젝트 셋업 (#1)`
- 또는 의미 있는 커밋들이 많으면 **rebase merge**로 그대로 보존

### .gitignore 필수 항목
```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
.vercel/
```

`.env.example`은 커밋 (실제 키 없이 키 이름만).

---

## 디자인 시스템

> ⚠️ 본 프로젝트는 **Claude Design으로 시각 디자인을 먼저 만든 뒤, 그 결과로부터 디자인 시스템을 추출**한다.
> 따라서 색상의 정확한 톤, 타이포 스케일, 스페이싱 체계, 컴포넌트 스타일 등 시각적 디테일은 **Phase 0 완료 후 별도 단계에서 정의**한다.
> 그 시점에 `docs/REF_디자인_시스템.md`가 작성되며, 이후 Phase 1부터는 그 문서를 단일 진실 공급원으로 삼는다.

### 지금 단계에서 확정된 것 (Phase 0 임시 토큰의 기준)

#### 브랜드
- **상호**: WithLab
- **방향**: 토스 스타일 미니멀 — 화이트 + 그레이 톤이 지배적, 색상은 의미가 있을 때만 사용
- **타깃 디바이스**: PC Chrome 전용, 1440px 최적 (최소 1024px)
- **폰트**: Pretendard Variable (웹폰트)

#### 의미적 색상 약속 (이후 디자인 단계에서도 의미는 유지, 정확한 톤만 조정)
| 의미 | 임시 값 | 사용 컨텍스트 |
|------|---------|--------------|
| Primary (브랜드) | `#3182F6` (토스 블루) | 메인 액션, 활성 상태, 링크 |
| Success | `#34C759` | matched, 완료, 성공 |
| Error | `#FF3B30` | unmatched, 에러, 필수 |
| Warning | `#FF9500` | pending, 미분류, 경고 |

#### 레이아웃 구조 (기능적 결정 — 디자인 단계에서 변경 없음)
- 좌측 사이드바: 고정 너비 (~240px), 로고 + 메뉴 + 로그아웃
- 메인 콘텐츠: 중앙 정렬, 최대 너비 ~1200px

### Phase 0 단계의 임시 토큰

`src/index.css`의 `@theme` 블록에 위 의미적 색상 + 표준 그레이 스케일(50~900) + 기본 라운딩(6/8/12/16)을 임시로 정의한다.
이는 빌드 통과와 기본 레이아웃 동작 확인용이며, **Claude Design 결과를 받은 뒤 모두 교체된다.**

### 디자인 시스템 추출 단계 (Phase 0 ↔ Phase 1 사이)

```
Phase 0 검증 통과
   ↓
Claude Design으로 핵심 화면 1~2개 시안 생성 (예: 대시보드, 발주서 배정)
   ↓
시안에서 추출:
  - 색상 정확한 hex 값 (그레이 스케일 단계 포함)
  - 타이포그래피 스케일 (h1~h3, body, caption 크기/무게/행간)
  - 스페이싱 체계
  - 라운딩, 그림자 강도
  - 컴포넌트별 className 패턴 (Button, Input, Card, Badge, Modal 등)
   ↓
docs/REF_디자인_시스템.md 작성
   ↓
src/index.css의 @theme 블록 업데이트
   ↓
Phase 1 시작
```

---

## 개발 방법론 — 스펙 기반 단계별 개발

이 프로젝트는 **스펙 문서 기반으로 Phase 단위로 구현하고 검증하는 방식**으로 개발한다.

### 워크플로우
```
1. docs/specs/PHASE_XX_*.md 스펙 문서를 읽는다
2. 관련 REF 문서(docs/REF_*.md)와 폴더별 CLAUDE.md를 참조한다
3. 스펙에 명시된 작업 목록을 순서대로 구현한다
4. Codex 코드리뷰 실행 (/codex:rescue 또는 사용자가 직접)
   → P1/P2 지적사항을 확인하고 수정한다
5. /project:verify 실행
   → 스펙 누락, 스코프 크립, 컨벤션 위반, 빌드 에러를 자동 검증
   → Codex 코드리뷰 결과도 verify 리포트에 포함
   → 결과가 docs/specs/PHASE_XX-verify.md에 저장됨
6. 모든 항목 ✅ 통과할 때까지 수정한다
7. /project:next-phase 실행 → STATUS.md 갱신 → 다음 단계 브리핑
8. 다음 Phase 스펙 문서를 받아서 반복한다
```

### 원칙
- 스펙 문서에 없는 기능은 임의로 추가하지 않는다
- 스펙과 충돌하는 판단이 필요하면 `// TODO: 스펙 확인 필요 — [사유]` 주석을 남기고, `docs/STATUS.md`의 의사결정 로그에도 기록한다
- 각 Phase는 이전 Phase가 검증 통과(✅)된 상태에서만 시작한다
- 구현 중 발견한 이슈는 `docs/STATUS.md`의 알려진 이슈에 기록한다

### 참조 문서
| 문서 | 위치 | 내용 |
|------|------|------|
| 진행 상태 | `docs/STATUS.md` | 현재 단계, 산출물 체크리스트, 의사결정 로그, 이슈 |
| Phase 스펙 | `docs/specs/PHASE_XX_*.md` | 작업 목록, 완료 기준, 검증 방법 |
| 데이터 모델 | `docs/REF_데이터_모델.md` | 전체 도메인 타입 정의와 관계 |
| 엑셀 구조 | `docs/REF_엑셀_구조.md` | 실제 엑셀 파일 분석 (컬럼 인덱스, 샘플 데이터) |
| DB 스키마 | `docs/REF_DB_스키마.md` | SQL 마이그레이션, 제약조건, 인덱스 |
| 폴더별 규칙 | 각 `src/*/CLAUDE.md` | 해당 폴더 작업 시 자동 참조되는 세부 지침 |

### 슬래시 커맨드
| 커맨드 | 설명 |
|--------|------|
| `/project:verify` | 현재 단계 스펙 대비 종합 검증. 결과를 `PHASE_XX-verify.md`에 저장. 복잡한 단계에서는 spec-reviewer 자동 호출 |
| `/project:spec-reviewer` | 스펙 vs 구현 심층 비교 — 데이터 흐름, 엣지케이스, 비즈니스 규칙, 타입 안전성 |
| `/project:next-phase` | 검증 통과 확인 → STATUS.md 갱신 → 다음 단계 브리핑 |
| `/project:check-types` | 타입 정의 ↔ REF 데이터 모델 ↔ DB 스키마 ↔ Zod 스키마 정합성 |
| `/project:check-excel` | 엑셀 파서 출력을 REF 엑셀 구조 및 샘플 파일과 대조 |
| `/project:generate-test` | 현재 단계 스펙에서 Vitest 테스트 케이스 자동 생성 |

---

## 개발 순서 — Phase별 요약

| Phase | 이름 | 핵심 내용 | 선행 조건 |
|-------|------|----------|----------|
| 0 | 프로젝트 셋업 | Vite+React+TS, Tailwind+shadcn, Supabase DB 12테이블, 타입/스키마/유틸 | 없음 |
| 1 | 인증 + 레이아웃 | 로그인, 사이드바, 라우팅 14개, 인증가드, Toast, ErrorBoundary, 공통 UI | Phase 0 |
| 2 | 매핑 관리 | 공급처 CRUD, 품목↔공급처 매핑, 상품명 변환, 택배사 매핑 (4개 페이지) | Phase 1 |
| 3 | 주문 업로드 + 파싱 | 쿠팡/토스 엑셀 파싱 + 테스트, 작업건 관리, 주문 업로드 UI, 재업로드 | Phase 2 |
| 4 | 공급처 배정 + 발주서 | 자동배정 + 테스트, 수량분배, 오늘만/기본 변경, 양식관리, 발주서 생성/다운로드 | Phase 3 |
| 5 | 운송장 매칭 + 출력 | 운송장 파싱 + 테스트, 매칭엔진 + 테스트, 수동매칭, 택배사변환, 플랫폼 출력 | Phase 4 |
| 6 | 대시보드 + 마무리 | 대시보드 UI, 실데이터 E2E 테스트, 전체 체크리스트, Vercel 배포 | Phase 5 |

각 Phase의 상세 스펙은 `docs/specs/PHASE_XX_*.md` 참조.
진행 상태는 `docs/STATUS.md`에서 추적.

---

## npm 스크립트

```bash
npm run dev          # Vite 개발 서버
npm run build        # tsc -b + Vite 프로덕션 빌드
npm run typecheck    # 빌드 없이 타입 체크만 (tsc -b --noEmit)
npm run preview      # 빌드 결과 로컬 프리뷰
npm run test         # Vitest watch 모드
npm run test:run     # Vitest 단일 실행 (CI/검증용)
npm run lint         # ESLint
npm run format       # Prettier 전체 적용
```

> ⚠️ **npm 명령** vs **Claude Code 슬래시 커맨드** 구분
> - 위는 모두 터미널에서 실행하는 npm 명령어
> - `/project:verify`, `/project:next-phase` 등은 Claude Code 안에서 실행하는 슬래시 커맨드 (npm과 무관)
