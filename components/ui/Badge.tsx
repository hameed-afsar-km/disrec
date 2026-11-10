// components/ui/Badge.tsx
import { cn, severityColors, statusColors, sosStatusColors } from '@/lib/utils'
import type { Severity, IncidentStatus, SOSStatus } from '@/lib/types'
import { SEVERITY_LABELS, STATUS_LABELS, SOS_STATUS_LABELS } from '@/lib/types'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'outline'
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        variant === 'outline' && 'border',
        className
      )}
    >
      {children}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { bg, text, dot } = severityColors[severity]
  return (
    <Badge className={cn(bg, text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
      {SEVERITY_LABELS[severity]}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const { bg, text } = statusColors[status]
  return <Badge className={cn(bg, text)}>{STATUS_LABELS[status]}</Badge>
}

export function SOSStatusBadge({ status }: { status: SOSStatus }) {
  const { bg, text } = sosStatusColors[status]
  return <Badge className={cn(bg, text)}>{SOS_STATUS_LABELS[status]}</Badge>
}

