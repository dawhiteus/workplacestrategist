import { TopBar } from '@/components/layout/TopBar'
import { Package } from 'lucide-react'

export default function PortfolioCompilerPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Portfolio Compiler"
        subtitle="Aggregate workplace data into portfolio intelligence"
        badge="STRATEGY"
      />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="p-4 rounded-full bg-elevated border border-border-default">
          <Package size={24} className="text-muted" />
        </div>
        <div>
          <div className="text-sm font-medium text-primary mb-1">Portfolio Compiler</div>
          <div className="text-xs text-muted max-w-xs leading-relaxed">
            Normalize and aggregate workplace data across markets into a single portfolio intelligence layer for executive reporting.
            <br /><br />
            <span className="font-mono text-[11px]">Roadmap: Q3 2026</span>
          </div>
        </div>
      </div>
    </div>
  )
}
