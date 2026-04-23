'use client'

import { Bell, ChevronDown } from 'lucide-react'

interface TopBarProps {
  title: string
  subtitle?: string
  badge?: string
  actions?: React.ReactNode
}

export function TopBar({ title, subtitle, badge, actions }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border-default bg-surface">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-primary tracking-wide">{title}</h1>
            {badge && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 uppercase tracking-wide">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <div className="text-[11px] text-secondary mt-0.5">{subtitle}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {actions}

        {/* Account selector */}
        <button className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors">
          <span className="font-mono text-[11px] bg-elevated px-2 py-1 rounded border border-border-default">
            ALLSTATE
          </span>
          <ChevronDown size={12} />
        </button>

        {/* Notifications */}
        <button className="relative text-secondary hover:text-primary transition-colors">
          <Bell size={15} />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red text-[8px] text-white flex items-center justify-center font-mono">
            2
          </span>
        </button>
      </div>
    </header>
  )
}
