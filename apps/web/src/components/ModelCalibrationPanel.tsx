import type { Dispatch, SetStateAction } from 'react';
import type { ModelCalibration } from '../types/geo';
import { formControlClassName, labelTextClassName } from './styles';

type ModelCalibrationPanelProps = {
  calibration: ModelCalibration;
  onClose: () => void;
  onChange: Dispatch<SetStateAction<ModelCalibration>>;
};

type CalibrationField = {
  key: keyof ModelCalibration;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
};

const calibrationFields: CalibrationField[] = [
  {
    key: 'offsetEastMeters',
    label: 'Leste',
    min: -120,
    max: 120,
    step: 1,
    suffix: 'm',
  },
  {
    key: 'offsetNorthMeters',
    label: 'Norte',
    min: -120,
    max: 120,
    step: 1,
    suffix: 'm',
  },
  {
    key: 'scaleX',
    label: 'Escala X',
    min: 0.1,
    max: 3,
    step: 0.05,
    suffix: 'x',
  },
  {
    key: 'scaleY',
    label: 'Escala Y',
    min: 0.1,
    max: 3,
    step: 0.05,
    suffix: 'x',
  },
  {
    key: 'scaleZ',
    label: 'Altura',
    min: 0.1,
    max: 4,
    step: 0.05,
    suffix: 'x',
  },
  {
    key: 'rotationZ',
    label: 'Rotacao',
    min: 0,
    max: 360,
    step: 1,
    suffix: 'deg',
  },
  {
    key: 'clipRadiusMeters',
    label: 'Recorte',
    min: 10,
    max: 200,
    step: 5,
    suffix: 'm',
  },
];

export function ModelCalibrationPanel({
  calibration,
  onClose,
  onChange,
}: ModelCalibrationPanelProps) {
  return (
    <aside
      className="fixed right-6 bottom-6 z-20 grid max-h-[calc(100vh-48px)] w-[min(360px,calc(100vw-48px))] gap-3 overflow-y-auto rounded-lg border border-slate-300/70 bg-white p-4 font-sans text-slate-900 shadow-[0_12px_32px_rgb(15_23_42_/_16%)] max-[720px]:right-3 max-[720px]:bottom-3 max-[720px]:max-h-[72vh] max-[720px]:w-[min(340px,calc(100vw-24px))]"
      aria-label="Calibracao do modelo 3D"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-base font-semibold leading-tight">Calibracao 3D</h2>
        <div className="flex gap-2">
          <button
            className="min-h-8 cursor-pointer rounded-md border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-700"
            type="button"
            onClick={() =>
              onChange({
                offsetEastMeters: 0,
                offsetNorthMeters: 0,
                scaleX: 0.8,
                scaleY: 0.8,
                scaleZ: 1.2,
                rotationZ: 35,
                clipRadiusMeters: 120,
              })
            }
          >
            Reset
          </button>
          <button
            className="min-h-8 cursor-pointer rounded-md border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700"
            type="button"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>

      <div className="grid gap-2">
        {calibrationFields.map((field) => (
          <label className="grid gap-1" key={field.key}>
            <span className="flex items-center justify-between gap-2">
              <span className={labelTextClassName}>{field.label}</span>
              <strong className="text-xs text-slate-700">
                {calibration[field.key]}
                {field.suffix}
              </strong>
            </span>
            <div className="grid grid-cols-[1fr_84px] gap-2">
              <input
                className="w-full"
                max={field.max}
                min={field.min}
                step={field.step}
                type="range"
                value={calibration[field.key]}
                onChange={(event) =>
                  onChange((currentCalibration) => ({
                    ...currentCalibration,
                    [field.key]: Number(event.target.value),
                  }))
                }
              />
              <input
                className={formControlClassName}
                max={field.max}
                min={field.min}
                step={field.step}
                type="number"
                value={calibration[field.key]}
                onChange={(event) =>
                  onChange((currentCalibration) => ({
                    ...currentCalibration,
                    [field.key]: Number(event.target.value),
                  }))
                }
              />
            </div>
          </label>
        ))}
      </div>
    </aside>
  );
}
