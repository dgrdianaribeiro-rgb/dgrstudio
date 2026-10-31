'use client';
import { X } from 'lucide-react';

export function Modal({ title, onClose, children, footer, narrow, icon }) {
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={'modal' + (narrow ? ' narrow' : '')}>
        <div className="modal-head">
          {icon}
          <h3>{title}</h3>
          <div className="spacer" />
          <button className="btn ghost icon sm" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Toggle({ on, onChange, children }) {
  return (
    <div className={'toggle' + (on ? ' on' : '')} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span>{children}</span>
      <span className="sw" />
    </div>
  );
}

export function Chips({ options, value, onChange, render }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o.id} className={'chip' + (value === o.id ? ' on' : '')} onClick={() => onChange(o.id)} type="button">
          {render ? render(o) : o.nome}
        </button>
      ))}
    </div>
  );
}
