'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, MapPin, Search, Plus } from 'lucide-react'
import type { MetroSummary } from '@/lib/types'

interface ContextBarProps {
  metros: MetroSummary[]
  selectedMetro: { city: string; state: string } | null
  onMetroSelect: (city: string, state: string) => void
  enterprises: string[]
  selectedEnterprise: string
  onEnterpriseSelect: (name: string) => void
}

export function ContextBar({
  metros,
  selectedMetro,
  onMetroSelect,
  enterprises,
  selectedEnterprise,
  onEnterpriseSelect,
}: ContextBarProps) {
  const [metroOpen, setMetroOpen] = useState(false)
  const [metroSearch, setMetroSearch] = useState('')
  const [enterpriseOpen, setEnterpriseOpen] = useState(false)
  const [enterpriseSearch, setEnterpriseSearch] = useState('')

  const metroRef = useRef<HTMLDivElement>(null)
  const enterpriseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (metroRef.current && !metroRef.current.contains(e.target as Node)) setMetroOpen(false)
      if (enterpriseRef.current && !enterpriseRef.current.contains(e.target as Node)) setEnterpriseOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredMetros = metros.filter(m =>
    `${m.city} ${m.state}`.toLowerCase().includes(metroSearch.toLowerCase())
  )

  const filteredEnterprises = enterprises.filter(e =>
    e.toLowerCase().includes(enterpriseSearch.toLowerCase())
  )

  const metroLabel = selectedMetro ? `${selectedMetro.city}, ${selectedMetro.state}` : 'All Markets'

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="no-print flex items-center justify-between px-5 py-2 border-b border-border bg-card text-sm">
      <div className="text-xs font-medium text-subtle uppercase tracking-wider">Context</div>

      <div className="flex items-center gap-2">
        {/* Enterprise dropdown */}
        <div className="relative" ref={enterpriseRef}>
          <button
            onClick={() => setEnterpriseOpen(o => !o)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill border border-ls-500 text-ls-600 text-xs font-medium hover:bg-ls-50 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-ls-500 inline-block" />
            {selectedEnterprise} Enterprise
            <ChevronDown size={11} />
          </button>

          {enterpriseOpen && (
            <div className="absolute top-full mt-1.5 left-0 z-50 w-72 bg-card border border-border rounded-xl shadow-modal overflow-hidden">
              {/* Search */}
              <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center gap-2 bg-page rounded-lg px-2 py-1.5">
                  <Search size={11} className="text-subtle flex-shrink-0" />
                  <input
                    autoFocus
                    value={enterpriseSearch}
                    onChange={e => setEnterpriseSearch(e.target.value)}
                    placeholder="Search enterprises…"
                    className="text-xs bg-transparent outline-none text-body placeholder-subtle w-full"
                  />
                </div>
              </div>

              {/* New Customer action — always visible at top, above the scrollable list */}
              <button
                onClick={() => {
                  setEnterpriseOpen(false)
                  setEnterpriseSearch('')
                  window.dispatchEvent(new CustomEvent('open-intake-modal'))
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-ls-600 hover:bg-ls-50 transition-colors flex items-center gap-2 border-b border-border"
              >
                <Plus size={11} className="flex-shrink-0" />
                New Customer
              </button>

              {/* Enterprise list */}
              <div className="max-h-64 overflow-y-auto">
                {filteredEnterprises.slice(0, 80).map(name => (
                  <button
                    key={name}
                    onClick={() => {
                      onEnterpriseSelect(name)
                      setEnterpriseOpen(false)
                      setEnterpriseSearch('')
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                      name === selectedEnterprise
                        ? 'bg-ls-50 text-ls-600 font-medium'
                        : 'text-body hover:bg-page'
                    }`}
                  >
                    {name === selectedEnterprise && (
                      <span className="w-1.5 h-1.5 rounded-full bg-ls-500 inline-block flex-shrink-0" />
                    )}
                    {name !== selectedEnterprise && (
                      <span className="w-1.5 h-1.5 inline-block flex-shrink-0" />
                    )}
                    {name}
                  </button>
                ))}
                {filteredEnterprises.length === 0 && (
                  <div className="px-3 py-4 text-xs text-subtle text-center">No enterprises found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Market dropdown */}
        <div className="relative" ref={metroRef}>
          <button
            onClick={() => setMetroOpen(o => !o)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pill border text-xs font-medium transition-colors ${
              selectedMetro
                ? 'border-ls-500 text-ls-600 bg-ls-50'
                : 'border-border text-body hover:bg-page'
            }`}
          >
            <MapPin size={11} />
            {metroLabel}
            <ChevronDown size={11} />
          </button>

          {metroOpen && (
            <div className="absolute top-full mt-1.5 left-0 z-50 w-64 bg-card border border-border rounded-xl shadow-modal overflow-hidden">
              {/* Search */}
              <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center gap-2 bg-page rounded-lg px-2 py-1.5">
                  <Search size={11} className="text-subtle flex-shrink-0" />
                  <input
                    autoFocus
                    value={metroSearch}
                    onChange={e => setMetroSearch(e.target.value)}
                    placeholder="Search markets…"
                    className="text-xs bg-transparent outline-none text-body placeholder-subtle w-full"
                  />
                </div>
              </div>

              {/* All Markets option */}
              <button
                onClick={() => { onMetroSelect('', ''); setMetroOpen(false); setMetroSearch('') }}
                className="w-full text-left px-3 py-2 text-xs text-subtle hover:bg-page border-b border-border transition-colors"
              >
                All Markets
              </button>

              {/* Metro list */}
              <div className="max-h-64 overflow-y-auto">
                {filteredMetros.slice(0, 40).map(m => (
                  <button
                    key={`${m.city}-${m.state}`}
                    onClick={() => { onMetroSelect(m.city, m.state); setMetroOpen(false); setMetroSearch('') }}
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
                {filteredMetros.length === 0 && (
                  <div className="px-3 py-4 text-xs text-subtle text-center">No markets found</div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      <div className="flex items-center gap-3">
        <span className="text-subtle text-xs">Data as of {dateStr} · {timeStr}</span>
      </div>
    </div>
  )
}
