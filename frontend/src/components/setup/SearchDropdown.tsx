'use client'
import { useState, useRef, useEffect } from 'react'

export function SearchDropdown<T>({
  items, getLabel, getSubLabel, getKey, onSelect, placeholder, renderIcon,
  isDisabled, disabledLabel = 'Already selected',
}: {
  items: T[]
  getLabel: (item: T) => string
  getSubLabel?: (item: T) => string
  getKey: (item: T) => string
  onSelect: (item: T) => void
  placeholder: string
  renderIcon?: (item: T) => React.ReactNode
  isDisabled?: (item: T) => boolean
  disabledLabel?: string
}) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = items.filter(i =>
    getLabel(i).toLowerCase().includes(query.toLowerCase()) ||
    (getSubLabel?.(i)?.toLowerCase().includes(query.toLowerCase()) ?? false)
  ).slice(0, 50)

  return (
    <div className="relative" ref={boxRef}>
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--cream)] placeholder-[var(--muted)] outline-none focus:border-[var(--gold)] transition-all"
      />
      {open && (
        <div className="absolute z-20 mt-1.5 w-full max-h-72 overflow-y-auto bg-[var(--dark2)] border border-[var(--border-hi)] rounded-xl shadow-2xl">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-xs text-[var(--muted)]">No matches</div>
          )}
          {filtered.map(item => {
            const disabled = isDisabled?.(item) ?? false
            return (
              <div
                key={getKey(item)}
                onClick={() => { if (disabled) return; onSelect(item); setQuery(''); setOpen(false) }}
                className={`px-4 py-2.5 flex items-center gap-2.5 transition-colors border-b border-[var(--border)] last:border-0 ${
                  disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-[rgba(22,115,199,0.08)]'
                }`}
              >
                {renderIcon?.(item)}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-[var(--cream)] truncate">{getLabel(item)}</div>
                  {getSubLabel && <div className="text-[10px] text-[var(--muted)] truncate">{getSubLabel(item)}</div>}
                </div>
                {disabled && (
                  <div className="text-[9px] text-[var(--gold)] border border-[rgba(22,115,199,0.4)] bg-[rgba(22,115,199,0.1)] px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {disabledLabel}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
