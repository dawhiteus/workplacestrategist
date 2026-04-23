'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Download, X, FileText, Table2, Map, Loader2 } from 'lucide-react'
import type { HVSReasoningOutput, MetroSummary } from '@/lib/types'

interface ExportDialogProps {
  hvs: HVSReasoningOutput
  metro: MetroSummary
  enterprise: string
}

const EXPORT_FORMATS = [
  { id: 'pdf', label: 'Executive PDF', description: 'Full Hub Viability report, print-ready', icon: FileText },
  { id: 'csv', label: 'Data Export (CSV)', description: 'Raw demand data + HVS scoring inputs', icon: Table2 },
  { id: 'geojson', label: 'Map Data (GeoJSON)', description: 'Venue locations + recommended hub polygon', icon: Map },
]

export function ExportDialog({ hvs, metro, enterprise }: ExportDialogProps) {
  const [selected, setSelected] = useState('pdf')
  const [exporting, setExporting] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleExport() {
    if (selected === 'pdf') {
      setOpen(false)
      // Give dialog time to unmount before triggering print
      await new Promise(r => setTimeout(r, 200))
      window.print()
      return
    }
    setExporting(true)
    await new Promise(r => setTimeout(r, 1200))
    setExporting(false)
  }

  const metroLabel = `${metro.city}, ${metro.state}`
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-subtle hover:text-body border border-border hover:border-border-strong px-3 py-1.5 rounded-lg transition-colors bg-page hover:bg-ls-50">
          <Download size={12} />
          Export
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[440px] bg-card border border-border rounded-xl shadow-modal p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Dialog.Title className="text-sm font-semibold text-body">
                Export Report
              </Dialog.Title>
              <div className="text-xs text-subtle mt-0.5">
                {metroLabel} · {enterprise} · {dateStr}
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="text-subtle hover:text-body transition-colors p-1 rounded-lg hover:bg-page">
                <X size={14} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {EXPORT_FORMATS.map(fmt => {
              const Icon = fmt.icon
              const isSelected = selected === fmt.id
              return (
                <button
                  key={fmt.id}
                  onClick={() => setSelected(fmt.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? 'border-ls-500 bg-ls-50'
                      : 'border-border hover:border-border-strong hover:bg-page'
                  }`}
                >
                  <Icon size={16} className={isSelected ? 'text-ls-500' : 'text-subtle'} />
                  <div>
                    <div className={`text-xs font-medium ${isSelected ? 'text-ls-500' : 'text-body'}`}>
                      {fmt.label}
                    </div>
                    <div className="text-[10px] text-subtle mt-0.5">{fmt.description}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {selected === 'pdf' && (
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-3 text-xs text-warning">
              <span className="mt-0.5">ⓘ</span>
              <span>In Chrome's print dialog, set <strong>Destination → Save as PDF</strong> and uncheck <strong>Headers and footers</strong> for a clean output.</span>
            </div>
          )}
          <div className="bg-page rounded-lg border border-border p-3 mb-4">
            <div className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">Will include</div>
            {[
              `HVS Composite: ${hvs.hvs_composite}/100 · ${hvs.recommendation.replace(/_/g, ' ')}`,
              `Economic ROI: Net ${hvs.economic_roi.net_saving >= 0 ? '+' : ''}$${Math.abs(hvs.economic_roi.net_saving / 1000).toFixed(0)}K/yr`,
              `Recommended hub: ${hvs.recommended_hub_size.min_seats}–${hvs.recommended_hub_size.max_seats} seats`,
              `${hvs.critical_unknowns.length} critical unknowns flagged`,
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-xs text-body py-0.5">
                <span className="text-ls-500">·</span>
                {item}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="text-xs text-subtle hover:text-body px-3 py-1.5 rounded-lg transition-colors hover:bg-page">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-ls-500 text-white hover:bg-ls-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {exporting ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <Download size={12} />
                  Export {selected.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
