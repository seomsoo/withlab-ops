type EmptyStateProps = {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-radius-lg border border-line bg-card px-6 py-[60px] text-center shadow-sm">
      {icon && <div className="mb-4 text-t-mute">{icon}</div>}
      <h3 className="text-base font-bold tracking-tight text-t-strong">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-[13px] text-t-mute">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
