import { AllocationArticle } from './articles/AllocationArticle'
import { AutoAllocationArticle } from './articles/AutoAllocationArticle'
import { CourierMappingArticle } from './articles/CourierMappingArticle'
import { FaqArticle } from './articles/FaqArticle'
import { FruitDictionaryArticle } from './articles/FruitDictionaryArticle'
import { GettingStartedArticle } from './articles/GettingStartedArticle'
import { ItemReviewArticle } from './articles/ItemReviewArticle'
import { NameMappingArticle } from './articles/NameMappingArticle'
import { OrderDownloadArticle } from './articles/OrderDownloadArticle'
import { OrderTemplateArticle } from './articles/OrderTemplateArticle'
import { OrderUploadArticle } from './articles/OrderUploadArticle'
import { ProductMappingArticle } from './articles/ProductMappingArticle'
import { SimpleTrackingArticle } from './articles/SimpleTrackingArticle'
import { SupplierArticle } from './articles/SupplierArticle'
import { TrackingArticle } from './articles/TrackingArticle'
import { TrackingTemplateArticle } from './articles/TrackingTemplateArticle'

export type GuideGroup = '시작하기' | '매일 하는 일' | '설정' | '도움말'

export type GuideArticle = {
  slug: string
  group: GuideGroup
  title: string
  /** 첫 화면 카드와 글 제목 아래에 나오는 한 문장 */
  summary: string
  /** 검색에 쓰는 단어. 제목과 요약에 없는 화면 용어를 넣는다. */
  keywords: string[]
  Content: () => React.ReactNode
}

export const GUIDE_GROUPS: GuideGroup[] = [
  '시작하기',
  '매일 하는 일',
  '설정',
  '도움말',
]

/** 배열 순서가 왼쪽 목록과 이전·다음 글 순서다 */
export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    slug: 'getting-started',
    group: '시작하기',
    title: '처음 설정과 하루 작업 순서',
    summary: '처음 쓰기 전에 해 둘 설정과 매일 하는 작업의 순서를 봅니다.',
    keywords: ['대시보드', '로그인', '처음', '순서'],
    Content: GettingStartedArticle,
  },
  {
    slug: 'auto-allocation',
    group: '시작하기',
    title: '자동 배정은 이렇게 작동합니다',
    summary: '주문이 어떤 기준으로 공급처와 발주 상품에 연결되는지 봅니다.',
    keywords: ['자동 배정', '매칭', '추천', '점수'],
    Content: AutoAllocationArticle,
  },
  {
    slug: 'order-upload',
    group: '매일 하는 일',
    title: '작업건 만들고 주문 올리기',
    summary: '작업건을 만들고 쿠팡·토스 주문 엑셀을 올립니다.',
    keywords: ['작업건', '주문 엑셀', '업로드', '추가', '교체', '별도 파일'],
    Content: OrderUploadArticle,
  },
  {
    slug: 'item-review',
    group: '매일 하는 일',
    title: '품목 검토',
    summary: '오늘 주문을 과일별로 묶어 보고, 필요하면 공급처를 미리 고릅니다.',
    keywords: ['품목 검토', '건너뛰기', '기본 저장', '추천'],
    Content: ItemReviewArticle,
  },
  {
    slug: 'allocation',
    group: '매일 하는 일',
    title: '공급처 배정',
    summary: '자동 배정 결과를 확인하고 미분류·추천·가격 미확인을 처리합니다.',
    keywords: ['미분류', '추천', '가격 미확인', '수량 분배', '재배정', '필터'],
    Content: AllocationArticle,
  },
  {
    slug: 'order-download',
    group: '매일 하는 일',
    title: '발주서 내려받기와 발주 완료',
    summary: '공급처별 발주서와 가격정리를 내려받고 발주를 마무리합니다.',
    keywords: ['발주서', '가격정리', '발주 완료', '되돌리기', '작업건 삭제'],
    Content: OrderDownloadArticle,
  },
  {
    slug: 'tracking',
    group: '매일 하는 일',
    title: '운송장 처리',
    summary:
      '공급처 운송장을 주문과 연결하고 쿠팡·토스에 올릴 파일을 만듭니다.',
    keywords: [
      '운송장',
      '매칭',
      '미매칭',
      '수동 매칭',
      '붙여넣기',
      '플랫폼 파일',
    ],
    Content: TrackingArticle,
  },
  {
    slug: 'simple-tracking',
    group: '매일 하는 일',
    title: '간편 운송장',
    summary: '작업건 없이 주문 파일과 운송장 파일만으로 빠르게 처리합니다.',
    keywords: ['간편', '운송장'],
    Content: SimpleTrackingArticle,
  },
  {
    slug: 'suppliers',
    group: '설정',
    title: '공급처 관리',
    summary: '거래처를 등록하고 상품 목록과 운송장 양식을 관리합니다.',
    keywords: ['공급처', '거래처', '상품 목록', '비활성', '삭제'],
    Content: SupplierArticle,
  },
  {
    slug: 'order-template',
    group: '설정',
    title: '발주서 양식',
    summary: '공급처마다 받는 발주서 양식을 등록하고 칸을 연결합니다.',
    keywords: ['양식', '템플릿', '컬럼', '전화번호'],
    Content: OrderTemplateArticle,
  },
  {
    slug: 'product-mapping',
    group: '설정',
    title: '품목 매핑',
    summary: '어떤 품목을 어느 공급처로 보낼지 정해 둡니다.',
    keywords: ['품목 매핑', '공급처', '자동 배정'],
    Content: ProductMappingArticle,
  },
  {
    slug: 'name-mapping',
    group: '설정',
    title: '상품명 변환',
    summary:
      '플랫폼 상품명을 공급처가 알아보는 이름으로 바꿔 발주서에 넣습니다.',
    keywords: ['상품명', '변환', '발주 상품명'],
    Content: NameMappingArticle,
  },
  {
    slug: 'courier-mapping',
    group: '설정',
    title: '택배사 매핑',
    summary: '공급처가 쓰는 택배사 이름을 쿠팡·토스 표기로 바꿉니다.',
    keywords: ['택배사', 'CJ 대한통운', '매핑 필요'],
    Content: CourierMappingArticle,
  },
  {
    slug: 'fruit-dictionary',
    group: '설정',
    title: '과일 사전',
    summary: '주문 상품명과 공급처 상품명을 이어 주는 단어장을 관리합니다.',
    keywords: [
      '과일 사전',
      '키워드',
      '동의어',
      '크기',
      '무게 변환',
      '가격 미확인',
    ],
    Content: FruitDictionaryArticle,
  },
  {
    slug: 'tracking-template',
    group: '설정',
    title: '운송장 양식',
    summary: '쿠팡·토스에 올릴 빈 운송장 양식을 등록합니다.',
    keywords: ['운송장 양식', '플랫폼 양식', '컬럼 위치'],
    Content: TrackingTemplateArticle,
  },
  {
    slug: 'faq',
    group: '도움말',
    title: '자주 묻는 질문',
    summary: '자주 막히는 상황과 해결 방법을 모았습니다.',
    keywords: ['질문', 'FAQ', '팁', '오류'],
    Content: FaqArticle,
  },
]

export function findGuideArticle(slug: string | undefined) {
  return GUIDE_ARTICLES.find((a) => a.slug === slug)
}
