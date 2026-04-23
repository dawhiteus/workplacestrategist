import { TopBar } from '@/components/layout/TopBar'
import Link from 'next/link'
import { MapPin, GitBranch, Package, ArrowRight } from 'lucide-react'

const TOOLS = [
  {
    href: '/hub-locator',
    icon: MapPin,
    title: 'Hub Locator',
    description: 'Identify optimal dedicated hub locations from real booking patterns. Composite HVS scoring across demand viability, geographic concentration, and economic return.',
    status: 'live' as const,
    metric: 'HVS · DVI · DCI · ERI',
  },
  {
    href: '/scenario-modeler',
    icon: GitBranch,
    title: 'Scenario Modeler',
    description: 'Model portfolio restructuring scenarios — hub vs. flex vs. hybrid — against cost, headcount, and location constraints.',
    status: 'scaffolded' as const,
    metric: 'Coming Q3 2026',
  },
  {
    href: '/portfolio-compiler',
    icon: Package,
    title: 'Portfolio Compiler',
    description: 'Aggregate and normalize workplace data across markets into a single portfolio intelligence layer for exec reporting.',
    status: 'scaffolded' as const,
    metric: 'Coming Q3 2026',
  },
]

export default function StrategyPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Strategy"
        subtitle="Workplace intelligence layer — data-driven portfolio decisions"
        badge="STRATEGY"
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          <div className="mb-6">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1">
              Platform Pillar · Strategy
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              The Strategy layer transforms LiquidSpace booking data into portfolio-level intelligence.
              Each tool surfaces a specific decision: where to hub, how to restructure, what to report.
            </p>
          </div>

          <div className="grid gap-3">
            {TOOLS.map(tool => {
              const Icon = tool.icon
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`group flex items-start gap-4 p-4 rounded border transition-all ${
                    tool.status === 'live'
                      ? 'border-border-default hover:border-accent/30 bg-surface hover:bg-elevated'
                      : 'border-border-subtle bg-surface opacity-60 cursor-default pointer-events-none'
                  }`}
                >
                  <div className={`p-2 rounded border ${
                    tool.status === 'live'
                      ? 'bg-accent/10 border-accent/20 text-accent'
                      : 'bg-elevated border-border-subtle text-muted'
                  }`}>
                    <Icon size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-primary">{tool.title}</span>
                      {tool.status === 'live' ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-bg border border-green-border text-green">
                          LIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-elevated border border-border-subtle text-muted">
                          SOON
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-secondary leading-relaxed mb-2">
                      {tool.description}
                    </p>
                    <div className="text-[10px] font-mono text-muted">{tool.metric}</div>
                  </div>

                  {tool.status === 'live' && (
                    <ArrowRight
                      size={14}
                      className="text-muted group-hover:text-accent transition-colors mt-1 flex-shrink-0"
                    />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
