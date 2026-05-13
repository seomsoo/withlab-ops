import { useState } from 'react'
import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

import { useFruitDictionary } from '@/hooks/useFruitDictionary'
import { cn } from '@/lib/utils'

import type { FruitDictionary as FruitDictionaryType, SynonymGroup } from '@/types'

type SynonymGroupForm = {
  canonical: string
  aliasesRaw: string
}

type WeightMappingForm = {
  from: string
  to: string
}

type FormState = {
  category: string
  keywords: string
  gradeSynonyms: SynonymGroupForm[]
  sizeSynonyms: SynonymGroupForm[]
  weightMapping: WeightMappingForm[]
}

const EMPTY_FORM: FormState = {
  category: '',
  keywords: '',
  gradeSynonyms: [],
  sizeSynonyms: [],
  weightMapping: [],
}

function toFormState(d: FruitDictionaryType): FormState {
  return {
    category: d.category,
    keywords: d.keywords.join(', '),
    gradeSynonyms: d.gradeSynonyms.map((g) => ({
      canonical: g.canonical,
      aliasesRaw: g.aliases.join(', '),
    })),
    sizeSynonyms: d.sizeSynonyms.map((g) => ({
      canonical: g.canonical,
      aliasesRaw: g.aliases.join(', '),
    })),
    weightMapping: Object.entries(d.weightMapping).map(([from, to]) => ({
      from,
      to,
    })),
  }
}

function parseSynonymGroups(groups: SynonymGroupForm[]): SynonymGroup[] {
  return groups
    .filter((g) => g.canonical.trim())
    .map((g) => ({
      canonical: g.canonical.trim(),
      aliases: g.aliasesRaw
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    }))
}

export default function FruitDictionary() {
  const { dictionaries, loading, create, update, remove, hardRemove } =
    useFruitDictionary(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (d: FruitDictionaryType) => {
    setEditingId(d.id)
    setForm(toFormState(d))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const keywords = form.keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)

    if (!form.category || keywords.length === 0) {
      toast.error('카테고리와 키워드를 입력해주세요')
      return
    }

    const gradeSynonyms = parseSynonymGroups(form.gradeSynonyms)
    const sizeSynonyms = parseSynonymGroups(form.sizeSynonyms)
    const weightMapping: Record<string, string> = {}
    for (const wm of form.weightMapping) {
      const from = wm.from.trim()
      const to = wm.to.trim()
      if (from && to) weightMapping[from] = to
    }

    try {
      if (editingId) {
        await update(editingId, {
          category: form.category,
          keywords,
          gradeSynonyms,
          sizeSynonyms,
          weightMapping,
        })
      } else {
        await create({
          category: form.category,
          keywords,
          gradeSynonyms,
          sizeSynonyms,
          weightAliases: { kg: ['키로', 'KG', '킬로'] },
          weightMapping,
          isActive: true,
        })
      }
      setDialogOpen(false)
    } catch {
      // toast handled in hook
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
    } catch {
      // toast handled in hook
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await update(id, { isActive: true })
    } catch {
      // toast handled in hook
    }
  }

  const handleHardDelete = async (id: string) => {
    if (!confirm('완전삭제하면 복구할 수 없습니다. 삭제하시겠습니까?')) return
    try {
      await hardRemove(id)
    } catch {
      // toast handled in hook
    }
  }

  const addSynonymGroup = (type: 'grade' | 'size') => {
    const key = type === 'grade' ? 'gradeSynonyms' : 'sizeSynonyms'
    setForm((prev) => ({
      ...prev,
      [key]: [...prev[key], { canonical: '', aliasesRaw: '' }],
    }))
  }

  const updateSynonymGroup = (
    type: 'grade' | 'size',
    index: number,
    field: 'canonical' | 'aliasesRaw',
    value: string
  ) => {
    const key = type === 'grade' ? 'gradeSynonyms' : 'sizeSynonyms'
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((g, i) =>
        i === index ? { ...g, [field]: value } : g
      ),
    }))
  }

  const removeSynonymGroup = (type: 'grade' | 'size', index: number) => {
    const key = type === 'grade' ? 'gradeSynonyms' : 'sizeSynonyms'
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }))
  }

  const addWeightMapping = () => {
    setForm((prev) => ({
      ...prev,
      weightMapping: [...prev.weightMapping, { from: '', to: '' }],
    }))
  }

  const updateWeightMapping = (
    index: number,
    field: 'from' | 'to',
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      weightMapping: prev.weightMapping.map((wm, i) =>
        i === index ? { ...wm, [field]: value } : wm
      ),
    }))
  }

  const removeWeightMapping = (index: number) => {
    setForm((prev) => ({
      ...prev,
      weightMapping: prev.weightMapping.filter((_, i) => i !== index),
    }))
  }

  const activeDicts = dictionaries.filter((d) => d.isActive)
  const inactiveDicts = dictionaries.filter((d) => !d.isActive)

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-t-strong">과일 사전</h1>
          <p className="mt-0.5 text-sm text-t-mute">
            상품명에서 과일 종류/등급/크기를 자동 인식하기 위한 사전입니다
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} className="mr-1" />
          추가
        </Button>
      </div>

      {loading ? (
        <div className="mt-8 text-center text-sm text-t-mute">
          불러오는 중...
        </div>
      ) : activeDicts.length === 0 && inactiveDicts.length === 0 ? (
        <div className="mt-8 text-center text-sm text-t-mute">
          등록된 사전이 없습니다. 참외, 사과 등을 추가해보세요.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {activeDicts.map((d) => (
            <DictionaryCard
              key={d.id}
              dict={d}
              onEdit={() => openEdit(d)}
              onDelete={() => handleDelete(d.id)}
            />
          ))}
          {inactiveDicts.length > 0 && (
            <>
              <p className="mt-6 text-xs font-medium text-t-mute">
                비활성 ({inactiveDicts.length})
              </p>
              {inactiveDicts.map((d) => (
                <DictionaryCard
                  key={d.id}
                  dict={d}
                  onEdit={() => openEdit(d)}
                  onDelete={() => handleDelete(d.id)}
                  onRestore={() => handleRestore(d.id)}
                  onHardDelete={() => handleHardDelete(d.id)}
                  inactive
                />
              ))}
            </>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? '사전 수정' : '사전 추가'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-t-secondary">
                카테고리 (과일명)
              </label>
              <Input
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
                placeholder="참외"
                className="h-9 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-t-secondary">
                키워드 (쉼표 구분)
              </label>
              <Input
                value={form.keywords}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, keywords: e.target.value }))
                }
                placeholder="참외, 꿀참외, 성주참외"
                className="h-9 text-sm"
              />
            </div>

            <SynonymSection
              title="등급 동의어"
              groups={form.gradeSynonyms}
              type="grade"
              onAdd={() => addSynonymGroup('grade')}
              onUpdate={updateSynonymGroup}
              onRemove={removeSynonymGroup}
            />

            <SynonymSection
              title="크기 동의어"
              groups={form.sizeSynonyms}
              type="size"
              onAdd={() => addSynonymGroup('size')}
              onUpdate={updateSynonymGroup}
              onRemove={removeSynonymGroup}
            />

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-t-secondary">
                  무게 변환
                </label>
                <button
                  type="button"
                  onClick={addWeightMapping}
                  className="text-xs text-primary hover:underline"
                >
                  + 추가
                </button>
              </div>
              {form.weightMapping.length === 0 ? (
                <p className="text-xs text-t-mute">
                  등록된 변환 규칙 없음 (예: 4.5kg → 5kg)
                </p>
              ) : (
                <div className="space-y-2">
                  {form.weightMapping.map((wm, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={wm.from}
                        onChange={(e) =>
                          updateWeightMapping(i, 'from', e.target.value)
                        }
                        placeholder="원본 (예: 4.5kg)"
                        className="h-8 w-28 text-xs"
                      />
                      <span className="text-xs text-t-mute">&rarr;</span>
                      <Input
                        value={wm.to}
                        onChange={(e) =>
                          updateWeightMapping(i, 'to', e.target.value)
                        }
                        placeholder="변환 (예: 5kg)"
                        className="h-8 w-28 text-xs"
                      />
                      <button
                        onClick={() => removeWeightMapping(i)}
                        className="shrink-0 text-t-mute hover:text-status-error"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave}>
              {editingId ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DictionaryCard({
  dict,
  onEdit,
  onDelete,
  onRestore,
  onHardDelete,
  inactive,
}: {
  dict: FruitDictionaryType
  onEdit: () => void
  onDelete: () => void
  onRestore?: () => void
  onHardDelete?: () => void
  inactive?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-card px-4 py-3',
        inactive && 'opacity-50'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-t-strong">
            {dict.category}
          </span>
          <span className="text-xs text-t-mute">
            {dict.keywords.join(', ')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {inactive && onRestore && (
            <button
              onClick={onRestore}
              className="rounded p-1.5 text-t-mute hover:bg-blue-50 hover:text-primary"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-t-mute hover:bg-bg-subtle hover:text-t-secondary"
          >
            <Pencil size={14} />
          </button>
          {inactive && onHardDelete ? (
            <button
              onClick={onHardDelete}
              className="rounded p-1.5 text-t-mute hover:bg-red-50 hover:text-status-error"
              title="완전삭제"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <button
              onClick={onDelete}
              className="rounded p-1.5 text-t-mute hover:bg-red-50 hover:text-status-error"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {(dict.gradeSynonyms.length > 0 ||
        dict.sizeSynonyms.length > 0 ||
        Object.keys(dict.weightMapping).length > 0) && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-t-mute">
          {dict.gradeSynonyms.map((g) => (
            <span key={g.canonical}>
              등급: {g.canonical} ({g.aliases.join(', ')})
            </span>
          ))}
          {dict.sizeSynonyms.map((g) => (
            <span key={g.canonical}>
              크기: {g.canonical} ({g.aliases.join(', ')})
            </span>
          ))}
          {Object.entries(dict.weightMapping).map(([from, to]) => (
            <span key={from}>
              무게: {from} &rarr; {to}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function SynonymSection({
  title,
  groups,
  type,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string
  groups: SynonymGroupForm[]
  type: 'grade' | 'size'
  onAdd: () => void
  onUpdate: (
    type: 'grade' | 'size',
    index: number,
    field: 'canonical' | 'aliasesRaw',
    value: string
  ) => void
  onRemove: (type: 'grade' | 'size', index: number) => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-t-secondary">{title}</label>
        <button
          type="button"
          onClick={onAdd}
          className="text-xs text-primary hover:underline"
        >
          + 추가
        </button>
      </div>
      {groups.length === 0 ? (
        <p className="text-xs text-t-mute">등록된 동의어 없음</p>
      ) : (
        <div className="space-y-2">
          {groups.map((g, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={g.canonical}
                onChange={(e) =>
                  onUpdate(type, i, 'canonical', e.target.value)
                }
                placeholder="대표명 (예: 가정용)"
                className="h-8 w-28 text-xs"
              />
              <Input
                value={g.aliasesRaw}
                onChange={(e) =>
                  onUpdate(type, i, 'aliasesRaw', e.target.value)
                }
                placeholder="동의어 (쉼표 구분)"
                className="h-8 flex-1 text-xs"
              />
              <button
                onClick={() => onRemove(type, i)}
                className="shrink-0 text-t-mute hover:text-status-error"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
