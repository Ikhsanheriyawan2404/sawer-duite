import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { MenuItem } from '../lib/menu'

interface MenuFabProps {
  items: MenuItem[]
}

export function MenuFab({ items }: MenuFabProps) {
  const [open, setOpen] = useState(false)

  return (
    <section className="menu-fab-layer" aria-live="polite">
      <button
        className={`menu-fab ${open ? 'open' : ''}`}
        type="button"
        aria-expanded={open}
        aria-controls="menu-panel"
        aria-label={open ? 'Tutup menu' : 'Buka menu'}
        onClick={() => setOpen(prev => !prev)}
      >
        <span className="menu-fab-ping" aria-hidden="true" />
        <span className="menu-fab-icon">
          <span />
          <span />
          <span />
        </span>
      </button>

      {open && (
        <div className="menu-scrim" onClick={() => setOpen(false)} />
      )}

      <div className={`menu-panel ${open ? 'open' : ''}`} id="menu-panel" role="dialog" aria-label="Navigasi utama">
        <div className="menu-panel-header">
          <div>
            <p className="menu-panel-title">Menu Utama</p>
            <p className="menu-panel-subtitle">Geser untuk lihat semua menu</p>
          </div>
        </div>

        <div className="menu-panel-list">
          {items.map(item => {
            const isDisabled = item.status === 'soon' || (item.requiresUser && !item.to)
            const row = (
              <div className={`menu-row ${isDisabled ? 'disabled' : ''}`}>
                <div className="menu-row-left">
                  <span className="menu-abbr lg">{item.abbr}</span>
                  <div>
                    <p className="menu-title">{item.label}</p>
                    <p className="menu-desc">{item.desc}</p>
                  </div>
                </div>
              </div>
            )

            return isDisabled ? (
              <div key={item.key} className="menu-row-link" aria-disabled="true">
                {row}
              </div>
            ) : (
              <Link key={item.key} to={item.to} className="menu-row-link" onClick={() => setOpen(false)}>
                {row}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
