import { Layers, Satellite } from 'lucide-react';
import type { MapStyleId } from '../lib/mapbox';
import { cn } from '../lib/utils';

type MapStyleSwitcherProps = {
  currentStyle: MapStyleId;
  onChangeStyle: (style: MapStyleId) => void;
};

const mapStyleOptions: Array<{
  id: MapStyleId;
  label: string;
  icon: typeof Layers;
}> = [
  { id: 'standard', label: 'Normal', icon: Layers },
  { id: 'satellite', label: 'Satelite', icon: Satellite },
];

export function MapStyleSwitcher({ currentStyle, onChangeStyle }: MapStyleSwitcherProps) {
  return (
    <div className="fixed top-3 right-14 z-20 grid rounded-lg border border-slate-200 bg-white/95 p-1 shadow-lg shadow-slate-900/10 backdrop-blur">
      <fieldset
        aria-label="Alternar estilo do mapa"
        className="grid min-w-0 grid-cols-2 gap-1 border-0 p-0"
      >
        {mapStyleOptions.map((option) => {
          const Icon = option.icon;
          const isActive = option.id === currentStyle;

          return (
            <button
              aria-label={`Visao ${option.label}`}
              aria-pressed={isActive}
              className={cn(
                'inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition',
                isActive
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950',
              )}
              key={option.id}
              title={`Visao ${option.label}`}
              type="button"
              onClick={() => onChangeStyle(option.id)}
            >
              <Icon size={14} strokeWidth={2.3} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}
