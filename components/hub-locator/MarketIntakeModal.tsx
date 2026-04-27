'use client'

import { useState, useRef, useEffect } from 'react'
import {
  X, ChevronRight, DollarSign, Users, MapPin, Loader2,
  ArrowLeft, AlertCircle,
} from 'lucide-react'
import { PLATFORM_MARKETS } from '@/lib/platform-venues'

// ── Types ────────────────────────────────────────────────────────────────────

type InputMode = 'spend' | 'headcount'

interface FormState {
  city: string
  state: string
  inputMode: InputMode
  monthlySpend: string
  headcount: string
  daysPerWeek: string
  hubCostMonthly: string
  commuteRadiusMiles: string
}

interface MarketIntakeModalProps {
  onClose: () => void
}

// ── Constants ────────────────────────────────────────────────────────────────


const DEFAULT_FORM: FormState = {
  city: '',
  state: '',
  inputMode: 'spend',
  monthlySpend: '',
  headcount: '',
  daysPerWeek: '',
  hubCostMonthly: '8000',
  commuteRadiusMiles: '30',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrencyInput(raw: string): string {
  const num = parseInt(raw.replace(/[^0-9]/g, ''), 10)
  if (isNaN(num)) return ''
  return num.toLocaleString()
}

function parseNumericInput(val: string): number {
  return parseInt(val.replace(/[^0-9]/g, ''), 10) || 0
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className={`rounded-full transition-all ${
            s === step
              ? 'w-5 h-1.5 bg-ls-500'
              : s < step
              ? 'w-1.5 h-1.5 bg-ls-300'
              : 'w-1.5 h-1.5 bg-border'
          }`}
        />
      ))}
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-body mb-1.5">
      {children}
      {required && <span className="text-danger ml-0.5">*</span>}
    </label>
  )
}

function InputField({
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  prefix?: string
  suffix?: string
  type?: string
}) {
  return (
    <div className="flex items-center bg-page border border-border rounded-lg px-3 py-2 focus-within:border-ls-400 focus-within:ring-1 focus-within:ring-ls-100 transition-all">
      {prefix && <span className="text-subtle text-sm mr-1.5 flex-shrink-0">{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm text-body placeholder-subtle min-w-0"
      />
      {suffix && <span className="text-subtle text-xs ml-1.5 flex-shrink-0">{suffix}</span>}
    </div>
  )
}

// ── US city → state lookup ────────────────────────────────────────────────────

const US_CITIES: [string, string][] = [
  ['Anchorage','AK'],['Fairbanks','AK'],['Juneau','AK'],
  ['Birmingham','AL'],['Huntsville','AL'],['Mobile','AL'],['Montgomery','AL'],
  ['Fayetteville','AR'],['Fort Smith','AR'],['Little Rock','AR'],
  ['Chandler','AZ'],['Gilbert','AZ'],['Glendale','AZ'],['Mesa','AZ'],['Phoenix','AZ'],['Scottsdale','AZ'],['Tempe','AZ'],['Tucson','AZ'],
  ['Anaheim','CA'],['Bakersfield','CA'],['Burbank','CA'],['Chula Vista','CA'],['Concord','CA'],['El Segundo','CA'],['Encino','CA'],['Fremont','CA'],['Fresno','CA'],['Glendale','CA'],['Irvine','CA'],['Long Beach','CA'],['Los Angeles','CA'],['Modesto','CA'],['Oakland','CA'],['Palo Alto','CA'],['Pasadena','CA'],['Pleasanton','CA'],['Riverside','CA'],['Roseville','CA'],['Sacramento','CA'],['San Diego','CA'],['San Francisco','CA'],['San Jose','CA'],['San Ramon','CA'],['Santa Ana','CA'],['Santa Clara','CA'],['Santa Monica','CA'],['Stockton','CA'],['Sunnyvale','CA'],['Turlock','CA'],
  ['Aurora','CO'],['Colorado Springs','CO'],['Denver','CO'],['Fort Collins','CO'],['Greenwood Village','CO'],
  ['Bridgeport','CT'],['Hartford','CT'],['New Haven','CT'],['Rocky Hill','CT'],['Stamford','CT'],
  ['Dover','DE'],['Wilmington','DE'],
  ['Jacksonville','FL'],['Miami','FL'],['Fort Lauderdale','FL'],['Gainesville','FL'],['Hialeah','FL'],['Orlando','FL'],['Pensacola','FL'],['St. Petersburg','FL'],['Tallahassee','FL'],['Tampa','FL'],
  ['Athens','GA'],['Atlanta','GA'],['Augusta','GA'],['Columbus','GA'],['Decatur','GA'],['Savannah','GA'],
  ['Honolulu','HI'],
  ['Boise','ID'],['Meridian','ID'],
  ['Aurora','IL'],['Chicago','IL'],['Deerfield','IL'],['Joliet','IL'],['Naperville','IL'],['Peoria','IL'],['Rockford','IL'],['Springfield','IL'],
  ['Carmel','IN'],['Evansville','IN'],['Fort Wayne','IN'],['Indianapolis','IN'],['South Bend','IN'],
  ['Cedar Rapids','IA'],['Des Moines','IA'],
  ['Kansas City','KS'],['Overland Park','KS'],['Topeka','KS'],['Wichita','KS'],
  ['Lexington','KY'],['Louisville','KY'],
  ['Baton Rouge','LA'],['New Orleans','LA'],['Shreveport','LA'],
  ['Boston','MA'],['Cambridge','MA'],['Dedham','MA'],['Lowell','MA'],['Springfield','MA'],['Worcester','MA'],
  ['Annapolis','MD'],['Baltimore','MD'],['Columbia','MD'],['Frederick','MD'],['Rockville','MD'],
  ['Augusta','ME'],['Portland','ME'],
  ['Ann Arbor','MI'],['Detroit','MI'],['Grand Rapids','MI'],['Lansing','MI'],['Sterling Heights','MI'],['Warren','MI'],
  ['Duluth','MN'],['Minneapolis','MN'],['Rochester','MN'],['Saint Paul','MN'],
  ['Independence','MO'],['Kansas City','MO'],['Saint Charles','MO'],['Saint Louis','MO'],['Springfield','MO'],
  ['Jackson','MS'],
  ['Billings','MT'],['Helena','MT'],['Missoula','MT'],
  ['Charlotte','NC'],['Durham','NC'],['Greensboro','NC'],['Raleigh','NC'],['Winston-Salem','NC'],
  ['Fargo','ND'],
  ['Lincoln','NE'],['Omaha','NE'],
  ['Manchester','NH'],['Nashua','NH'],
  ['Cherry Hill','NJ'],['Jersey City','NJ'],['Newark','NJ'],['Trenton','NJ'],
  ['Albuquerque','NM'],['Santa Fe','NM'],
  ['Henderson','NV'],['Las Vegas','NV'],['Reno','NV'],
  ['Albany','NY'],['Bronx','NY'],['Brooklyn','NY'],['Buffalo','NY'],['Manhattan','NY'],['New York','NY'],['Queens','NY'],['Rochester','NY'],['Staten Island','NY'],['Syracuse','NY'],['White Plains','NY'],['Yonkers','NY'],
  ['Akron','OH'],['Cincinnati','OH'],['Cleveland','OH'],['Columbus','OH'],['Dayton','OH'],['Toledo','OH'],
  ['Oklahoma City','OK'],['Tulsa','OK'],
  ['Eugene','OR'],['Hillsboro','OR'],['Portland','OR'],['Salem','OR'],
  ['Allentown','PA'],['Philadelphia','PA'],['Pittsburgh','PA'],['Reading','PA'],['Scranton','PA'],
  ['Providence','RI'],
  ['Charleston','SC'],['Columbia','SC'],['Greenville','SC'],
  ['Sioux Falls','SD'],
  ['Chattanooga','TN'],['Clarksville','TN'],['Knoxville','TN'],['Memphis','TN'],['Nashville','TN'],
  ['Arlington','TX'],['Austin','TX'],['Corpus Christi','TX'],['Dallas','TX'],['El Paso','TX'],['Fort Worth','TX'],['Frisco','TX'],['Garland','TX'],['Houston','TX'],['Irving','TX'],['Lubbock','TX'],['McKinney','TX'],['Plano','TX'],['San Antonio','TX'],['Waco','TX'],
  ['Provo','UT'],['Salt Lake City','UT'],['Sandy','UT'],['West Valley City','UT'],
  ['Arlington','VA'],['Chesapeake','VA'],['Norfolk','VA'],['Reston','VA'],['Richmond','VA'],['Roanoke','VA'],['Virginia Beach','VA'],
  ['Burlington','VT'],['Montpelier','VT'],
  ['Bellevue','WA'],['Seattle','WA'],['Spokane','WA'],['Tacoma','WA'],['Vancouver','WA'],
  ['Green Bay','WI'],['Madison','WI'],['Milwaukee','WI'],
  ['Charleston','WV'],
  ['Casper','WY'],['Cheyenne','WY'],
  ['Washington','DC'],
]

// ── Step 1: Market entry ──────────────────────────────────────────────────────

function StepMarket({
  form,
  onSelect,
}: {
  form: FormState
  onSelect: (city: string, state: string) => void
}) {
  const [query, setQuery] = useState(
    form.city ? `${form.city}, ${form.state}` : ''
  )
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const suggestions = query.trim().length < 1 ? [] : US_CITIES.filter(([city, state]) =>
    `${city}, ${state}`.toLowerCase().startsWith(query.toLowerCase()) ||
    city.toLowerCase().startsWith(query.toLowerCase())
  ).slice(0, 8)

  function commit(city: string, state: string) {
    onSelect(city, state)
    setQuery(`${city}, ${state}`)
    setOpen(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setActiveIdx(0)
    setOpen(true)
    // Clear selection if user edits after picking
    if (form.city) onSelect('', '')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); const s = suggestions[activeIdx]; if (s) commit(s[0], s[1]) }
    if (e.key === 'Escape')    { setOpen(false) }
  }

  const confirmed = !!form.city && !!form.state

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-base font-semibold text-body mb-0.5">Which market are you evaluating?</div>
        <div className="text-xs text-subtle">Type a city — we'll infer the state.</div>
      </div>

      <div className="relative">
        <div className={`flex items-center bg-page border rounded-lg px-3 py-2.5 transition-all ${
          confirmed ? 'border-ls-400 ring-1 ring-ls-100' : 'border-border focus-within:border-ls-400 focus-within:ring-1 focus-within:ring-ls-100'
        }`}>
          <MapPin size={13} className={`mr-2 flex-shrink-0 ${confirmed ? 'text-ls-500' : 'text-subtle'}`} />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Chicago"
            className="flex-1 bg-transparent outline-none text-sm text-body placeholder-subtle"
          />
          {confirmed && (
            <span className="text-[10px] font-medium text-ls-600 bg-ls-50 px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0">
              {form.state}
            </span>
          )}
        </div>

        {open && suggestions.length > 0 && (
          <div
            ref={listRef}
            className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-modal overflow-hidden"
          >
            {suggestions.map(([city, state], i) => (
              <button
                key={`${city}-${state}`}
                onMouseDown={() => commit(city, state)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                  i === activeIdx ? 'bg-ls-50 text-ls-700' : 'text-body hover:bg-page'
                }`}
              >
                <span>{city}</span>
                <span className="text-xs text-subtle ml-2">{state}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 2: Data entry (forced) ───────────────────────────────────────────────

function StepData({
  form,
  onChange,
}: {
  form: FormState
  onChange: (updates: Partial<FormState>) => void
}) {
  const market = PLATFORM_MARKETS.find(m => m.city === form.city && m.state === form.state)
  const rate = market?.avgRatePerBooking ?? 185

  // Derived preview
  let previewAnnual = 0
  if (form.inputMode === 'spend') {
    previewAnnual = parseNumericInput(form.monthlySpend) * 12
  } else {
    const hc = parseNumericInput(form.headcount)
    const dpw = parseFloat(form.daysPerWeek) || 0
    previewAnnual = hc * dpw * 52 * rate
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-base font-semibold text-body mb-0.5">{form.city}, {form.state} — Enter spend data</div>
        <div className="text-xs text-subtle leading-relaxed">
          Hub economics require real spend data. Choose how you want to enter it — both paths
          produce the same analysis.
        </div>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Spend mode */}
        <button
          onClick={() => onChange({ inputMode: 'spend' })}
          className={`flex flex-col gap-2 p-3.5 rounded-xl border-2 text-left transition-all ${
            form.inputMode === 'spend'
              ? 'border-ls-500 bg-ls-50'
              : 'border-border hover:border-ls-200 bg-card'
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            form.inputMode === 'spend' ? 'bg-ls-500' : 'bg-page border border-border'
          }`}>
            <DollarSign size={13} className={form.inputMode === 'spend' ? 'text-white' : 'text-subtle'} />
          </div>
          <div>
            <div className={`text-xs font-semibold mb-0.5 ${form.inputMode === 'spend' ? 'text-ls-700' : 'text-body'}`}>
              Monthly flex spend
            </div>
            <div className="text-[10px] text-subtle leading-snug">
              I know what we currently spend on flex workspace each month
            </div>
          </div>
        </button>

        {/* Headcount mode */}
        <button
          onClick={() => onChange({ inputMode: 'headcount' })}
          className={`flex flex-col gap-2 p-3.5 rounded-xl border-2 text-left transition-all ${
            form.inputMode === 'headcount'
              ? 'border-ls-500 bg-ls-50'
              : 'border-border hover:border-ls-200 bg-card'
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            form.inputMode === 'headcount' ? 'bg-ls-500' : 'bg-page border border-border'
          }`}>
            <Users size={13} className={form.inputMode === 'headcount' ? 'text-white' : 'text-subtle'} />
          </div>
          <div>
            <div className={`text-xs font-semibold mb-0.5 ${form.inputMode === 'headcount' ? 'text-ls-700' : 'text-body'}`}>
              Headcount + days/week
            </div>
            <div className="text-[10px] text-subtle leading-snug">
              I know how many employees use flex space and how often
            </div>
          </div>
        </button>
      </div>

      {/* Input fields */}
      {form.inputMode === 'spend' ? (
        <div>
          <FieldLabel required>Monthly flex spend in {form.city}</FieldLabel>
          <InputField
            value={form.monthlySpend}
            onChange={v => onChange({ monthlySpend: v.replace(/[^0-9]/g, '') })}
            placeholder="e.g. 12000"
            prefix="$"
            suffix="/mo"
          />
          <div className="text-[10px] text-subtle mt-1.5">
            Total paid for flex workspaces, desks, and meeting rooms in this market each month.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>Employees using flex in {form.city}</FieldLabel>
            <InputField
              value={form.headcount}
              onChange={v => onChange({ headcount: v.replace(/[^0-9]/g, '') })}
              placeholder="e.g. 45"
            />
          </div>
          <div>
            <FieldLabel required>Avg days/week per employee</FieldLabel>
            <InputField
              value={form.daysPerWeek}
              onChange={v => onChange({ daysPerWeek: v })}
              placeholder="e.g. 2.5"
              suffix="days"
            />
            <div className="text-[10px] text-subtle mt-1.5">
              Platform avg in {form.city}: ${rate}/booking
            </div>
          </div>
        </div>
      )}

      {/* Annual preview */}
      {previewAnnual > 0 && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-ls-50 border border-ls-100 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-ls-500 flex-shrink-0" />
          <div className="text-xs text-ls-700">
            <span className="font-semibold">${Math.round(previewAnnual).toLocaleString()}/yr</span>
            <span className="text-ls-500 ml-1">estimated annual flex spend · basis for hub ROI</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Step 3: Hub parameters ────────────────────────────────────────────────────

function StepParams({
  form,
  onChange,
  onSubmit,
  isLoading,
  error,
}: {
  form: FormState
  onChange: (updates: Partial<FormState>) => void
  onSubmit: () => void
  isLoading: boolean
  error: string | null
}) {
  const hubCost = parseNumericInput(form.hubCostMonthly)
  const radius = parseNumericInput(form.commuteRadiusMiles)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-base font-semibold text-body mb-0.5">Hub parameters</div>
        <div className="text-xs text-subtle">
          Set the economics assumptions. You can adjust these after seeing the analysis.
        </div>
      </div>

      {/* Hub cost */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Estimated hub cost</FieldLabel>
          <span className="text-sm font-bold text-body tabular-nums">
            ${hubCost.toLocaleString()}<span className="text-xs font-normal text-subtle">/mo</span>
          </span>
        </div>
        <input
          type="range"
          min={2000}
          max={25000}
          step={500}
          value={hubCost || 8000}
          onChange={e => onChange({ hubCostMonthly: e.target.value })}
          className="w-full accent-ls-500"
        />
        <div className="flex justify-between text-[10px] text-subtle mt-0.5">
          <span>$2K</span>
          <span className="text-subtle">Typical: $6K–$12K/mo</span>
          <span>$25K</span>
        </div>
      </div>

      {/* Commute radius */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Commute radius</FieldLabel>
          <span className="text-sm font-bold text-body tabular-nums">
            {radius} <span className="text-xs font-normal text-subtle">miles</span>
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={60}
          step={5}
          value={radius || 30}
          onChange={e => onChange({ commuteRadiusMiles: e.target.value })}
          className="w-full accent-ls-500"
        />
        <div className="flex justify-between text-[10px] text-subtle mt-0.5">
          <span>5 mi</span>
          <span>60 mi</span>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-page border border-border rounded-lg px-3.5 py-3 text-xs">
        <div className="font-semibold text-body mb-1.5">Analysis summary</div>
        <div className="flex flex-col gap-1 text-subtle">
          <div className="flex justify-between">
            <span>Market</span>
            <span className="font-medium text-body">{form.city}, {form.state}</span>
          </div>
          <div className="flex justify-between">
            <span>Data input</span>
            <span className="font-medium text-body">
              {form.inputMode === 'spend'
                ? `$${parseNumericInput(form.monthlySpend).toLocaleString()}/mo flex spend`
                : `${form.headcount} employees · ${form.daysPerWeek} days/wk`}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Hub cost</span>
            <span className="font-medium text-body">${hubCost.toLocaleString()}/mo</span>
          </div>
          <div className="flex justify-between">
            <span>Commute radius</span>
            <span className="font-medium text-body">{radius} miles</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-danger">
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full py-2.5 rounded-lg bg-ls-500 hover:bg-ls-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Running analysis…
          </>
        ) : (
          'Run Hub Analysis →'
        )}
      </button>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function MarketIntakeModal({ onClose }: MarketIntakeModalProps) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateForm(updates: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...updates }))
  }

  function canAdvance(): boolean {
    if (step === 1) return !!form.city && !!form.state
    if (step === 2) {
      if (form.inputMode === 'spend') return parseNumericInput(form.monthlySpend) > 0
      return parseNumericInput(form.headcount) > 0 && parseFloat(form.daysPerWeek) > 0
    }
    return true
  }

  async function handleSubmit() {
    setError(null)
    setIsLoading(true)
    try {
      const body: Record<string, unknown> = {
        city: form.city,
        state: form.state,
        inputMode: form.inputMode,
        hubCostMonthly: parseNumericInput(form.hubCostMonthly) || 8000,
        commuteRadiusMiles: parseNumericInput(form.commuteRadiusMiles) || 30,
      }
      if (form.inputMode === 'spend') {
        body.monthlySpend = parseNumericInput(form.monthlySpend)
      } else {
        body.headcount = parseNumericInput(form.headcount)
        body.daysPerWeek = parseFloat(form.daysPerWeek)
      }

      const res = await fetch('/api/pulse/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError((err as Record<string, string>).error || 'Analysis failed. Please try again.')
        return
      }

      const data = await res.json()
      // Dispatch event so Shell can pick up the pre-fetched analysis
      window.dispatchEvent(new CustomEvent('load-intake-analysis', { detail: { data } }))
      onClose()
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Backdrop click to close
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-page"
      onClick={handleBackdropClick}
    >
      <div className="w-[480px] bg-card border border-border rounded-2xl shadow-modal flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="text-subtle hover:text-body transition-colors"
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <div>
              <div className="text-sm font-semibold text-body">New Customer</div>
              <div className="text-[10px] text-subtle">Step {step} of 3</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StepDots step={step} />
            <button onClick={onClose} className="text-subtle hover:text-body transition-colors ml-1">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body — overflow-visible on step 1 so autocomplete dropdown isn't clipped */}
        <div className={`flex-1 px-5 py-5 ${step === 1 ? 'overflow-visible' : 'overflow-y-auto'}`}>
          {step === 1 && (
            <StepMarket
              form={form}
              onSelect={(city, state) => updateForm({ city, state })}
            />
          )}
          {step === 2 && (
            <StepData form={form} onChange={updateForm} />
          )}
          {step === 3 && (
            <StepParams
              form={form}
              onChange={updateForm}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              error={error}
            />
          )}
        </div>

        {/* Footer — only for steps 1 and 2 */}
        {step < 3 && (
          <div className="px-5 pb-5 flex-shrink-0">
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="w-full py-2.5 rounded-lg bg-ls-500 hover:bg-ls-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              {step === 1 ? (form.city ? `Continue with ${form.city}` : 'Select a market to continue') : 'Review & run'}
              {canAdvance() && <ChevronRight size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
