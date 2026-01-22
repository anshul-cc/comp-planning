'use client'

interface Scenario {
  id: string
  name: string
  isBaseline: boolean
  _count?: {
    entries: number
  }
}

interface ScenarioSelectorProps {
  scenarios: Scenario[]
  selectedId: string
  onSelect: (id: string) => void
  onAddScenario?: () => void
  disabled?: boolean
}

export function ScenarioSelector({
  scenarios,
  selectedId,
  onSelect,
  onAddScenario,
  disabled = false,
}: ScenarioSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex bg-slate-100 rounded-lg p-1">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario.id)}
            disabled={disabled}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedId === scenario.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {scenario.name}
            {scenario.isBaseline && (
              <span className="ml-1 text-xs text-emerald-600">*</span>
            )}
          </button>
        ))}
      </div>
      {onAddScenario && !disabled && (
        <button
          onClick={onAddScenario}
          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-md"
          title="Add scenario"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}
