import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

/**
 * 사용 가이드 글에서 쓰는 블록 모음.
 * 글은 이 블록만으로 쓰고, 클래스를 직접 붙이지 않는다.
 */

type ChildrenProps = { children: React.ReactNode }

/** 글 안의 큰 제목. 오른쪽 "이 페이지" 목차에 잡힌다. */
export function H2({ id, children }: { id: string; children: string }) {
  return (
    <h2
      id={id}
      className="mb-4 mt-14 scroll-mt-24 text-[22px] font-bold leading-[1.4] tracking-[-0.02em] text-t-strong first:mt-0"
    >
      {children}
    </h2>
  )
}

export function H3({ children }: ChildrenProps) {
  return (
    <h3 className="mb-3 mt-9 text-[17px] font-bold leading-[1.5] text-t-strong">
      {children}
    </h3>
  )
}

export function P({ children }: ChildrenProps) {
  return <p className="my-4 text-[16px] leading-[1.8] text-t-mid">{children}</p>
}

/** 화면의 버튼·메뉴·탭 이름 */
export function Ui({ children }: ChildrenProps) {
  return <strong className="font-semibold text-t-strong">{children}</strong>
}

/** 순서대로 따라 하는 단계 */
export function Steps({ children }: ChildrenProps) {
  return (
    <ol className="my-5 flex list-none flex-col gap-3 pl-0 [counter-reset:step]">
      {children}
    </ol>
  )
}

export function Step({ children }: ChildrenProps) {
  return (
    <li className="relative pl-9 text-[16px] leading-[1.75] text-t-mid [counter-increment:step] before:absolute before:left-0 before:top-[3px] before:grid before:h-6 before:w-6 before:place-items-center before:rounded-full before:bg-gray-200 before:text-[13px] before:font-semibold before:text-t-strong before:content-[counter(step)]">
      {children}
    </li>
  )
}

export function Bullets({ children }: ChildrenProps) {
  return <ul className="my-4 flex flex-col gap-2 pl-0">{children}</ul>
}

export function Bullet({ children }: ChildrenProps) {
  return (
    <li className="relative pl-5 text-[16px] leading-[1.75] text-t-mid before:absolute before:left-1.5 before:top-[13px] before:h-[5px] before:w-[5px] before:rounded-full before:bg-t-mute">
      {children}
    </li>
  )
}

const CALLOUT_STYLE = {
  note: { box: 'bg-gray-100', label: 'text-t-strong', text: '참고' },
  warn: { box: 'bg-warning-light', label: 'text-warning-dark', text: '주의' },
} as const

/** 꼭 알아야 할 내용만 담는다. 한 섹션에 하나를 넘지 않게 쓴다. */
export function Callout({
  tone = 'note',
  children,
}: {
  tone?: keyof typeof CALLOUT_STYLE
  children: React.ReactNode
}) {
  const style = CALLOUT_STYLE[tone]
  return (
    <div
      className={cn(
        'my-5 rounded-[14px] px-5 py-4 text-[15px] leading-[1.75] text-t-mid',
        style.box
      )}
    >
      <div className={cn('mb-1 text-[14px] font-bold', style.label)}>
        {style.text}
      </div>
      {children}
    </div>
  )
}

/** 입력값과 결과처럼 그대로 보여 줄 예시 */
export function Example({ children }: ChildrenProps) {
  return (
    <div className="my-5 rounded-[14px] border border-line-strong bg-card px-5 py-4 text-[15px] leading-[1.9] text-t-mid">
      {children}
    </div>
  )
}

/** 세 가지 이상을 나란히 비교할 때만 쓴다 */
export function Table({
  headers,
  rows,
}: {
  headers: string[]
  rows: React.ReactNode[][]
}) {
  return (
    <div className="my-5 overflow-hidden rounded-[14px] border border-line-strong">
      <table className="w-full text-[15px]">
        <thead>
          <tr className="bg-gray-100 text-left text-[14px] text-t-mute">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
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
                  className={cn(
                    'px-4 py-3 align-top leading-[1.65]',
                    j === 0
                      ? 'whitespace-nowrap font-semibold text-t-strong'
                      : 'text-t-mid'
                  )}
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

/** 다른 가이드 글로 가는 링크 */
export function GuideLink({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={`/guide/${to}`}
      className="font-semibold text-primary underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  )
}

/** 앱 화면으로 가는 링크 */
export function AppLink({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className="font-semibold text-primary underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  )
}
