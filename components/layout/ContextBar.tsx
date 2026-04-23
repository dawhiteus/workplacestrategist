'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, MapPin, Search } from 'lucide-react'
import type { MetroSummary } from '@/lib/types'

interface ContextBarProps {
  metros: MetroSummary[]
  selectedMetro: { city: string; state: string } | null
  onMetroSelect: (city: string, state: string) => void
}

export function ContextBar({ metros, selectedMetro, onMetroSelect }: ContextBarProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = metros.filter(m =>
    `${m.city} ${m.state}`.toLowerCase().includes(search.toLowerCase())
  )

  const label = selectedMetro ? `${selectedMetro.city}, ${selectedMetro.state}` : 'All Markets'

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="no-print flex items-center justify-between px-5 py-2 border-b border-border bg-card text-sm">
      <div className="text-xs font-medium text-subtle uppercase tracking-wider">Context</div>

      <div className="flex items-center gap-2">
        {/* Enterprise chip */}
        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill border border-ls-500 text-ls-600 text-xs font-medium hover:bg-ls-50 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-ls-500 inline-block" />
          Allstate Enterprise
          <ChevronDown size={11} />
        </button>

        {/* Market dropdown */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(o => !o)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pill border text-xs font-medium transition-colors ${
              selectedMetro
                ? 'border-ls-500 text-ls-600 bg-ls-50'
                : 'border-border text-body hover:bg-page'
            }`}
          >
            <MapPin size={11} />
            {label}
            <ChevronDown size={11} />
          </button>

          {open && (
            <div className="absolute top-full mt-1.5 left-0 z-50 w-64 bg-card border border-border rounded-xl shadow-modal overflow-hidden">
              {/* Search */}
              <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center gap-2 bg-page rounded-lg px-2 py-1.5">
                  <Search size={11} className="text-subtle flex-shrink-0" />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search markets…"
                    className="text-xs bg-transparent outline-none text-body placeholder-subtle w-full"
                  />
                </div>
              </div>

              {/* All Markets option */}
              <button
                onClick={() => { onMetroSelect('', ''); setOpen(false); setSearch('') }}
                className="w-full text-left px-3 py-2 text-xs text-subtle hover:bg-page border-b border-border transition-colors"
              >
                All Markets
              </button>

              {/* Metro list */}
              <div className="max-h-64 overflow-y-auto">
                {filtered.slice(0, 40).map(m => (
                  <button
                    key={`${m.city}-${m.state}`}
                    onClick={() => { onMetroSelect(m.city, m.state); setOpen(false); setSearch('') }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                      selectedMetro?.city === m.city && selectedMetro?.state === m.state
                        ? 'bg-ls-50 text-ls-600 font-medium'
                        : 'text-body hover:bg-page'
                    }`}
                  >
                    <span>{m.city}, {m.state}</span>
                    <span className="text-subtle">${Math.round(m.total_spend / 1000)}K</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-3 py-4 text-xs text-subtle text-center">No markets found</div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      <div className="text-subtle text-xs">Data as of {dateStr} · {timeStr}</div>
    </div>
  )
}
