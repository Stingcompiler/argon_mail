'use client';
import { iconLabels, serviceIcons } from '../icons';

/** Icon choice for services and categories, each named for screen readers. */
export function IconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="icon-picker" role="group" aria-label="الأيقونة">
      {Object.entries(serviceIcons).map(([key, Icon]) => (
        <button key={key} type="button" className={value === key ? 'selected' : ''} aria-label={iconLabels[key]} title={iconLabels[key]}
          aria-pressed={value === key} onClick={() => onChange(key)}><Icon size={24} /></button>
      ))}
    </div>
  );
}
