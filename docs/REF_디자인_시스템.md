# REF: 디자인 시스템

> Claude Design 시안에서 추출한 디자인 토큰 및 컴포넌트 패턴.
> `src/index.css`의 `@theme` 블록이 단일 진실 공급원.

---

## 1. 색상

### 브랜드 (Primary)
| 토큰 | Hex | 용도 |
|------|-----|------|
| `--color-primary` | `#3182F6` | 메인 액션, 링크, 활성 상태 |
| `--color-primary-hover` | `#1B64DA` | 버튼 hover, 강조 텍스트 |
| `--color-primary-50` | `#EFF6FF` | 활성 배경, 사이드바 활성 |
| `--color-primary-100` | `#DBE9FE` | 보조 배경, 호버 강조 |

### 시멘틱
| 토큰 | Hex | Light | 용도 |
|------|-----|-------|------|
| `--color-success` | `#34C759` | `#E8F8EC` | 매칭됨, 완료, 등록됨 |
| `--color-error` | `#FF3B30` | `#FEECEB` | 미매칭, 에러, 필수 |
| `--color-warning` | `#FF9500` | `#FFF3E0` | 미분류, 경고, pending |

### 표면 (Surface)
| 토큰 | Hex | 용도 |
|------|-----|------|
| `--color-bg` | `#F7F8FA` | 전체 배경 |
| `--color-card` | `#FFFFFF` | 카드, 사이드바, 모달 |
| `--color-line` | `#EDEFF2` | 기본 보더, 구분선 |
| `--color-line-strong` | `#E5E8EB` | 강조 보더, 인풋 보더 |

### 텍스트
| 토큰 | Hex | 용도 |
|------|-----|------|
| `--color-t-strong` | `#191F28` | 제목, 강조 텍스트 |
| `--color-t-mid` | `#4E5968` | 본문, 서브 텍스트 |
| `--color-t-mute` | `#8B95A1` | 힌트, 라벨, 비활성 |
| `--color-t-faint` | `#B0B8C1` | 매우 연한 텍스트 |

### 그레이 스케일 (Tailwind 유틸용)
| 토큰 | Hex |
|------|-----|
| `--color-gray-50` | `#FAFBFC` |
| `--color-gray-100` | `#F7F8FA` |
| `--color-gray-200` | `#F2F4F6` |
| `--color-gray-300` | `#EDEFF2` |
| `--color-gray-400` | `#E5E8EB` |
| `--color-gray-500` | `#C9CDD2` |
| `--color-gray-600` | `#8B95A1` |
| `--color-gray-700` | `#6B7684` |
| `--color-gray-800` | `#4E5968` |
| `--color-gray-900` | `#191F28` |

### 플랫폼
| 플랫폼 | Hex | 용도 |
|--------|-----|------|
| 쿠팡 | `#E64C3C` | 로고 배경, 칩 |
| 토스 | `#3182F6` | 로고 배경, 칩 |

---

## 2. 타이포그래피

### 폰트 패밀리
- **본문**: `'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`
- **모노**: `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`

### 타이포 스케일
| 레벨 | 크기 | 무게 | 행간 | letter-spacing | 용도 |
|------|------|------|------|---------------|------|
| display | 28px | 700 | 1.25 | -0.02em | 대시보드 인사말 |
| h1 | 24px | 700 | 1.3 | -0.025em | 페이지 타이틀 |
| h2 | 18px | 700 | 1.4 | -0.02em | 섹션 타이틀 |
| h3 | 16px | 700 | 1.4 | -0.02em | 카드 타이틀, topbar |
| h4 | 15px | 700 | 1.4 | -0.015em | 카드 내 소제목 |
| body | 14px | 400/500 | 1.5 | -0.01em | 본문 텍스트 |
| body-sm | 13px | 500/600 | 1.5 | 0 | 테이블 셀, 버튼 |
| caption | 12px | 600 | 1.4 | 0.02em | 라벨, 테이블 헤더 |
| caption-sm | 11px | 600/700 | 1.4 | 0.04em | 뱃지, 네비 섹션 |

### 기본 body
- `font-size: 14px`
- `line-height: 1.5`
- `letter-spacing: -0.01em`
- `-webkit-font-smoothing: antialiased`

---

## 3. 스페이싱

디자인에서 반복되는 간격 패턴:

| 용도 | 값 |
|------|-----|
| 페이지 padding | `32px 40px` (상하 32, 좌우 40) |
| 카드 padding | `20px ~ 24px` |
| 섹션 간격 | `24px ~ 32px` |
| 카드 내부 gap | `12px ~ 16px` |
| 인라인 gap (아이콘+텍스트) | `6px ~ 12px` |
| 테이블 행 padding | `14px 24px` (compact: `10px 24px`) |

---

## 4. 라운딩 (border-radius)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--radius-sm` | `8px` | 버튼, 칩, 인풋, 작은 요소 |
| `--radius-md` | `12px` | 카드, 드롭존, 팝오버 |
| `--radius-lg` | `16px` | 큰 카드, 테이블 컨테이너 |
| `--radius-xl` | `20px` | 로그인 카드, 특수 요소 |
| `999px` | pill | 뱃지, 아바타, 프로그레스 바 |

---

## 5. 그림자

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--shadow-sm` | `0 1px 2px rgba(20,28,40,.04)` | 카드, 테이블 |
| `--shadow-md` | `0 6px 24px rgba(20,28,40,.06)` | 호버 카드, 드롭다운 |
| `--shadow-lg` | `0 12px 40px rgba(20,28,40,.12)` | 팝오버, 모달 |
| 로그인 카드 | `0 8px 24px rgba(20,28,40,.04), 0 1px 2px rgba(20,28,40,.04)` | 로그인 전용 |

---

## 6. 레이아웃

| 항목 | 값 |
|------|-----|
| 전체 너비 | `1440px` (중앙 정렬) |
| 사이드바 | `240px` 고정, sticky, 100vh |
| 콘텐츠 max-width | `1200px` |
| 탑바 높이 | `64px`, sticky |
| 그리드 | 사이드바 `240px` + 메인 `1fr` |

---

## 7. 컴포넌트 패턴

### Button
| 변형 | 높이 | padding | font-size | 배경 | 보더 |
|------|------|---------|-----------|------|------|
| primary | 48px | 0 22px | 15px/700 | `--primary` | 없음 |
| ghost | 40px | 0 16px | 14px/600 | white | `--line-strong` |
| ghost-sm | 32px | 0 12px | 12px/600 | white | `--line-strong` |
| link | auto | 0 | 13px/600 | 없음 | 없음 |
| disabled | — | — | — | `#C9CDD2` | — |

### Badge (pill)
| 변형 | 배경 | 텍스트 |
|------|------|--------|
| success | `#E8F8EC` | `#1A7F37` |
| error | `#FEECEB` | `#C81E12` |
| info/blue | `#EFF6FF` | `#3182F6` |
| soft | `#F2F4F6` | `--t-mid` |
| progress | `#E5EFFE` | `#1B64DA` |
| done | `#E1F4E8` | `#118D4F` |

- font-size: `11px`, font-weight: `600~700`, padding: `3px 8px`, border-radius: `6px`

### Input
- 높이: `48px` (로그인), `40px` (일반), `32px` (검색/필터)
- 배경: `#F7F8FA` (기본), `white` (포커스)
- 보더: `transparent` → 포커스 시 `#3182F6`
- 포커스 링: `0 0 0 4px rgba(49,130,246,.12)`
- border-radius: `12px` (로그인), `8px` (일반)

### Card
- 배경: `white`
- 보더: `1px solid #EDEFF2`
- border-radius: `16px`
- shadow: `--shadow-sm`
- padding: `20px ~ 24px`

### Table
- 컨테이너: Card 패턴과 동일 (white, border, radius-lg)
- 헤더 행: 배경 `#FAFBFC`, 색상 `--t-mute`, 12px/600, letter-spacing: `0.02em`
- 데이터 행: `14px 24px` padding, `1px solid --line` 상단 보더
- 플래그 행: 배경 `#FFF7F6` (에러), `#FFFBF5` (경고)

### Sidebar Navigation
- 아이템: padding `10px 12px`, radius `10px`, gap `12px`
- 기본: color `--t-mid`, weight `500`
- hover: 배경 `#F2F4F6`, color `--t-strong`
- 활성: 배경 `--primary-50`, color `--primary`, weight `600`

### Tabs (Stepper)
- 컨테이너: white, border, radius-md, padding `6px`, gap `4px`
- 탭: flex-1, padding `10px 14px`, radius `8px`
- 스텝 넘버: 22px 원형, radius `999px`
- 활성: 배경 `--primary-50`, 넘버 배경 `--primary`
- 완료: 넘버 배경 `--success`

### Filter Chip
- 높이: `34px`, padding `0 12px`, radius `8px`
- 기본: white 배경, border `--line`
- 활성: 배경 `--t-strong`, color white
- 에러 활성: 배경 `--error`
- 카운트: `11px/700`, 배경 `#F2F4F6`, radius `999px`

### Dropzone
- border: `1.5px dashed --line-strong`
- 배경: `#FAFBFC`
- padding: `32px 24px`
- hover: border-color `--primary`, 배경 `--primary-50`
- 아이콘: `44px`, radius `12px`, 배경 `--primary-50`

### Popover
- 배경: white
- border: `1px solid --line`
- border-radius: `12px`
- shadow: `--shadow-lg`
- z-index: `50`

### Footer CTA (Sticky)
- 배경: `rgba(255,255,255,0.92)`
- backdrop-filter: `blur(12px)`
- border-top: `1px solid --line`
- padding: `16px 40px`
- z-index: `5`

---

## 8. 애니메이션

| 이름 | 속성 | 값 |
|------|------|-----|
| 기본 전환 | `transition` | `all .12s ease` |
| hover 전환 | `transition` | `background .12s ease, color .12s ease` |
| 로딩 스피너 | `@keyframes spin` | `rotate(360deg)`, `0.8s linear infinite` |
| 진행중 펄스 | `@keyframes pulse` | opacity `1→0.35→1`, `1.6s ease-in-out infinite` |
| 카드 hover | `transform` | `translateY(-2px)` + shadow 강화 |
| dropzone hover | `transition` | `border-color .15s ease, background .15s ease` |

---

## 9. 아이콘

- **라이브러리**: Lucide React
- **사이드바 아이콘**: 20px
- **인라인 아이콘**: 16px ~ 18px
- **버튼 내 아이콘**: 16px ~ 18px
- **카드/상태 아이콘**: 20px ~ 24px

---

## 10. 로그인 페이지 (특수)

사이드바 없는 풀스크린 중앙 레이아웃:
- 배경: `#F7F8FA` + 블루 블롭 2개 (blur 80px, opacity 0.5)
- 카드: `max-width: 420px`, padding `36px`, radius `20px`
- 로고: 20px/800
- 입력: 높이 `48px`, radius `12px`
- 로그인 버튼: 풀 너비, 높이 `50px`, radius `12px`
