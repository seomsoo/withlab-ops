import { useCallback, useRef, useState } from 'react'

import { validateExcelFile } from '@/utils/file'
import { cn } from '@/lib/utils'

import { Upload } from 'lucide-react'
import { toast } from 'sonner'

type FileUploadProps = {
  accept?: string
  maxSizeMb?: number
  disabled?: boolean
  onFileSelect: (file: File) => void
}

export function FileUpload({
  accept = '.xlsx,.xls',
  maxSizeMb = 10,
  disabled = false,
  onFileSelect,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      try {
        validateExcelFile(file, maxSizeMb)
        onFileSelect(file)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '파일 검증 실패')
      }
    },
    [onFileSelect, maxSizeMb]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [disabled, handleFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile]
  )

  return (
    <div
      className={cn(
        'flex w-full cursor-pointer flex-col items-center gap-2 rounded-radius-md border-[1.5px] border-dashed border-line-strong bg-gray-50 px-6 py-8 text-center transition-[border-color,background] duration-150',
        dragging && 'border-primary bg-primary-50',
        disabled && 'cursor-not-allowed opacity-50'
      )}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <div className="grid h-11 w-11 place-items-center rounded-radius-md bg-primary-50 text-primary">
        <Upload size={20} />
      </div>
      <p className="text-sm font-semibold text-t-strong">
        파일을 드래그하거나 클릭하여 업로드
      </p>
      <p className="text-xs text-t-mute">
        .xlsx, .xls 파일 ({maxSizeMb}MB 이하)
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  )
}
