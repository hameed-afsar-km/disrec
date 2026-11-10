'use client'

import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { cn } from '@/lib/utils'

interface MarkdownProps {
  content: string
  inverted?: boolean
  className?: string
}

export function Markdown({ content, inverted = false, className }: MarkdownProps) {
  const components: Components = {
    p: ({ children }) => (
      <p className={cn('mb-2 last:mb-0', inverted ? 'text-white' : 'text-slate-800')}>{children}</p>
    ),
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    del: ({ children }) => <del className="opacity-70 line-through">{children}</del>,
    h1: ({ children }) => (
      <h1 className="mb-2 mt-4 text-lg font-bold first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-2 mt-4 text-base font-bold first:mt-0">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-1.5 mt-3 text-sm font-bold first:mt-0">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h4>
    ),
    ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote
        className={cn(
          'my-3 border-l-4 pl-3 italic',
          inverted ? 'border-white/40 text-blue-50' : 'border-slate-300 text-slate-600'
        )}
      >
        {children}
      </blockquote>
    ),
    hr: () => <hr className={cn('my-4 border-t', inverted ? 'border-white/20' : 'border-slate-200')} />,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'font-medium underline underline-offset-2',
          inverted ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-700'
        )}
      >
        {children}
      </a>
    ),
    code: ({ className: codeClassName, children }) => {
      const isBlock = Boolean(codeClassName) || String(children).includes('\n')
      return (
        <code
          className={cn(
            'font-mono',
            isBlock
              ? 'text-[12px] leading-relaxed text-slate-100'
              : cn(
                  'rounded px-1.5 py-0.5 text-[0.85em]',
                  inverted ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-800'
                )
          )}
        >
          {children}
        </code>
      )
    },
    pre: ({ children }) => (
      <pre
        className={cn(
          'my-3 overflow-x-auto rounded-xl p-3 text-xs leading-relaxed',
          inverted ? 'bg-slate-950/60 text-slate-100' : 'bg-slate-950 text-slate-100'
        )}
      >
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div
        className={cn(
          'my-3 overflow-x-auto rounded-lg border',
          inverted ? 'border-white/20' : 'border-slate-200'
        )}
      >
        <table className="w-full border-collapse text-left text-xs">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className={cn(inverted ? 'bg-white/10' : 'bg-slate-50')}>{children}</thead>
    ),
    th: ({ children }) => (
      <th className={cn('px-3 py-2 font-semibold', inverted ? 'text-white' : 'text-slate-700')}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={cn('px-3 py-2 align-top', inverted ? 'text-blue-50' : 'text-slate-700')}>
        {children}
      </td>
    ),
    tr: ({ children }) => (
      <tr className={cn('border-b last:border-0', inverted ? 'border-white/15' : 'border-slate-100')}>
        {children}
      </tr>
    ),
    input: ({ type, checked }) =>
      type === 'checkbox' ? (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="mr-1.5 accent-blue-600"
        />
      ) : null,
  }

  return (
    <div className={cn('break-words text-sm leading-relaxed', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        skipHtml
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
