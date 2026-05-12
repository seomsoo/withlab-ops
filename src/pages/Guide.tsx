import { Link } from 'react-router-dom'
import {
  ClipboardList,
  Truck,
  Upload,
  Download,
  Building2,
  ArrowLeftRight,
  FileUp,
  CheckCircle,
  ChevronRight,
  Lightbulb,
  Play,
  BookOpen,
  Zap,
  HelpCircle,
  PackageSearch,
  MousePointerClick,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'

type GuideStep = {
  icon: React.ElementType
  title: string
  description: string
  details?: string[]
}

type ProcessInfo = {
  variant: 'order' | 'tracking'
  stepLabel: string
  icon: React.ElementType
  title: string
  subtitle: string
  steps: GuideStep[]
}

const ORDER_PROCESS: ProcessInfo = {
  variant: 'order',
  stepLabel: 'STEP 01',
  icon: ClipboardList,
  title: '발주 프로세스',
  subtitle: '매일 아침 주문 엑셀을 올려서 공급처별 발주서를 만들어요',
  steps: [
    {
      icon: Play,
      title: '새 발주 작업 시작',
      description: '대시보드에서 작업 이름을 입력하고 시작해요',
      details: [
        '대시보드의 파란 카드를 클릭',
        '작업 이름 입력 (예: "5/12 오전")',
        '시작 버튼 클릭',
      ],
    },
    {
      icon: Upload,
      title: '주문 엑셀 업로드',
      description: '쿠팡/토스에서 다운받은 주문 엑셀을 올려요',
      details: [
        '파일을 드래그하거나 클릭해서 선택',
        '쿠팡/토스 파일을 같이 올려도 자동 구분',
        '같은 플랫폼 파일을 다시 올리면 기존 데이터 교체',
      ],
    },
    {
      icon: Building2,
      title: '공급처 배정',
      description: '시스템이 자동으로 공급처를 배정해요',
      details: [
        '상품명을 분석해서 공급처 자동 배정',
        '틀린 건 드롭다운으로 바로 변경',
        '변경 시 "다음에도 이렇게" 선택하면 자동 학습',
      ],
    },
    {
      icon: Download,
      title: '발주서 다운로드',
      description: '공급처별로 만들어진 발주 엑셀을 받아요',
      details: [
        '각 공급처에 보낼 발주서가 자동 생성',
        '공급처별 양식에 맞춰 자동 포맷팅',
        '한 번에 모두 다운로드 가능',
      ],
    },
  ],
}

const TRACKING_PROCESS: ProcessInfo = {
  variant: 'tracking',
  stepLabel: 'STEP 02',
  icon: Truck,
  title: '운송장 프로세스',
  subtitle:
    '발주 완료 후, 공급처에서 운송장을 받으면 플랫폼에 올릴 파일을 만들어요',
  steps: [
    {
      icon: Upload,
      title: '운송장 업로드',
      description: '공급처에서 받은 운송장 엑셀을 올려요',
      details: [
        '발주 완료된 작업건에서만 가능',
        '공급처별로 따로 올려도 되고 한꺼번에 올려도 OK',
      ],
    },
    {
      icon: CheckCircle,
      title: '매칭 확인',
      description: '운송장 번호와 주문이 자동으로 연결돼요',
      details: [
        '주문번호 기준으로 자동 매칭',
        '빨간색 미매칭 건은 직접 주문을 선택해서 연결',
        '택배사 이름은 플랫폼 형식에 맞게 자동 변환',
      ],
    },
    {
      icon: Download,
      title: '플랫폼 다운로드',
      description: '쿠팡/토스에 올릴 운송장 파일을 받아요',
      details: [
        '쿠팡용, 토스용 파일이 각각 생성',
        '각 플랫폼의 양식에 맞춰 자동 포맷팅',
        '다운받은 파일을 플랫폼에 그대로 업로드',
      ],
    },
  ],
}

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
    description: '거래하는 공급처 정보와 취급 상품을 등록해요',
    href: '/mapping/suppliers',
    required: true,
  },
  {
    icon: FileUp,
    title: '운송장 양식 등록',
    description: '쿠팡/토스 운송장 양식 파일을 올려요',
    href: '/settings/platform-template',
    required: true,
  },
  {
    icon: BookOpen,
    title: '과일 사전 등록',
    description:
      '과일 종류/등급/중량 정보를 등록하면 자동 배정 정확도가 올라가요',
    href: '/mapping/dictionary',
    required: false,
  },
]

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
      '공급처 배정 화면에서 드롭다운으로 바로 변경하세요. "다음에도 이렇게 배정" 을 선택하면 다음부터 자동으로 맞게 배정돼요.',
  },
  {
    icon: PackageSearch,
    question: '미매칭 운송장이 있어요',
    answer:
      '매칭 결과 화면에서 빨간색 미매칭 건을 클릭하면 주문 목록이 뜨고, 직접 연결할 수 있어요.',
  },
  {
    icon: ArrowLeftRight,
    question: '품목 매핑은 언제 쓰나요?',
    answer:
      '자동 배정이 반복적으로 틀리는 상품이 있을 때, 매핑관리에서 "이 상품 = 이 공급처" 를 직접 지정할 수 있어요. 보통은 배정 화면에서 바로 학습시키는 게 더 편해요.',
  },
]

const TIPS = [
  '쿠팡/토스 파일을 같이 올려도 자동으로 구분돼요',
  '공급처 상품을 상세하게 등록할수록 자동 배정 정확도가 올라가요',
  '운송장 매칭은 발주 완료 상태에서만 할 수 있어요',
]

function GuideHeader() {
  return (
    <section>
      <h1 className="text-[28px] font-bold leading-[1.25] tracking-[-0.02em] text-t-strong">
        사용 가이드
      </h1>
      <p className="mt-2 text-[13px] text-t-mute">
        매일 아침 이 순서대로 진행하면 돼요
      </p>
    </section>
  )
}

function PrerequisiteSection() {
  return (
    <section className="rounded-[14px] border border-primary-100 bg-primary-50 p-6">
      <h2 className="text-[15px] font-bold text-primary">처음 사용하시나요?</h2>
      <p className="mt-1 text-[12.5px] text-primary/70">
        시작하기 전에 아래 설정을 먼저 해주세요
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
                  <span className="flex-shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-primary ">
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
        처음에는 못 잡는 상품이 있을 수 있지만, 수동으로 배정할 때 "다음에도
        이렇게" 를 선택하면 시스템이 기억해서 다음부터 자동으로 잡아요. 쓸수록
        정확해집니다.
      </p>
    </section>
  )
}

function ProcessHeader({ process }: { process: ProcessInfo }) {
  const Icon = process.icon
  const isOrder = process.variant === 'order'

  return (
    <div
      className={
        isOrder
          ? 'rounded-[18px] bg-gradient-to-br from-primary to-primary-hover p-6 text-white'
          : 'rounded-[18px] bg-gradient-to-br from-[#1F2937] to-[#0F172A] p-6 text-white dark:from-[#2A3040] dark:to-[#1A2030]'
      }
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/16">
          <Icon size={20} />
        </div>
        <span className="text-[11px] font-bold tracking-[0.08em] text-white/72">
          {process.stepLabel}
        </span>
      </div>
      <div className="mt-4 text-[20px] font-bold tracking-[-0.02em]">
        {process.title}
      </div>
      <p className="mt-1.5 text-[13.5px] leading-[1.55] text-white/78">
        {process.subtitle}
      </p>
    </div>
  )
}

function StepCard({
  step,
  index,
}: {
  step: GuideStep
  index: number
}) {
  const Icon = step.icon

  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-[14px] border border-line bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-[22px] w-[22px] place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
          {index + 1}
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-primary-50 text-primary">
          <Icon size={18} />
        </div>
      </div>
      <div className="text-[14px] font-bold tracking-[-0.01em] text-t-strong">
        {step.title}
      </div>
      <p className="mt-1 text-[12px] leading-[1.5] text-t-mute">
        {step.description}
      </p>
      {step.details && step.details.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
          {step.details.map((detail) => (
            <li
              key={detail}
              className="flex items-start gap-2 text-[11px] leading-[1.5] text-t-mid"
            >
              <span className="mt-[3px] h-1 w-1 flex-shrink-0 rounded-full bg-t-faint" />
              {detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StepFlow({ process }: { process: ProcessInfo }) {
  return (
    <div className="flex items-stretch gap-2">
      {process.steps.map((step, i) => (
        <div
          key={step.title}
          className="flex min-w-0 flex-1 items-stretch gap-2"
        >
          <StepCard step={step} index={i} />
          {i < process.steps.length - 1 && (
            <div className="flex flex-shrink-0 items-center text-t-faint">
              <ChevronRight size={16} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ProcessSection({ process }: { process: ProcessInfo }) {
  return (
    <section className="flex flex-col gap-4">
      <ProcessHeader process={process} />
      <StepFlow process={process} />
    </section>
  )
}

function FaqSection() {
  return (
    <section>
      <h2 className="mb-3.5 text-[17px] font-bold tracking-[-0.02em] text-t-strong">
        <HelpCircle size={18} className="mb-0.5 mr-1.5 inline text-primary" />
        이럴 때는?
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

function TipsSection() {
  return (
    <section>
      <h2 className="mb-3.5 text-[17px] font-bold tracking-[-0.02em] text-t-strong">
        알아두면 좋은 팁
      </h2>
      <div className="flex flex-col gap-2.5">
        {TIPS.map((text) => (
          <div
            key={text}
            className="flex items-start gap-3 rounded-[14px] border border-line bg-gray-50 px-5 py-4 "
          >
            <Lightbulb
              size={16}
              className="mt-0.5 flex-shrink-0 text-warning"
            />
            <p className="text-[13px] leading-[1.5] text-t-mid">{text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Guide() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-10 py-9 pb-24">
      <GuideHeader />
      <PrerequisiteSection />
      <AutoAllocationExplainer />
      <ProcessSection process={ORDER_PROCESS} />
      <ProcessSection process={TRACKING_PROCESS} />
      <FaqSection />
      <TipsSection />
    </div>
  )
}
