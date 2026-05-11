import './tabs.css'

export function Tabs({ value, onChange, items, ariaLabel = 'Navigasjon' }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="tp-tablist">
      {items.map(item => {
        const active = value === item.value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className="tp-tab"
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
