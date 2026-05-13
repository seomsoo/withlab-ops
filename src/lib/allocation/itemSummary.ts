import { normalizeProductName } from '@/lib/matching/normalizer'
import { extractAttributes } from '@/lib/matching/attributeExtractor'

import type {
  StandardOrder,
  FruitDictionary,
  ItemSummary,
  Platform,
} from '@/types'

type OrderGroup = {
  keyword: string
  orders: StandardOrder[]
  platforms: Set<Platform>
  totalQuantity: number
}

const KNOWN_FRUITS = new Set([
  '사과', '배', '감', '귤', '감귤', '한라봉', '천혜향', '레드향', '황금향',
  '참외', '수박', '멜론', '포도', '샤인머스캣', '머스캣',
  '블루베리', '딸기', '복숭아', '자두', '살구', '체리', '앵두', '매실',
  '망고', '파인애플', '바나나', '키위', '아보카도',
  '오렌지', '자몽', '레몬', '라임', '금귤',
  '토마토', '방울토마토', '무화과', '석류', '유자',
  '청포도', '거봉', '캠벨',
])

export function extractSimpleKeyword(productName: string): string {
  const normalized = normalizeProductName(productName)
  const tokens = normalized.split(/\s+/)

  for (const token of tokens) {
    if (KNOWN_FRUITS.has(token)) return token
  }

  for (const token of tokens) {
    if (/\d/.test(token)) continue
    if (/^[a-z]+$/i.test(token)) continue
    if (token.length < 2) continue
    if (/[가-힣]/.test(token)) return token
  }

  return productName
}

export function buildItemSummaries(
  orders: StandardOrder[],
  fruitDictionary: FruitDictionary[]
): ItemSummary[] {
  const groups = new Map<string, OrderGroup>()

  // UI 그룹핑 용도이므로 비활성 사전도 포함
  const allActive = fruitDictionary.map((d) =>
    d.isActive ? d : { ...d, isActive: true }
  )

  for (const order of orders) {
    const attrs = extractAttributes(
      order.productName,
      order.optionName,
      allActive
    )
    const keyword = attrs.fruit ?? extractSimpleKeyword(order.productName)

    const group = groups.get(keyword)
    if (group) {
      group.orders.push(order)
      group.platforms.add(order.platform)
      group.totalQuantity += order.quantity
    } else {
      groups.set(keyword, {
        keyword,
        orders: [order],
        platforms: new Set([order.platform]),
        totalQuantity: order.quantity,
      })
    }
  }

  const summaries: ItemSummary[] = []
  for (const group of groups.values()) {
    summaries.push({
      keyword: group.keyword,
      orderCount: group.orders.length,
      totalQuantity: group.totalQuantity,
      platforms: [...group.platforms],
      orderIds: group.orders.map((o) => o.id),
      recommendations: [],
      selectedSupplierId: null,
      saveAsDefault: false,
    })
  }

  summaries.sort((a, b) => b.orderCount - a.orderCount)
  return summaries
}
