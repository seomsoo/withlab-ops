import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'

import { GUIDE_ARTICLES, GUIDE_GROUPS } from './guideArticles'

import type { GuideArticle } from './guideArticles'

function matches(article: GuideArticle, query: string) {
  const text = [article.title, article.summary, ...article.keywords]
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, '')
  return text.includes(query.toLowerCase().replace(/\s+/g, ''))
}

export default function GuideHome() {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  const results = useMemo(
    () => (trimmed ? GUIDE_ARTICLES.filter((a) => matches(a, trimmed)) : []),
    [trimmed]
  )

  return (
    <div className="mx-auto max-w-[880px] pb-32 pt-6">
      <h1 className="text-[34px] font-bold leading-[1.3] tracking-[-0.03em] text-t-strong">
        사용 가이드
      </h1>
      <p className="mt-3 text-[17px] text-t-mute">
        기능별로 사용법을 정리했습니다. 찾는 내용이 있으면 검색해 보세요.
      </p>

      <label className="mt-8 flex h-14 items-center gap-3 rounded-[16px] bg-card px-5 focus-within:ring-2 focus-within:ring-primary/40">
        <Search size={20} className="text-t-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 가격 미확인, 운송장, 과일 사전"
          className="h-full flex-1 bg-transparent text-[16px] text-t-strong outline-none placeholder:text-t-faint"
        />
      </label>

      {trimmed ? (
        <section className="mt-10">
          <h2 className="mb-3 text-[15px] font-semibold text-t-mute">
            검색 결과 {results.length}개
          </h2>
          {results.length > 0 ? (
            <ArticleList articles={results} />
          ) : (
            <p className="rounded-[16px] bg-card px-6 py-8 text-center text-[15px] text-t-mute">
              맞는 글이 없습니다. 다른 단어로 검색하거나 아래 목록에서
              찾아보세요.
            </p>
          )}
        </section>
      ) : (
        GUIDE_GROUPS.map((group) => (
          <section key={group} className="mt-12">
            <h2 className="mb-3 text-[20px] font-bold tracking-[-0.02em] text-t-strong">
              {group}
            </h2>
            <ArticleList
              articles={GUIDE_ARTICLES.filter((a) => a.group === group)}
            />
          </section>
        ))
      )}
    </div>
  )
}

function ArticleList({ articles }: { articles: GuideArticle[] }) {
  return (
    <div className="overflow-hidden rounded-[18px] bg-card">
      {articles.map((article) => (
        <Link
          key={article.slug}
          to={`/guide/${article.slug}`}
          className="group flex items-center gap-4 border-b border-line px-6 py-5 transition-colors last:border-b-0 hover:bg-gray-50"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[16.5px] font-semibold text-t-strong">
              {article.title}
            </div>
            <div className="mt-1 text-[14.5px] leading-[1.6] text-t-mute">
              {article.summary}
            </div>
          </div>
          <ChevronRight
            size={20}
            className="flex-shrink-0 text-t-faint transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      ))}
    </div>
  )
}
