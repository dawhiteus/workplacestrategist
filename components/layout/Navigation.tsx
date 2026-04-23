'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, BarChart3 } from 'lucide-react'
import type { ActiveTool } from './Shell'
import { cn } from '@/lib/utils'

interface NavigationProps {
  activeTool: ActiveTool
  onToolChange: (tool: ActiveTool) => void
}

export function Navigation({ activeTool, onToolChange }: NavigationProps) {
  const pathname = usePathname()
  return (
    <div className="flex-shrink-0">
      {/* Brand */}
      <div className="px-4 py-3 bg-ls-500">
        <div className="text-white font-semibold text-sm leading-tight">LiquidSpace</div>
        <div className="text-ls-200 text-[11px] mt-0.5">Workplace Strategist</div>
      </div>

      <div className="px-3 pt-3 pb-2">
        <div className="text-[10px] font-semibold text-disabled uppercase tracking-widest px-2 mb-1">
          Workplace Strategy
        </div>

        <div className="text-[10px] font-semibold text-disabled uppercase tracking-widest px-2 mb-1 mt-3">
          Strategy Tools
        </div>
        <div className="flex flex-col gap-0.5 pl-2">
              {/* Portfolio Manager — coming soon */}
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-disabled cursor-not-allowed select-none">
                <BarChart3 size={14} className="opacity-40 flex-shrink-0" />
                <span className="opacity-40">Portfolio Manager</span>
                <span className="ml-auto text-[10px] bg-border px-1.5 py-0.5 rounded-pill text-disabled font-medium">
                  Soon
                </span>
              </div>

              {/* Hub Locator */}
              <Link
                href="/hub-locator"
                onClick={() => onToolChange('hub-locator')}
                className={cn(
                  'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  pathname.startsWith('/hub-locator')
                    ? 'bg-ls-500 text-white'
                    : 'text-body hover:bg-ls-50 hover:text-ls-600'
                )}
              >
                <MapPin size={14} className="flex-shrink-0" />
                Hub Locator
              </Link>
            </div>
      </div>

      <div className="mx-3 border-t border-border" />
    </div>
  )
}
