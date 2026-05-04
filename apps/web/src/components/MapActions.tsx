import type { MeteorologyAssetPointFeature } from '../types/geo';

type MapActionsProps = {
  selectedAsset: MeteorologyAssetPointFeature | null;
  isDetailsExpanded: boolean;
  onToggleForm: () => void;
  onOpenDetails: () => void;
};

export function MapActions({
  selectedAsset,
  isDetailsExpanded,
  onToggleForm,
  onOpenDetails,
}: MapActionsProps) {
  return (
    <>
      <button
        className="group fixed bottom-7 left-7 z-20 inline-flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full border-0 bg-blue-600 font-semibold text-3xl text-white leading-none shadow-[0_16px_36px_rgb(15_23_42_/_28%)] max-[720px]:bottom-[18px] max-[720px]:left-[18px]"
        type="button"
        onClick={onToggleForm}
      >
        +{' '}
        <span className="pointer-events-none absolute left-[calc(100%+12px)] w-max max-w-[180px] -translate-x-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100">
          Adicionar ativo
        </span>
      </button>

      {selectedAsset && !isDetailsExpanded && (
        <button
          className="fixed right-7 bottom-[92px] z-20 max-w-[min(360px,calc(100vw-56px))] cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-bold text-[13px] text-slate-900 shadow-[0_12px_32px_rgb(15_23_42_/_18%)] max-[720px]:right-[18px] max-[720px]:bottom-[82px]"
          type="button"
          onClick={onOpenDetails}
        >
          Ver detalhes: {selectedAsset.properties.name}
        </button>
      )}
    </>
  );
}
