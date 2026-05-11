import { Sun, Moon, Monitor, Check } from 'lucide-react'

import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const OPTIONS = [
  { value: 'system' as const, label: '시스템', icon: Monitor },
  { value: 'light' as const, label: '라이트', icon: Sun },
  { value: 'dark' as const, label: '다크', icon: Moon },
]

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const currentIcon =
    theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  const Icon = currentIcon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-t-mid hover:text-t-strong"
          aria-label="테마 변경"
        >
          <Icon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start">
        {OPTIONS.map((opt) => {
          const OptIcon = opt.icon
          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => setTheme(opt.value)}
            >
              <OptIcon size={16} />
              <span>{opt.label}</span>
              {theme === opt.value && (
                <Check size={14} className="ml-auto text-primary" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
