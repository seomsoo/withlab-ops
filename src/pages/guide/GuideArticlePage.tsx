import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

import { findGuideArticle, GUIDE_ARTICLES, GUIDE_GROUPS } from './guideArticles'

type Heading = { id: string; text: string }

/** 본문의 H2를 읽어 "이 페이지" 목차를 만들고, 보고 있는 제목을 표시한다 */
function useHeadings(slug: string) {
  const articleRef = useRef<HTMLElement>(null)
  const [headings, setHeadings] = useState<Heading[]>([])
  const [active, setActive] = useState('')

  useEffect(() => {
    const root = articleRef.current
    if (!root) return
    const elements = Array.from(root.querySelectorAll('h2[id]'))
    setHeadings(
      elements.map((el) => ({ id: el.id, text: el.textContent ?? '' }))
    )
    setActive(elements[0]?.id ?? '')

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const first = elements.find((el) => visible.has(el.id))
        if (first) setActive(first.id)
      },
      { rootMargin: '-80px 0px -70% 0px' }
    )
    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [slug])

  return { articleRef, headings, active }
}

export default function GuideArticlePage() {
  const { slug } = useParams()
  const article = findGuideArticle(slug)
  const { articleRef, headings, active } = useHeadings(slug ?? '')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  if (!article) return <Navigate to="/guide" replace />

  const index = GUIDE_ARTICLES.indexOf(article)
  const prev = GUIDE_ARTICLES[index - 1]
  const next = GUIDE_ARTICLES[index + 1]
  const { Content } = article

  return (
    <div className="grid grid-cols-[188px_minmax(0,1fr)_160px] gap-10 pb-32 pt-2">
      <aside>
        <nav className="sticky top-[96px] flex flex-col gap-6">
          <Link
            to="/guide"
            className="px-3 text-[14px] font-semibold text-t-mute hover:text-t-strong"
          >
            가이드 처음으로
          </Link>
          {GUIDE_GROUPS.map((group) => (
            <div key={group}>
              <div className="mb-1.5 px-3 text-[12.5px] font-semibold text-t-faint">
                {group}
              </div>
              <ul className="flex flex-col">
                {GUIDE_ARTICLES.filter((a) => a.group === group).map((a) => (
                  <li key={a.slug}>
                    <Link
                      to={`/guide/${a.slug}`}
                      className={cn(
                        'block rounded-[10px] px-3 py-1.5 text-[14px] leading-[1.5] transition-colors',
                        a.slug === article.slug
                          ? 'bg-card font-semibold text-t-strong'
                          : 'text-t-mute hover:text-t-strong'
                      )}
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <article
        ref={articleRef}
        className="mx-auto w-full max-w-[700px] rounded-[24px] bg-card px-14 py-12"
      >
        <div className="text-[14px] font-semibold text-primary">
          {article.group}
        </div>
        <h1 className="mt-2 text-[32px] font-bold leading-[1.35] tracking-[-0.03em] text-t-strong">
          {article.title}
        </h1>
        <p className="mt-3 text-[17px] leading-[1.7] text-t-mute">
          {article.summary}
        </p>
        <hr className="my-10 border-line" />

        <Content />

        <nav className="mt-16 grid grid-cols-2 gap-3 border-t border-line pt-8">
          {prev ? (
            <Link
              to={`/guide/${prev.slug}`}
              className="group rounded-[14px] border border-line-strong px-5 py-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-1 text-[13px] text-t-mute">
                <ChevronLeft size={14} />
                이전 글
              </div>
              <div className="mt-1 text-[15px] font-semibold text-t-strong">
                {prev.title}
              </div>
            </Link>
          ) : (
            <div />
          )}
          {next && (
            <Link
              to={`/guide/${next.slug}`}
              className="group rounded-[14px] border border-line-strong px-5 py-4 text-right transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-end gap-1 text-[13px] text-t-mute">
                다음 글
                <ChevronRight size={14} />
              </div>
              <div className="mt-1 text-[15px] font-semibold text-t-strong">
                {next.title}
              </div>
            </Link>
          )}
        </nav>
      </article>

      <aside>
        {headings.length > 1 && (
          <nav className="sticky top-[96px]">
            <div className="mb-2 text-[12.5px] font-semibold text-t-faint">
              이 페이지
            </div>
            <ul className="flex flex-col gap-0.5 border-l border-line">
              {headings.map((h) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className={cn(
                      '-ml-px block border-l-2 py-1 pl-3 text-[13px] leading-[1.5] transition-colors',
                      active === h.id
                        ? 'border-primary font-semibold text-t-strong'
                        : 'border-transparent text-t-mute hover:text-t-strong'
                    )}
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </aside>
    </div>
  )
}
