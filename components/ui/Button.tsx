// components/ui/Button.tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

    const variants = {
      primary:
        'bg-[#3182ce] text-white hover:bg-[#2563eb] active:bg-[#1d4ed8] focus-visible:outline-[#3182ce]',
      secondary:
        'bg-[#101b2d] text-white hover:bg-[#16243a] active:bg-[#1e3151] focus-visible:outline-[#101b2d]',
      danger:
        'bg-[#e53945] text-white hover:bg-[#c0252f] active:bg-[#9b1c22] focus-visible:outline-[#e53945]',
      ghost:
        'bg-transparent text-[#101b2d] hover:bg-[#f4f6fa] active:bg-[#e2e8f0] focus-visible:outline-[#3182ce]',
      outline:
        'border border-[#e2e8f0] bg-white text-[#101b2d] hover:bg-[#f4f6fa] active:bg-[#e2e8f0] focus-visible:outline-[#3182ce]',
    }

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

