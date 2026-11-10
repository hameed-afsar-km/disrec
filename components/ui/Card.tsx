// components/ui/Card.tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  id?: string
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className, id, hover, onClick }: CardProps) {
  return (
    <div
      id={id}
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm',
        hover && 'hover:shadow-md hover:border-slate-300 transition-all duration-150 cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-5 py-4 border-b border-slate-100', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-5 py-3 border-t border-slate-100', className)}>
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon,
  color = 'blue',
  trend,
}: {
  label: string
  value: string | number
  icon: ReactNode
  color?: 'blue' | 'red' | 'green' | 'orange' | 'slate'
  trend?: string
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-50 text-slate-600',
  }

  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={cn('p-3 rounded-lg', colorMap[color])}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-500 font-medium truncate">{label}</p>
          <p className="text-2xl font-bold text-[#101b2d] leading-tight">{value}</p>
          {trend && <p className="text-xs text-slate-400 mt-0.5">{trend}</p>}
        </div>
      </CardBody>
    </Card>
  )
}

