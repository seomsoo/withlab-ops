import { Link } from 'react-router-dom'
import {
  ClipboardList,
  Truck,
  Upload,
  Download,
  Building2,
  FileUp,
  CheckCircle,
  ChevronRight,
  Lightbulb,
  BookOpen,
  Zap,
  HelpCircle,
  PackageSearch,
  MousePointerClick,
  RefreshCw,
  AlertTriangle,
  Info,
  ChevronDown,
  Settings,
  FileText,
  Layers,
  Tag,
  Repeat,
  Hash,
  Map,
} from 'lucide-react'
import { useState } from 'react'

// ─── Collapsible Section ─────────────────────────────────────────

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string
  icon?: React.ElementType
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-[14px] border border-line bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-gray-50"
      >
        {Icon && (
          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] bg-primary-50 text-primary">
            <Icon size={16} />
          </div>
        )}
        <span className="flex-1 text-[14px] font-bold text-t-strong">
          {title}
        </span>
        <ChevronDown
          size={16}
          className={`text-t-mute transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-line px-6 pb-5 pt-4">{children}</div>
      )}
    </div>
  )
}

// ─── Small UI helpers ────────────────────────────────────────────

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[10px] border border-primary-100 bg-primary-50 px-4 py-3">
      <Info size={15} className="mt-0.5 flex-shrink-0 text-primary" />
      <div className="text-[12px] leading-[1.6] text-primary/80">
        {children}
      </div>
    </div>
  )
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[10px] border border-warning/30 bg-warning/8 px-4 py-3">
      <AlertTriangle
        size={15}
        className="mt-0.5 flex-shrink-0 text-warning"
      />
      <div className="text-[12px] leading-[1.6] text-t-mid">{children}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-[13.5px] font-bold text-t-strong">{children}</h3>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-1.5 text-[12.5px] font-bold text-t-strong">
      {children}
    </h4>
  )
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] leading-[1.65] text-t-mid">{children}</p>
  )
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col gap-1.5 pl-0">
      {steps.map((s, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 text-[12px] leading-[1.6] text-t-mid"
        >
          <span className="mt-[1px] grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {i + 1}
          </span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2 text-[12px] leading-[1.6] text-t-mid"
        >
          <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-t-faint" />
          {item}
        </li>
      ))}
    </ul>
  )
}

function FieldTable({
  fields,
}: {
  fields: { name: string; desc: string; required?: boolean; example?: string }[]
}) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-line text-[11.5px]">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 text-left text-t-mute">
            <th className="px-3 py-2 font-semibold">칸</th>
            <th className="px-3 py-2 font-semibold">설명</th>
            <th className="w-[50px] px-3 py-2 text-center font-semibold">
              필수
            </th>
            <th className="px-3 py-2 font-semibold">예시</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.name} className="border-t border-line">
              <td className="whitespace-nowrap px-3 py-2 font-medium text-t-strong">
                {f.name}
              </td>
              <td className="px-3 py-2 text-t-mid">{f.desc}</td>
              <td className="px-3 py-2 text-center">
                {f.required ? (
                  <span className="text-primary">O</span>
                ) : (
                  <span className="text-t-faint">-</span>
                )}
              </td>
              <td className="px-3 py-2 font-mono text-[10.5px] text-t-mute">
                {f.example}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-line text-[11.5px]">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 text-left text-t-mute">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-line">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 ${j === 0 ? 'font-medium text-t-strong' : 'text-t-mid'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Spacer() {
  return <div className="h-3" />
}

// ─── TABLE OF CONTENTS ──────────────────────────────────────────

const TOC_ITEMS = [
  { id: 'daily', label: '전체 흐름' },
  { id: 'order', label: '발주서 — 주문부터 발주까지' },
  { id: 'tracking', label: '운송장 — 매칭부터 다운로드까지' },
  { id: 'mapping-suppliers', label: '매핑 — 공급처 관리' },
  { id: 'mapping-products', label: '매핑 — 품목 매핑' },
  { id: 'mapping-names', label: '매핑 — 상품명 변환' },
  { id: 'mapping-couriers', label: '매핑 — 택배사 매핑' },
  { id: 'mapping-dictionary', label: '매핑 — 과일 사전' },
  { id: 'template-order', label: '양식 — 발주서 양식' },
  { id: 'template-tracking', label: '양식 — 운송장 양식' },
  { id: 'faq', label: '자주 묻는 질문' },
]

function TableOfContents() {
  return (
    <nav className="rounded-[14px] border border-line bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-[14px] font-bold text-t-strong">목차</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {TOC_ITEMS.map((item, i) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-t-mid transition-colors hover:bg-gray-50 hover:text-primary"
          >
            <span className="w-4 text-[10px] font-bold text-t-faint">
              {i + 1}
            </span>
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

// ─── PREREQUISITES ───────────────────────────────────────────────

type PrereqItem = {
  icon: React.ElementType
  title: string
  description: string
  href: string
  required: boolean
}

const PREREQUISITES: PrereqItem[] = [
  {
    icon: Building2,
    title: '공급처 등록',
    description:
      '거래하는 공급처를 등록하고, 취급 상품을 입력해요. 등록해야 배정 대상이 됩니다.',
    href: '/mapping/suppliers',
    required: true,
  },
  {
    icon: FileUp,
    title: '운송장 양식 등록',
    description:
      '쿠팡/토스 셀러에서 다운받은 빈 운송장 양식 파일을 올려요. 나중에 운송장 다운로드할 때 필요합니다.',
    href: '/settings/platform-template',
    required: true,
  },
  {
    icon: BookOpen,
    title: '과일 사전 등록',
    description:
      '과일 종류/등급/무게 정보를 등록하면 자동 배정과 품목 그룹핑이 더 정확해져요. 없어도 기본 동작합니다.',
    href: '/mapping/dictionary',
    required: false,
  },
]

function PrerequisiteSection() {
  return (
    <section className="rounded-[14px] border border-primary-100 bg-primary-50 p-6">
      <h2 className="text-[15px] font-bold text-primary">처음 사용하시나요?</h2>
      <p className="mt-1 text-[12.5px] text-primary/70">
        아래 설정을 먼저 해주세요. 필수 항목만 해도 바로 시작할 수 있습니다.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {PREREQUISITES.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex flex-col gap-3 rounded-[10px] border border-line bg-card p-4 transition-colors hover:border-primary-100"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[8px] bg-primary-50 text-primary">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold text-t-strong">
                    {item.title}
                  </div>
                </div>
                {item.required ? (
                  <span className="flex-shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary">
                    필수
                  </span>
                ) : (
                  <span className="flex-shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-primary">
                    선택
                  </span>
                )}
              </div>
              <div className="text-[11.5px] leading-[1.5] text-t-mute">
                {item.description}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

// ─── DAILY WORKFLOW ──────────────────────────────────────────────

function DailyWorkflow() {
  const morningSteps = [
    '로그인 → 대시보드에서 [새 발주 작업 시작] 클릭',
    '쿠팡 주문 엑셀 업로드',
    '토스 주문 엑셀 업로드',
    '품목 검토 — 오늘 주요 품목의 공급처를 미리 선택 (건너뛰어도 됨)',
    '공급처 배정 확인 — "미분류"가 있으면 공급처 지정',
    '공급처별 발주서 다운로드 → 카톡/이메일로 공급처에 전달',
    '[발주 완료 처리] 클릭',
  ]
  const afternoonSteps = [
    '(공급처에서 운송장 보내주면) 운송장 엑셀 업로드',
    '매칭 결과 확인 — 빨간색 "미매칭"이 있으면 수동 연결',
    '쿠팡/토스 운송장 파일 다운로드 → 각 플랫폼 셀러에 업로드',
    '[운송장 처리 완료] 클릭',
  ]

  return (
    <section id="daily">
      <h2 className="mb-4 text-[17px] font-bold tracking-[-0.02em] text-t-strong">
        전체 흐름
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-[14px] border border-line bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-[8px] bg-primary-50 text-primary">
              <ClipboardList size={15} />
            </div>
            <span className="text-[13px] font-bold text-t-strong">발주</span>
          </div>
          <StepList steps={morningSteps} />
        </div>
        <div className="rounded-[14px] border border-line bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-[8px] bg-gray-100 text-t-strong">
              <Truck size={15} />
            </div>
            <span className="text-[13px] font-bold text-t-strong">
              운송장
            </span>
          </div>
          <StepList steps={afternoonSteps} />
        </div>
      </div>
    </section>
  )
}

// ─── ORDER PROCESS (DETAILED) ────────────────────────────────────

function OrderProcessDetail() {
  return (
    <section id="order" className="flex flex-col gap-3">
      <div className="rounded-[18px] bg-gradient-to-br from-primary to-primary-hover p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/16">
            <ClipboardList size={20} />
          </div>
          <span className="text-[11px] font-bold tracking-[0.08em] text-white/72">
            STEP 01
          </span>
        </div>
        <div className="mt-4 text-[20px] font-bold tracking-[-0.02em]">
          발주 프로세스
        </div>
        <p className="mt-1.5 text-[13.5px] leading-[1.55] text-white/78">
          주문 엑셀 업로드 → 품목 검토 → 공급처 배정 → 발주서 다운로드
        </p>
      </div>

      {/* 순서 요약 카드 */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, icon: Upload, label: '주문 업로드' },
          { n: 2, icon: PackageSearch, label: '품목 검토' },
          { n: 3, icon: Building2, label: '공급처 배정' },
          { n: 4, icon: Download, label: '발주서 다운로드' },
        ].map((s, i) => (
          <div key={s.label} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[12px] border border-line bg-card px-4 py-3 shadow-sm">
              <div className="grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
                {s.n}
              </div>
              <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[8px] bg-primary-50 text-primary">
                <s.icon size={16} />
              </div>
              <span className="text-[12.5px] font-bold text-t-strong">
                {s.label}
              </span>
            </div>
            {i < 3 && (
              <ChevronRight size={14} className="flex-shrink-0 text-t-faint" />
            )}
          </div>
        ))}
      </div>

      {/* 1. 작업건 만들기 */}
      <CollapsibleSection title="작업건 만들기" icon={FileText} defaultOpen>
        <div className="flex flex-col gap-3">
          <Para>
            &quot;작업건&quot;은 하루에 한 번 만드는 &quot;오늘의 발주
            묶음&quot;입니다. 오늘 올린 주문, 배정, 발주서, 운송장이 이 작업건
            안에 묶입니다.
          </Para>
          <SectionTitle>만드는 방법</SectionTitle>
          <StepList
            steps={[
              '사이드바에서 "발주서" 클릭',
              '파란색 [새 발주 작업 시작] 버튼 클릭',
              '작업건 이름 입력 (자동으로 "2026-05-14 오전 발주" 같이 채워져 있음)',
              '[만들기] 클릭',
            ]}
          />
          <InfoBox>
            이전에 만든 작업건을 이어하려면? 목록에서 해당 작업건을 클릭하면
            됩니다.
          </InfoBox>
        </div>
      </CollapsibleSection>

      {/* 2. 주문 엑셀 업로드 */}
      <CollapsibleSection title="주문 엑셀 업로드" icon={Upload} defaultOpen>
        <div className="flex flex-col gap-4">
          <Para>
            쿠팡/토스 셀러 페이지에서 다운받은 주문 엑셀 파일을 올립니다.
          </Para>

          <div>
            <SubTitle>쿠팡 주문 업로드</SubTitle>
            <StepList
              steps={[
                '"쿠팡 주문 엑셀" 영역에 파일을 끌어다 놓거나, 클릭해서 파일 선택',
                '파일이 자동으로 읽히고 결과 표시 — 정상 N건, 오류 N건, 중복 N건',
                '오류 건은 무시해도 됨 (정상 건만 처리됨)',
              ]}
            />
          </div>

          <div>
            <SubTitle>토스 주문 업로드</SubTitle>
            <Para>
              쿠팡과 같은 방식으로 &quot;토스 주문 엑셀&quot; 영역에 파일을
              올립니다.
            </Para>
          </div>

          <div>
            <SubTitle>쿠팡 파일이 2개 이상일 때</SubTitle>
            <Para>
              쿠팡에서 주문을 2개 파일로 나눠 다운받았을 때, 두 번째 파일을
              올리면 팝업이 뜹니다:
            </Para>
            <Spacer />
            <SimpleTable
              headers={['선택', '결과']}
              rows={[
                [
                  '기존 파일에 합치기',
                  '두 파일의 주문이 하나로 합쳐짐 (중복은 자동 제거)',
                ],
                [
                  '별도 파일로 업로드',
                  '"쿠팡1", "쿠팡2"로 따로 관리됨. 운송장도 파일이 따로 나옴',
                ],
              ]}
            />
          </div>

          <div>
            <SubTitle>잘못 올렸을 때 (재업로드)</SubTitle>
            <Para>
              같은 플랫폼 파일을 다시 올리면 &quot;기존 데이터를 삭제하고 새로
              업로드합니다&quot; 팝업이 뜹니다. [재업로드] 클릭하면 이전
              데이터가 지워지고 새 파일로 교체됩니다.
            </Para>
          </div>

          <InfoBox>
            다 올렸으면 화면 아래의 [품목 검토로 이동] 버튼을 클릭합니다.
          </InfoBox>
        </div>
      </CollapsibleSection>

      {/* 3. 품목 검토 */}
      <CollapsibleSection title="품목 검토 (건너뛰어도 됨)" icon={PackageSearch}>
        <div className="flex flex-col gap-4">
          <Para>
            오늘 주문된 주요 품목(사과, 참외, 귤 등)을 보고, 각 품목을 어느
            공급처에 보낼지 미리 정합니다. 매일 공급처가 바뀌는 품목이 있을 때
            유용합니다.
          </Para>
          <WarnBox>
            이 단계는 선택 사항입니다. 건너뛰면 기존 매핑 기준으로 자동
            배정됩니다.
          </WarnBox>

          <div>
            <SubTitle>화면에 보이는 것</SubTitle>
            <Para>
              테이블에 오늘 주문된 품목이 발주량 많은 순서로 나열됩니다:
            </Para>
            <Spacer />
            <SimpleTable
              headers={['열', '설명', '예시']}
              rows={[
                ['품목', '주문에서 추출된 과일 이름', '사과, 참외, 한라봉'],
                ['건수', '이 품목의 주문 건수', '120건'],
                ['수량', '이 품목의 총 수량', '360'],
                ['공급처', '드롭다운 — 공급처를 선택', '[A농장 ▾]'],
                [
                  '기본 저장',
                  '체크박스 — 다음에도 이 공급처를 쓸지',
                  '☐',
                ],
              ]}
            />
          </div>

          <div>
            <SubTitle>공급처 드롭다운의 추천 표시</SubTitle>
            <Para>
              드롭다운을 클릭하면 추천 공급처가 맨 위에 표시됩니다. 각 추천
              옆에 이유가 나옵니다:
            </Para>
            <Spacer />
            <SimpleTable
              headers={['표시', '의미']}
              rows={[
                ['🔵 기본', '품목 매핑에 기본으로 등록된 공급처'],
                ['🟢 전날', '어제 이 품목을 보냈던 공급처'],
                ['🟡 최다', '최근 30일간 가장 많이 보낸 공급처'],
                ['💰 최저가', '카탈로그 기준 가격이 가장 싼 공급처'],
              ]}
            />
            <Spacer />
            <Para>
              추천 아래에 나머지 공급처 전체 목록이 나옵니다. 맨 아래에 &quot;자동
              배정&quot; 옵션을 선택하면 시스템이 알아서 배정합니다.
            </Para>
          </div>

          <div>
            <SubTitle>&quot;기본 저장&quot; 체크박스</SubTitle>
            <Para>
              공급처를 변경했을 때만 체크박스가 나타납니다.
            </Para>
            <Spacer />
            <SimpleTable
              headers={['체크 여부', '결과']}
              rows={[
                [
                  '체크함',
                  '이 품목의 기본 공급처가 영구적으로 바뀜. 내일부터 항상 이 공급처로 배정',
                ],
                [
                  '체크 안 함',
                  '오늘만 이 공급처로 배정. 내일은 원래대로 돌아감',
                ],
              ]}
            />
          </div>

          <div>
            <SubTitle>완료 후</SubTitle>
            <SimpleTable
              headers={['버튼', '동작']}
              rows={[
                ['[배정 시작]', '선택한 공급처가 반영되어 자동 배정 시작'],
                [
                  '[건너뛰기]',
                  '품목 검토를 안 하고 기존 매핑 기준으로 자동 배정',
                ],
              ]}
            />
          </div>

          <InfoBox>
            품목 그룹핑: 시스템이 상품명에서 과일 이름을 자동 추출합니다.
            &quot;고당도 사과 3kg&quot;과 &quot;사과 5kg&quot;은 둘 다
            &quot;사과&quot;로 묶입니다. 과일 사전에 동의어를 등록하면
            &quot;부사&quot;도 &quot;사과&quot;로 묶을 수 있습니다.
          </InfoBox>
        </div>
      </CollapsibleSection>

      {/* 4. 공급처 배정 */}
      <CollapsibleSection title="공급처 배정" icon={Building2}>
        <div className="flex flex-col gap-4">
          <Para>
            시스템이 자동 배정한 결과를 확인하고, 틀린 것만 수정합니다. 주문이
            공급처별 그룹으로 표시됩니다.
          </Para>

          <div>
            <SubTitle>&quot;미분류&quot; 처리하기</SubTitle>
            <Para>
              미분류는 시스템이 어느 공급처로 보낼지 몰라서 배정하지 못한
              주문입니다.
            </Para>
            <Spacer />
            <StepList
              steps={[
                '미분류 그룹의 주문 행에서 [공급처 선택] 드롭다운 클릭',
                '공급처를 선택',
                '선택하면 이 주문이 배정됨 + 동시에 품목 매핑에 자동 등록 → 다음에 같은 상품은 자동 배정',
              ]}
            />
          </div>

          <div>
            <SubTitle>이미 배정된 공급처 바꾸기</SubTitle>
            <StepList
              steps={[
                '바꾸고 싶은 주문 행의 공급처 칩(예: "A농장") 클릭',
                '새 공급처를 선택',
                '"오늘만 변경" → 이번 작업건에서만 적용 / "기본 변경" → 앞으로 항상 새 공급처로 배정',
              ]}
            />
          </div>

          <div>
            <SubTitle>수량 분배 (한 품목을 여러 공급처에 나누기)</SubTitle>
            <Para>
              예: 사과 100건 중 60건은 A농장, 40건은 B농장으로 보내고 싶을 때
            </Para>
            <Spacer />
            <StepList
              steps={[
                '공급처 그룹 헤더의 [분배] 버튼 클릭',
                '팝업에서 공급처별 수량 입력',
                '[확인] 클릭하면 주문이 자동으로 나뉨',
              ]}
            />
            <Spacer />
            <WarnBox>
              1건의 주문을 쪼개는 건 안 됩니다. &quot;사과 3개 주문&quot;을
              2개+1개로 나누는 건 불가. &quot;주문 100건&quot; 중
              60건/40건으로 나누는 것만 가능합니다.
            </WarnBox>
          </div>

          <InfoBox>
            다 확인했으면 [발주서 다운로드로 이동] 버튼을 클릭합니다.
          </InfoBox>
        </div>
      </CollapsibleSection>

      {/* 5. 발주서 다운로드 */}
      <CollapsibleSection title="발주서 다운로드" icon={Download}>
        <div className="flex flex-col gap-4">
          <Para>
            공급처별 발주서 엑셀 파일을 다운로드해서 공급처에 보냅니다. 공급처별로
            카드가 표시됩니다.
          </Para>

          <div>
            <SubTitle>다운로드 방법</SubTitle>
            <SimpleTable
              headers={['방법', '설명']}
              rows={[
                ['개별 다운로드', '각 공급처 카드의 [다운로드] 클릭 → 해당 공급처 발주서 1개'],
                ['전체 다운로드', '상단의 [전체 다운로드] → 모든 공급처 발주서 한꺼번에'],
              ]}
            />
          </div>

          <WarnBox>
            &quot;양식 미등록&quot;이 표시되면? 해당 공급처의 발주서 양식이
            등록되지 않은 것입니다. 매핑관리 → 공급처 관리 → 해당 공급처
            클릭 → 발주서 양식을 등록하세요.
          </WarnBox>

          <div>
            <SubTitle>발주 완료 처리</SubTitle>
            <StepList
              steps={[
                '모든 발주서를 공급처에 보낸 후 [발주 완료 처리] 클릭',
                '"발주를 완료합니까?" 팝업에서 [확인]',
                '상태가 "발주완료"로 바뀜 → 이제 운송장 처리 가능',
              ]}
            />
          </div>

          <div>
            <SubTitle>발주 되돌리기</SubTitle>
            <Para>
              발주완료 했는데 배정을 수정해야 할 때: 발주서 다운로드 페이지
              상단의 초록 배너에서 [발주 되돌리기] 클릭 → &quot;진행중&quot;
              상태로 돌아감 → 배정 수정 가능 (기존 배정 데이터는 유지됨)
            </Para>
          </div>

          <div>
            <SubTitle>공급처별 배정 삭제</SubTitle>
            <Para>
              특정 공급처의 배정만 취소하고 싶을 때: 해당 공급처 카드의 🗑️ 클릭
              → 해당 공급처에 배정된 주문이 &quot;미분류&quot; 상태로 돌아감.
              &quot;진행중&quot; 상태에서만 가능합니다.
            </Para>
          </div>

          <div>
            <SubTitle>작업건 삭제</SubTitle>
            <Para>
              작업건 목록에서 해당 작업건 오른쪽의 🗑️ 클릭 → 이 작업건에 속한
              모든 데이터(주문, 배정, 운송장)가 삭제됩니다. 되돌릴 수 없으니
              신중하게 클릭하세요.
            </Para>
          </div>
        </div>
      </CollapsibleSection>
    </section>
  )
}

// ─── TRACKING PROCESS (DETAILED) ─────────────────────────────────

function TrackingProcessDetail() {
  return (
    <section id="tracking" className="flex flex-col gap-3">
      <div className="rounded-[18px] bg-gradient-to-br from-[#1F2937] to-[#0F172A] p-6 text-white dark:from-[#2A3040] dark:to-[#1A2030]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/16">
            <Truck size={20} />
          </div>
          <span className="text-[11px] font-bold tracking-[0.08em] text-white/72">
            STEP 02
          </span>
        </div>
        <div className="mt-4 text-[20px] font-bold tracking-[-0.02em]">
          운송장 프로세스
        </div>
        <p className="mt-1.5 text-[13.5px] leading-[1.55] text-white/78">
          공급처에서 운송장을 받으면 플랫폼에 올릴 파일을 만들어요. 간편 모드도
          있어요.
        </p>
      </div>

      <div className="rounded-[12px] border border-line bg-card p-4 shadow-sm">
        <SimpleTable
          headers={['방식', '언제 쓰나요?', '특징']}
          rows={[
            [
              '일반 운송장',
              '매칭 결과를 상세히 보고, 미매칭 수동 처리할 때',
              '작업건 기반, DB 저장됨',
            ],
            [
              '간편 운송장',
              '빠르게 처리하고 싶을 때',
              '작업건 없이 바로 매칭, DB 저장 안 됨',
            ],
          ]}
        />
      </div>

      {/* 일반 운송장 */}
      <CollapsibleSection title="일반 운송장 — 운송장 업로드" icon={Upload}>
        <div className="flex flex-col gap-3">
          <StepList
            steps={[
              '사이드바에서 "운송장" 클릭',
              '작업건 목록에서 처리할 작업건 클릭',
              '운송장 업로드 화면이 나옴',
              '공급처를 먼저 선택 (드롭다운)',
              '운송장 엑셀 파일을 드래그하거나 클릭해서 업로드',
              '파싱 결과 표시 (정상/오류 건수)',
              '다른 공급처 운송장도 같은 방식으로 업로드',
            ]}
          />
          <InfoBox>
            잘못 올린 운송장은 업로드 항목 옆의 🗑️ 아이콘 클릭 → 확인 →
            삭제됩니다.
          </InfoBox>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="일반 운송장 — 매칭 결과 확인" icon={CheckCircle}>
        <div className="flex flex-col gap-4">
          <Para>
            &quot;매칭 결과&quot; 탭을 클릭하면 운송장과 주문의 매칭 현황이
            나옵니다.
          </Para>

          <div>
            <SubTitle>상단 통계 카드</SubTitle>
            <SimpleTable
              headers={['카드', '의미']}
              rows={[
                ['전체 N건', '업로드된 총 운송장 수'],
                ['매칭 N건', '매칭번호가 일치해서 자동 연결된 건'],
                ['미매칭 N건', '일치하는 주문을 못 찾은 건'],
                ['중복 N건', '같은 주문에 운송장이 2개 이상인 건'],
              ]}
            />
          </div>

          <div>
            <SubTitle>공급처별 매칭 진행률</SubTitle>
            <BulletList
              items={[
                '✅ 초록 체크 + 공급처명 → 100% 매칭 완료',
                '원형 프로그레스 + "매칭 58/60" → 아직 진행 중',
              ]}
            />
          </div>

          <div>
            <SubTitle>매칭 상태 색상</SubTitle>
            <SimpleTable
              headers={['색상', '상태', '조치']}
              rows={[
                ['초록', '매칭됨', '정상 — 조치 불필요'],
                ['빨강', '미매칭', '수동 매칭 필요 (아래 참고)'],
                ['주황', '중복', '확인 필요'],
              ]}
            />
          </div>

          <div>
            <SubTitle>수동 매칭 (미매칭 처리)</SubTitle>
            <StepList
              steps={[
                '빨간색 "미매칭" 행의 [수동 매칭] 클릭',
                '주문 목록 팝업이 뜸',
                '올바른 주문을 찾아서 클릭',
                '매칭 완료 → 상태가 "매칭됨"으로 바뀜',
              ]}
            />
            <Spacer />
            <InfoBox>
              주로 공급처가 운송장에 매칭번호를 잘못 적었을 때 미매칭이
              발생합니다.
            </InfoBox>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="일반 운송장 — 플랫폼 파일 다운로드"
        icon={Download}
      >
        <div className="flex flex-col gap-3">
          <Para>
            &quot;플랫폼 파일 다운로드&quot; 탭을 클릭합니다. 쿠팡/토스 카드가
            각각 표시됩니다.
          </Para>
          <SimpleTable
            headers={['방법', '설명']}
            rows={[
              [
                '개별 다운로드',
                '각 라벨(쿠팡1, 쿠팡2 등) 옆의 [다운로드] 클릭',
              ],
              [
                '전체 다운로드',
                '[전체 다운로드] → 라벨별로 개별 파일이 각각 다운로드 (합쳐진 파일 아님!)',
              ],
            ]}
          />
          <WarnBox>
            미매칭 건이 있으면 노란색 경고 배너가 뜹니다. 미매칭 건은 운송장
            파일에 포함되지 않으니 매칭을 먼저 처리하세요.
          </WarnBox>
          <Para>
            다운로드한 파일을 쿠팡 셀러 / 토스 셀러 페이지에서 업로드합니다.
            모든 운송장을 업로드했으면 [운송장 처리 완료] 클릭 → 작업건 상태가
            &quot;완료&quot;로 바뀝니다.
          </Para>
        </div>
      </CollapsibleSection>

      {/* 간편 운송장 */}
      <CollapsibleSection title="간편 운송장" icon={Zap}>
        <div className="flex flex-col gap-4">
          <Para>
            작업건 없이 빠르게 운송장을 처리하는 모드입니다. 사이드바에서
            &quot;운송장&quot; → 화면 오른쪽 위 [간편 운송장] 버튼으로
            시작합니다.
          </Para>
          <div>
            <SubTitle>Step 1 — 주문 업로드</SubTitle>
            <Para>
              쿠팡/토스 주문 엑셀 파일을 업로드합니다. 자동으로 읽혀서 주문
              목록이 표시됩니다.
            </Para>
          </div>
          <div>
            <SubTitle>Step 2 — 운송장 업로드</SubTitle>
            <Para>
              공급처를 선택하고 운송장 엑셀을 업로드합니다. 올리는 즉시 주문과
              자동 매칭됩니다. 여러 공급처의 운송장을 순서대로 올릴 수
              있습니다. 매칭/미매칭 탭으로 결과를 확인합니다.
            </Para>
          </div>
          <div>
            <SubTitle>Step 3 — 다운로드</SubTitle>
            <Para>
              쿠팡/토스 플랫폼 파일을 다운로드합니다.
            </Para>
          </div>
          <WarnBox>
            간편 운송장은 DB에 저장되지 않습니다. 페이지를 벗어나면 데이터가
            사라집니다. 반드시 파일을 다운로드한 후 페이지를 나가세요.
          </WarnBox>
        </div>
      </CollapsibleSection>
    </section>
  )
}

// ─── MAPPING: SUPPLIER ───────────────────────────────────────────

function MappingSupplier() {
  return (
    <section id="mapping-suppliers">
      <CollapsibleSection title="매핑관리 — 공급처 관리" icon={Building2}>
        <div className="flex flex-col gap-4">
          <Para>
            사이드바 &quot;매핑관리&quot; → 왼쪽 탭 &quot;공급처 관리&quot;.
            과일을 납품받는 거래처(농장, 도매 등)를 관리합니다.
          </Para>

          <div>
            <SubTitle>공급처 추가</SubTitle>
            <StepList
              steps={[
                '오른쪽 위 [추가] 클릭',
                '입력 팝업에서 아래 항목을 입력',
                '[추가] 클릭',
              ]}
            />
            <Spacer />
            <FieldTable
              fields={[
                {
                  name: '공급처명',
                  desc: '거래처 이름',
                  required: true,
                  example: 'A농장',
                },
                {
                  name: '연락처',
                  desc: '전화번호나 담당자',
                  required: false,
                  example: '010-1234-5678 김사장님',
                },
                {
                  name: '메모',
                  desc: '참고할 내용',
                  required: false,
                  example: '사과 전문, 화요일 배송불가',
                },
              ]}
            />
          </div>

          <div>
            <SubTitle>공급처 수정</SubTitle>
            <Para>
              수정할 공급처 행의 연필 아이콘 클릭 → 수정 후 [저장]
            </Para>
          </div>

          <div>
            <SubTitle>공급처 상세 페이지</SubTitle>
            <Para>
              공급처 행을 클릭하면 상세 페이지로 이동합니다. 여기서:
            </Para>
            <Spacer />
            <BulletList
              items={[
                '기본 정보 수정 (이름, 연락처, 메모)',
                '발주서 양식 등록 — 이 공급처에 보낼 발주서 엑셀 양식 설정',
                '상품 카탈로그 — 이 공급처의 상품 목록을 업로드',
              ]}
            />
            <Spacer />
            <InfoBox>
              상품 카탈로그를 올리면 자동 배정 시 가격/재고를 참고하고, 배정
              페이지에서 공급처 가격이 표시되며, 품목 검토에서 최저가 추천이
              가능해집니다.
            </InfoBox>
          </div>

          <div>
            <SubTitle>비활성화 / 복원 / 완전삭제</SubTitle>
            <SimpleTable
              headers={['동작', '방법', '결과']}
              rows={[
                [
                  '비활성화',
                  '토글 버튼 OFF',
                  '새 배정에서 제외됨. 기존 데이터 유지.',
                ],
                [
                  '활성화 복원',
                  '비활성 목록에서 토글 ON',
                  '다시 배정 대상에 포함됨.',
                ],
                [
                  '완전삭제',
                  '비활성 목록에서 🗑️ 클릭',
                  'DB에서 완전히 삭제. 되돌릴 수 없음.',
                ],
              ]}
            />
          </div>
        </div>
      </CollapsibleSection>
    </section>
  )
}

// ─── MAPPING: PRODUCTS ───────────────────────────────────────────

function MappingProducts() {
  return (
    <section id="mapping-products">
      <CollapsibleSection title="매핑관리 — 품목 매핑" icon={Layers}>
        <div className="flex flex-col gap-4">
          <Para>
            사이드바 &quot;매핑관리&quot; → &quot;품목 매핑&quot;. &quot;이
            상품은 이 공급처로 보내라&quot;는 규칙입니다.
          </Para>
          <div className="rounded-[8px] bg-gray-50 px-4 py-3 text-[12px] leading-[1.8] text-t-mid">
            예: &quot;산지직송 성주 꿀참외&quot; (쿠팡) → A농장
            <br />
            예: &quot;참외 5kg 특상품&quot; (토스) → A농장
            <br />
            예: &quot;프리미엄 사과 세트&quot; (공통) → B농장
          </div>

          <div>
            <SubTitle>품목 매핑이 만들어지는 2가지 방법</SubTitle>
            <SimpleTable
              headers={['방법', '설명']}
              rows={[
                [
                  '자동 등록 (가장 편함)',
                  '배정 페이지에서 "미분류" 주문에 공급처 지정 → 자동으로 품목 매핑에 등록됨',
                ],
                [
                  '수동 등록',
                  '품목 매핑 페이지에서 직접 추가 (아래 참고)',
                ],
              ]}
            />
          </div>

          <div>
            <SubTitle>수동으로 품목 매핑 추가</SubTitle>
            <StepList
              steps={[
                '오른쪽 위 [추가] 클릭',
                '아래 항목을 입력',
                '[저장] 클릭',
              ]}
            />
            <Spacer />
            <FieldTable
              fields={[
                {
                  name: '플랫폼',
                  desc: '쿠팡/토스/공통 중 선택. "공통"이면 둘 다 적용',
                  required: true,
                  example: '공통',
                },
                {
                  name: '상품명',
                  desc: '플랫폼에서 들어오는 등록상품명. 정확히 적어야 매칭됨',
                  required: true,
                  example: '산지직송 성주 꿀참외',
                },
                {
                  name: '옵션명',
                  desc: '플랫폼 옵션명. 비워두면 모든 옵션에 적용',
                  required: false,
                  example: '1박스 특가혼합과 5kg',
                },
                {
                  name: '공급처',
                  desc: '이 상품을 보낼 공급처',
                  required: true,
                  example: 'A농장',
                },
                {
                  name: '우선순위',
                  desc: '같은 상품에 여러 매핑 시 높은 숫자가 우선',
                  required: false,
                  example: '0',
                },
                {
                  name: '기본',
                  desc: '체크하면 이 공급처가 기본 배정 대상',
                  required: false,
                  example: '☑',
                },
              ]}
            />
          </div>

          <InfoBox>
            &quot;상품명&quot;에는 쿠팡 &quot;등록상품명&quot; 또는 토스
            &quot;상품명&quot;을 넣으세요. 배정 페이지에서 보이는 상품명을
            복사해서 넣으면 됩니다.
            <br />
            &quot;옵션명&quot;을 비우면 상품명만 일치하면 매핑됩니다. 예:
            &quot;사과&quot;만 넣으면 &quot;사과 3kg&quot;, &quot;사과
            5kg&quot; 모두 매핑됩니다.
          </InfoBox>

          <div>
            <SubTitle>수정 / 삭제</SubTitle>
            <BulletList
              items={[
                '수정: 행의 연필 아이콘 클릭 → 수정 → [저장]',
                '삭제: 행의 🗑️ 아이콘 클릭 → 확인 → 삭제',
              ]}
            />
          </div>
        </div>
      </CollapsibleSection>
    </section>
  )
}

// ─── MAPPING: NAME ───────────────────────────────────────────────

function MappingNames() {
  return (
    <section id="mapping-names">
      <CollapsibleSection title="매핑관리 — 상품명 변환" icon={Tag}>
        <div className="flex flex-col gap-4">
          <Para>
            사이드바 &quot;매핑관리&quot; → &quot;상품명 변환&quot;. 플랫폼
            상품명을 공급처가 알아보는 이름으로 바꿔주는 규칙입니다.
          </Para>
          <div className="rounded-[8px] bg-gray-50 px-4 py-3 text-[12px] leading-[1.8] text-t-mid">
            예: &quot;프리미엄 산지직송 사과 세트 3kg&quot; → &quot;사과
            3kg&quot;
            <br />
            예: &quot;[특가] 성주 꿀참외 혼합과 5kg&quot; → &quot;참외 혼합
            5kg&quot;
          </div>

          <div>
            <SubTitle>품목 매핑과 뭐가 다른가요?</SubTitle>
            <SimpleTable
              headers={['구분', '역할']}
              rows={[
                ['품목 매핑', '"이 상품 → 이 공급처로 보내라" (배정 규칙)'],
                [
                  '상품명 변환',
                  '"이 상품명 → 발주서에 이 이름으로 써라" (이름 변환 규칙)',
                ],
              ]}
            />
          </div>

          <div>
            <SubTitle>상품명 변환 추가</SubTitle>
            <StepList
              steps={[
                '오른쪽 위 [추가] 클릭',
                '아래 항목을 입력',
                '[저장] 클릭',
              ]}
            />
            <Spacer />
            <FieldTable
              fields={[
                {
                  name: '플랫폼',
                  desc: '쿠팡/토스/공통 중 선택',
                  required: true,
                  example: '공통',
                },
                {
                  name: '플랫폼 상품명',
                  desc: '플랫폼에서 들어오는 상품명 (정확히)',
                  required: true,
                  example: '산지직송 성주 꿀참외',
                },
                {
                  name: '플랫폼 옵션명',
                  desc: '비워두면 모든 옵션에 적용',
                  required: false,
                  example: '1박스 특가혼합과 5kg',
                },
                {
                  name: '공급처',
                  desc: '이 변환을 적용할 공급처',
                  required: true,
                  example: 'A농장',
                },
                {
                  name: '공급처 상품명',
                  desc: '발주서에 적힐 이름',
                  required: true,
                  example: '정품 참외 중소과 5kg',
                },
                {
                  name: '공급처 상품코드',
                  desc: '공급처 자체 상품 코드',
                  required: false,
                  example: 'PIDY82D',
                },
              ]}
            />
          </div>

          <InfoBox>
            &quot;공급처 상품명&quot;에는 공급처 발주서에 적어야 하는 상품
            이름을 넣으세요. 공급처에서 &quot;이 이름으로 보내주세요&quot;라고
            한 이름입니다.
          </InfoBox>

          <div>
            <SubTitle>자동 매칭 제안</SubTitle>
            <Para>
              공급처 상품 카탈로그가 등록되어 있으면, 시스템이 &quot;이 플랫폼
              상품과 이 공급처 상품이 비슷한 것 같은데?&quot; 하고 자동으로
              제안해줍니다. 제안이 맞으면 [적용], 틀리면 무시하면 됩니다.
            </Para>
          </div>

          <InfoBox>
            공급처 상품명 입력칸에 글자를 타이핑하면 카탈로그에서 자동완성도
            됩니다.
          </InfoBox>
        </div>
      </CollapsibleSection>
    </section>
  )
}

// ─── MAPPING: COURIERS ───────────────────────────────────────────

function MappingCouriers() {
  return (
    <section id="mapping-couriers">
      <CollapsibleSection title="매핑관리 — 택배사 매핑" icon={Repeat}>
        <div className="flex flex-col gap-4">
          <Para>
            사이드바 &quot;매핑관리&quot; → &quot;택배사 매핑&quot;. 운송장에
            적힌 택배사 이름을 쿠팡/토스가 인식하는 정식 명칭으로 변환합니다.
            모든 공급처에 공통 적용됩니다.
          </Para>
          <div className="rounded-[8px] bg-gray-50 px-4 py-3 text-[12px] leading-[1.8] text-t-mid">
            예: 운송장의 &quot;대한통운&quot; → 쿠팡/토스에는 &quot;CJ
            대한통운&quot;으로 변환
            <br />
            예: &quot;로젠&quot; → &quot;로젠택배&quot;로 변환
          </div>

          <div>
            <SubTitle>택배사 매핑 추가</SubTitle>
            <StepList
              steps={[
                '오른쪽 위 [매핑 추가] 클릭',
                '아래 항목을 입력',
                '[매핑 추가] 클릭하여 저장',
              ]}
            />
            <Spacer />
            <FieldTable
              fields={[
                {
                  name: '원본 택배사명',
                  desc: '운송장에 적혀있는 택배사명 (정확히 일치해야 변환됨)',
                  required: true,
                  example: '대한통운',
                },
                {
                  name: '쿠팡 택배사명',
                  desc: '쿠팡에 업로드할 때 넣을 이름',
                  required: true,
                  example: 'CJ 대한통운',
                },
                {
                  name: '토스 택배사명',
                  desc: '토스에 업로드할 때 넣을 이름',
                  required: true,
                  example: 'CJ대한통운',
                },
              ]}
            />
          </div>

          <InfoBox>
            택배사 매핑이 없으면 운송장에 적힌 이름이 그대로 쿠팡/토스에
            들어갑니다. 이름이 안 맞으면 플랫폼에서 오류가 날 수 있으니
            등록해두는 게 좋습니다.
          </InfoBox>

          <InfoBox>
            한 번 등록하면 어떤 공급처의 운송장이든 동일하게 적용됩니다. 예:
            &quot;대한통운&quot;을 등록하면 A농장, B농장 어디서 보내든 자동
            변환됩니다.
          </InfoBox>
        </div>
      </CollapsibleSection>
    </section>
  )
}

// ─── MAPPING: FRUIT DICTIONARY ───────────────────────────────────

function MappingDictionary() {
  return (
    <section id="mapping-dictionary">
      <CollapsibleSection title="매핑관리 — 과일 사전" icon={BookOpen}>
        <div className="flex flex-col gap-4">
          <Para>
            사이드바 &quot;매핑관리&quot; → &quot;과일 사전&quot;. 시스템이
            상품명에서 과일 종류, 등급, 크기, 무게를 자동으로 알아내게 하는
            사전입니다.
          </Para>

          <div>
            <SubTitle>꼭 등록해야 하나요?</SubTitle>
            <Para>
              아닙니다. 사전 없이도 사과, 참외, 수박 등 40여 종의 과일은 자동
              인식됩니다. 하지만 아래 경우에는 사전 등록이 필요합니다:
            </Para>
            <Spacer />
            <BulletList
              items={[
                '"부사"라고 적힌 걸 "사과"로 알아듣게 하고 싶을 때 (동의어)',
                '4.5kg 주문을 공급처에 5kg으로 발주해야 할 때 (무게 변환)',
                '"프리미엄" = "특상" = "최상급" 같은 등급 통일이 필요할 때',
              ]}
            />
          </div>

          <div>
            <SubTitle>① 카테고리 (과일명)</SubTitle>
            <Para>이 사전의 대분류 이름 1개를 입력합니다.</Para>
            <Spacer />
            <FieldTable
              fields={[
                {
                  name: '카테고리',
                  desc: '과일 대표 이름 1개',
                  required: true,
                  example: '사과',
                },
              ]}
            />
          </div>

          <div>
            <SubTitle>② 키워드</SubTitle>
            <Para>
              이 과일에 해당하는 모든 이름을 쉼표로 구분해서 입력합니다.
              상품명에 이 키워드 중 하나라도 있으면 이 카테고리로 분류됩니다.
            </Para>
            <Spacer />
            <FieldTable
              fields={[
                {
                  name: '키워드',
                  desc: '이 과일의 모든 이름, 쉼표 구분',
                  required: true,
                  example: '사과, 부사, 홍로, 시나노골드',
                },
              ]}
            />
            <Spacer />
            <InfoBox>
              키워드에 &quot;부사&quot;가 있으면 &quot;부사 3kg&quot;도
              &quot;사과&quot;로 인식됩니다. 품목 검토에서 &quot;부사
              3kg&quot;과 &quot;사과 5kg&quot;이 같은 &quot;사과&quot;
              그룹으로 묶여서 표시됩니다.
            </InfoBox>
          </div>

          <div>
            <SubTitle>③ 등급 동의어 (선택)</SubTitle>
            <Para>
              같은 등급을 다르게 부르는 경우의 동의어입니다. [+ 추가] 버튼으로
              그룹을 추가합니다.
            </Para>
            <Spacer />
            <FieldTable
              fields={[
                {
                  name: '대표명',
                  desc: '등급의 표준 이름',
                  required: true,
                  example: '특상',
                },
                {
                  name: '동의어',
                  desc: '같은 뜻의 다른 표현, 쉼표 구분',
                  required: true,
                  example: '프리미엄, 최상급, 특대',
                },
              ]}
            />
            <Spacer />
            <div className="rounded-[8px] bg-gray-50 px-4 py-3 text-[12px] leading-[1.8] text-t-mid">
              예시 — 여러 그룹 등록:
              <br />
              대표명: 특상 / 동의어: 프리미엄, 최상급, 특대
              <br />
              대표명: 상 / 동의어: 일반, 보통, 가정용
              <br />
              대표명: 중 / 동의어: 알뜰, 못난이
            </div>
          </div>

          <div>
            <SubTitle>④ 크기 동의어 (선택)</SubTitle>
            <Para>
              같은 크기를 다르게 부르는 경우의 동의어입니다. 등급 동의어와 같은
              방식으로 [+ 추가] 버튼으로 그룹을 추가합니다.
            </Para>
            <Spacer />
            <div className="rounded-[8px] bg-gray-50 px-4 py-3 text-[12px] leading-[1.8] text-t-mid">
              예시:
              <br />
              대표명: 대과 / 동의어: 대, 큰, L
              <br />
              대표명: 중과 / 동의어: 중, 보통, M
              <br />
              대표명: 소과 / 동의어: 소, 작은, S
            </div>
          </div>

          <div>
            <SubTitle>⑤ 무게 변환 (선택)</SubTitle>
            <Para>
              플랫폼 주문 무게를 공급처 발주 무게로 변환하는 규칙입니다. [+
              추가] 버튼으로 규칙을 추가합니다.
            </Para>
            <Spacer />
            <FieldTable
              fields={[
                {
                  name: '원본',
                  desc: '플랫폼 상품명에 적힌 무게',
                  required: true,
                  example: '4.5kg',
                },
                {
                  name: '변환',
                  desc: '공급처에 발주할 때 쓸 무게',
                  required: true,
                  example: '5kg',
                },
              ]}
            />
            <Spacer />
            <InfoBox>
              쿠팡에 &quot;사과 4.5kg&quot;로 올렸는데 공급처에 4.5kg
              규격이 없고 5kg만 있을 때 → 이 규칙이 있으면 발주서에
              &quot;사과 5kg&quot;으로 자동 변환됩니다.
            </InfoBox>
          </div>

          <div>
            <SubTitle>수정 / 비활성화 / 삭제</SubTitle>
            <SimpleTable
              headers={['동작', '방법']}
              rows={[
                ['수정', '사전 카드의 연필 아이콘 → 수정 → [수정]'],
                ['비활성화', '토글 OFF → 매칭에서 제외 (데이터 유지)'],
                ['활성화 복원', '비활성 목록에서 토글 ON'],
                ['완전삭제', '비활성 목록에서 🗑️ → DB에서 완전히 삭제됨'],
              ]}
            />
          </div>

          <div>
            <SubTitle>예시 — 감귤류 등록</SubTitle>
            <div className="rounded-[8px] bg-gray-50 px-4 py-3 text-[12px] leading-[1.8] text-t-mid">
              카테고리: 감귤
              <br />
              키워드: 감귤, 귤, 밀감, 하우스감귤, 노지감귤
              <br />
              등급 동의어: 특상=로열,S급 / 상=일반
              <br />
              크기 동의어: 소과=2S,꼬마 / 중과=M,중
              <br />
              무게 변환: 3kg→5kg, 4.5kg→5kg
              <br />
              <br />
              결과: &quot;귤 3kg&quot; → 감귤, 무게 5kg으로 변환
              <br />
              결과: &quot;밀감 4.5kg 로열&quot; → 감귤, 특상 등급, 5kg
              <br />
              결과: 품목 검토에서 &quot;귤&quot;과 &quot;밀감&quot;이 같은
              &quot;감귤&quot; 그룹
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </section>
  )
}

// ─── TEMPLATE: ORDER ─────────────────────────────────────────────

function TemplateOrder() {
  return (
    <section id="template-order">
      <CollapsibleSection title="양식 관리 — 발주서 양식" icon={FileText}>
        <div className="flex flex-col gap-4">
          <Para>
            공급처마다 발주서 엑셀 양식이 다릅니다. 양식을 등록해두면 시스템이
            각 공급처 양식에 맞춰서 자동으로 발주서를 만들어줍니다.
          </Para>

          <div>
            <SubTitle>등록 방법</SubTitle>
            <StepList
              steps={[
                '매핑관리 → 공급처 관리 → 공급처 클릭 → 상세 페이지 진입',
                '"발주서 양식" 섹션에서 빈 양식 엑셀 파일 업로드 (공급처에서 받은 빈 양식)',
                '시트 선택 (시트가 여러 개면 데이터가 들어갈 시트)',
                '헤더 행 입력 (컬럼 이름이 적힌 행 번호, 보통 1)',
                '데이터 시작 행 입력 (보통 2)',
                '컬럼 매핑 설정 — 양식의 각 열에 어떤 데이터를 넣을지 지정',
                '[저장] 클릭',
              ]}
            />
          </div>

          <div>
            <SubTitle>컬럼 매핑에서 선택할 수 있는 값</SubTitle>
            <Para>
              양식의 각 열이 나열되고, 드롭다운에서 넣을 데이터를 선택합니다:
            </Para>
            <Spacer />
            <SimpleTable
              headers={['선택값', '설명']}
              rows={[
                [
                  '매칭키 (배송/상품번호)',
                  '쿠팡: 묶음배송번호, 토스: 주문상품번호',
                ],
                ['주문번호', '플랫폼 주문번호'],
                ['주문상품번호', '주문 내 상품번호'],
                [
                  '공급처 상품명',
                  '상품명 변환 규칙이 적용된 이름 (없으면 원본)',
                ],
                [
                  '플랫폼 상품명',
                  '쿠팡=노출상품명(옵션명), 토스=상품명+옵션명',
                ],
                ['공급처 상품코드', '상품명 변환에서 등록한 코드'],
                ['수량', '주문 수량'],
                ['수취인명', '받는 사람 이름'],
                ['수취인 연락처', '받는 사람 전화번호'],
                ['우편번호', '우편번호'],
                ['주소', '배송 주소'],
                ['배송메시지', '배송 시 요청사항'],
                ['주문자명', '주문한 사람 이름'],
                ['주문자 연락처', '주문한 사람 전화번호'],
                ['주문일시', '주문 날짜/시간'],
                ['보내는분 주소', '수취인 주소와 동일'],
                ['빈 칸', '아무것도 안 넣음'],
              ]}
            />
          </div>

          <div>
            <SubTitle>전화번호 형식</SubTitle>
            <Para>
              수취인/주문자 연락처를 선택하면 형식을 추가로 지정합니다:
            </Para>
            <Spacer />
            <SimpleTable
              headers={['형식', '예시']}
              rows={[
                ['원본', '플랫폼에서 받은 그대로'],
                ['하이픈', '010-1234-5678'],
                ['숫자만', '01012345678'],
              ]}
            />
          </div>

          <InfoBox>
            &quot;공급처 상품명&quot;과 &quot;플랫폼 상품명&quot; 차이:
            <br />
            - 공급처 상품명: 상품명 변환 규칙이 적용된 이름 (예: &quot;사과
            3kg&quot;)
            <br />
            - 플랫폼 상품명: 쿠팡/토스 원본 이름 (예: &quot;프리미엄 산지직송
            사과 세트 3kg&quot;)
            <br />
            공급처가 &quot;원본 그대로 보내줘&quot; → 플랫폼 상품명 /
            &quot;우리 이름으로 보내줘&quot; → 공급처 상품명
          </InfoBox>
        </div>
      </CollapsibleSection>
    </section>
  )
}

// ─── TEMPLATE: TRACKING ──────────────────────────────────────────

function TemplateTracking() {
  return (
    <section id="template-tracking">
      <CollapsibleSection title="양식 관리 — 운송장 양식" icon={Settings}>
        <div className="flex flex-col gap-4">
          <Para>
            사이드바 &quot;운송장 양식&quot; 클릭. 쿠팡/토스 셀러 페이지에서
            운송장을 일괄 등록할 때 사용하는 양식 파일입니다. 시스템이 이
            양식에 택배사명과 운송장번호를 자동으로 채워줍니다.
          </Para>

          <div>
            <SubTitle>등록 방법</SubTitle>
            <StepList
              steps={[
                '플랫폼 선택 (쿠팡 또는 토스)',
                '빈 운송장 양식 파일 업로드 (셀러 페이지에서 "운송장 일괄 등록" 양식 다운로드)',
                '시트명 선택',
                '헤더 행 입력 (컬럼명이 있는 행 번호)',
                '데이터 시작 행 입력',
                '컬럼 위치 설정 (아래 참고)',
                '[저장] 클릭',
              ]}
            />
          </div>

          <div>
            <SubTitle>컬럼 위치 설정</SubTitle>
            <SimpleTable
              headers={['설정', '설명', '예시']}
              rows={[
                [
                  '매칭키 컬럼',
                  '플랫폼 매칭번호가 있는 열 번호',
                  '쿠팡: B열(묶음배송번호)',
                ],
                [
                  '택배사 컬럼',
                  '택배사명을 채울 열 번호',
                  '쿠팡: D열(4)',
                ],
                [
                  '운송장번호 컬럼',
                  '운송장번호를 채울 열',
                  '쿠팡: E열(5)',
                ],
                [
                  '주문상태 컬럼 (토스만)',
                  '"배송중"을 채울 열',
                  '토스: D열(4)',
                ],
                [
                  '주문상태 값 (토스만)',
                  '채울 텍스트',
                  '배송중',
                ],
              ]}
            />
          </div>

          <InfoBox>
            플랫폼이 양식을 변경했을 때는 새 양식 파일을 다시 올리고 컬럼
            위치를 확인하세요.
          </InfoBox>
        </div>
      </CollapsibleSection>
    </section>
  )
}

// ─── AUTO ALLOCATION EXPLAINER ───────────────────────────────────

function AutoAllocationExplainer() {
  const steps = [
    {
      icon: PackageSearch,
      label: '상품명 분석',
      desc: '주문의 상품명에서 과일, 중량, 등급을 추출',
    },
    {
      icon: Zap,
      label: '자동 매칭',
      desc: '공급처에 등록된 상품과 비교해서 배정',
    },
    {
      icon: MousePointerClick,
      label: '학습',
      desc: '수동으로 고치면 다음부터 자동 반영',
    },
  ]

  return (
    <section>
      <h2 className="mb-1 text-[17px] font-bold tracking-[-0.02em] text-t-strong">
        자동 배정은 이렇게 작동해요
      </h2>
      <p className="mb-4 text-[12.5px] text-t-mute">
        공급처에 상품을 등록해두면, 주문이 들어올 때 자동으로 맞는 공급처를
        찾아줘요
      </p>
      <div className="flex items-center gap-2">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <div
              key={step.label}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3.5 rounded-[12px] border border-line bg-card px-4 py-3.5 shadow-sm">
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[8px] bg-primary-50 text-primary">
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-t-strong">
                    {step.label}
                  </div>
                  <div className="mt-0.5 text-[11px] text-t-mute">
                    {step.desc}
                  </div>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-shrink-0 text-t-faint">
                  <ChevronRight size={14} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[11.5px] leading-[1.6] text-t-mute">
        처음에는 못 잡는 상품이 있을 수 있지만, 수동으로 배정할 때 &quot;다음에도
        이렇게&quot;를 선택하면 시스템이 기억해서 다음부터 자동으로 잡아요.
        쓸수록 정확해집니다.
      </p>
    </section>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────

type FaqItem = {
  icon: React.ElementType
  question: string
  answer: string
}

const FAQS: FaqItem[] = [
  {
    icon: RefreshCw,
    question: '엑셀을 잘못 올렸어요',
    answer:
      '같은 플랫폼 파일을 다시 올리면 기존 데이터가 새 파일로 교체돼요. 확인 팝업이 뜨니 걱정 마세요.',
  },
  {
    icon: AlertTriangle,
    question: '자동 배정이 틀렸어요',
    answer:
      '공급처 배정 화면에서 드롭다운으로 바로 변경하세요. "기본 변경" 을 선택하면 다음부터 자동으로 맞게 배정돼요.',
  },
  {
    icon: PackageSearch,
    question: '미매칭 운송장이 있어요',
    answer:
      '매칭 결과 화면에서 빨간색 미매칭 건을 클릭하면 주문 목록이 뜨고, 직접 연결할 수 있어요.',
  },
  {
    icon: Zap,
    question: '간편 운송장은 뭔가요?',
    answer:
      '작업건 없이 주문 파일과 운송장을 바로 매칭하는 빠른 모드예요. 운송장 페이지 우상단의 "간편 운송장" 버튼으로 시작합니다. 단, DB에 저장 안 되니 다운로드 후 페이지를 나가세요.',
  },
  {
    icon: Building2,
    question: '공급처를 오늘만 바꾸고 싶어요',
    answer:
      '배정 페이지에서 공급처 칩 클릭 → 새 공급처 → "오늘만 변경" 선택. 내일은 원래대로 자동 배정됩니다.',
  },
  {
    icon: Map,
    question: '새 품목이 나왔어요',
    answer:
      '배정 페이지 "미분류" 그룹에서 공급처를 선택하면 자동으로 품목 매핑에 등록돼요. 다음엔 자동 배정됩니다.',
  },
  {
    icon: BookOpen,
    question: '과일 사전 꼭 등록해야 하나요?',
    answer:
      '아닙니다. 사과, 참외, 수박 등 40여 종은 자동 인식돼요. "부사"를 "사과"로 묶거나, 무게 변환(4.5kg→5kg)이 필요할 때만 등록하세요.',
  },
  {
    icon: Hash,
    question: '토스 엑셀이 안 올라가요',
    answer:
      '토스 엑셀은 특수 구조입니다. 원본 파일을 수정 없이 그대로 올려야 해요. 엑셀을 열어서 저장하면 시트 이름이 바뀌어 파싱에 실패할 수 있습니다.',
  },
  {
    icon: Repeat,
    question: '발주 완료 후 수정하고 싶어요',
    answer:
      '발주서 다운로드 페이지 상단의 초록 배너에서 "발주 되돌리기" → "진행중"으로 돌아감 → 수정 가능합니다.',
  },
  {
    icon: FileText,
    question: '"작업건"이 뭔가요?',
    answer:
      '하루에 한 번 만드는 "오늘의 발주 묶음"입니다. 오늘 올린 주문, 배정, 발주서, 운송장이 이 작업건 안에 관리됩니다. 과거 작업건도 목록에서 확인 가능해요.',
  },
]

function FaqSection() {
  return (
    <section id="faq">
      <h2 className="mb-3.5 text-[17px] font-bold tracking-[-0.02em] text-t-strong">
        <HelpCircle size={18} className="mb-0.5 mr-1.5 inline text-primary" />
        자주 묻는 질문
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {FAQS.map((faq) => {
          const Icon = faq.icon
          return (
            <div
              key={faq.question}
              className="rounded-[14px] border border-line bg-card p-5 shadow-sm"
            >
              <div className="mb-2.5 flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-[8px] bg-primary-50 text-primary">
                  <Icon size={16} />
                </div>
                <span className="text-[13.5px] font-bold text-t-strong">
                  {faq.question}
                </span>
              </div>
              <p className="text-[12px] leading-[1.6] text-t-mid">
                {faq.answer}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── TIPS ────────────────────────────────────────────────────────

const TIPS = [
  '쿠팡/토스 파일을 같이 올려도 자동으로 구분돼요',
  '과일 사전에 동의어를 등록하면 품목 검토에서 자동 그룹핑돼요',
  '공급처 상품을 상세하게 등록할수록 자동 배정 정확도가 올라가요',
  '빨리 처리하고 싶으면 "간편 운송장" 모드를 사용해보세요',
  '배정 페이지에서 "기본 변경"을 누르면 다음에도 같은 공급처로 자동 배정돼요',
  '공급처 상세 페이지에서 상품 카탈로그를 올리면 최저가 추천이 가능해져요',
]

function TipsSection() {
  return (
    <section>
      <h2 className="mb-3.5 text-[17px] font-bold tracking-[-0.02em] text-t-strong">
        <Lightbulb
          size={18}
          className="mb-0.5 mr-1.5 inline text-warning"
        />
        알아두면 좋은 팁
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {TIPS.map((text) => (
          <div
            key={text}
            className="flex items-start gap-3 rounded-[14px] border border-line bg-gray-50 px-5 py-4"
          >
            <Lightbulb
              size={14}
              className="mt-0.5 flex-shrink-0 text-warning"
            />
            <p className="text-[12px] leading-[1.5] text-t-mid">{text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────────

export default function Guide() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-10 py-9 pb-24">
      {/* Header */}
      <section>
        <h1 className="text-[28px] font-bold leading-[1.25] tracking-[-0.02em] text-t-strong">
          사용 가이드
        </h1>
        <p className="mt-2 text-[13px] text-t-mute">
          발주서 만들기부터 매핑 설정까지, 모든 기능을 상세하게 안내합니다
        </p>
      </section>

      <TableOfContents />
      <PrerequisiteSection />
      <DailyWorkflow />
      <AutoAllocationExplainer />
      <OrderProcessDetail />
      <TrackingProcessDetail />

      {/* Mapping sections */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-t-strong">
          <Settings size={18} className="mb-0.5 mr-1.5 inline text-primary" />
          매핑 및 양식 관리
        </h2>
        <p className="-mt-1 mb-1 text-[12.5px] text-t-mute">
          한 번 설정해두면 매일 반복하지 않아도 돼요. 클릭해서 상세 내용을
          확인하세요.
        </p>
        <MappingSupplier />
        <MappingProducts />
        <MappingNames />
        <MappingCouriers />
        <MappingDictionary />
        <TemplateOrder />
        <TemplateTracking />
      </div>

      <FaqSection />
      <TipsSection />
    </div>
  )
}
