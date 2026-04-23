import { TopBar } from '@/components/layout/TopBar'
import { GitBranch } from 'lucide-react'

export default function ScenarioModelerPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Scenario Modeler"
        subtitle="Model portfolio restructuring scenarios"
        badge="STRATEGY"
      />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="p-4 rounded-full bg-elevated border border-border-default">
          <GitBranch size={24} className="text-muted" />
        </div>
        <div>
          <div className="text-sm font-medium text-primary mb-1">Scenario Modeler</div>
          <div className="text-xs text-muted max-w-xs leading-relaxed">
            Model hub vs. flex vs. hybrid portfolio configurations against cost, headcount, and location constraints.
            <br /><br />
            <span className="font-mono text-[11px]">Roadmap: Q3 2026</span>
          </div>
        </div>
      </div>
    </div>
  )
}
