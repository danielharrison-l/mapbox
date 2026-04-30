import { getStatusLabel, getStatusPillClassName } from '../lib/geo';
import type { MeteorologyAssetPointFeature } from '../types/geo';
import {
  coordinateCardClassName,
  coordinateRowClassName,
  coordinateValueClassName,
  footerClassName,
  labelTextClassName,
  panelClassName,
  panelCloseButtonClassName,
  panelContentClassName,
  panelEyebrowClassName,
  panelHeaderClassName,
  panelTitleClassName,
  primaryButtonClassName,
  sectionTitleClassName,
  summaryGridClassName,
  summaryItemClassName,
  summaryValueClassName,
} from './styles';

type AssetDetailsPanelProps = {
  asset: MeteorologyAssetPointFeature;
  onClose: () => void;
  onFocusCoverage: () => void;
};

export function AssetDetailsPanel({ asset, onClose, onFocusCoverage }: AssetDetailsPanelProps) {
  return (
    <aside className={panelClassName} aria-label="Detalhes do ativo selecionado">
      <header className={panelHeaderClassName}>
        <div className="grid gap-0.5">
          <span className={panelEyebrowClassName}>Painel de geo-dados</span>
          <h2 className={panelTitleClassName}>Detalhes do Ativo</h2>
        </div>
        <button className={panelCloseButtonClassName} type="button" onClick={onClose}>
          Fechar
        </button>
      </header>

      <div className={panelContentClassName}>
        <section>
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <h3 className="m-0 text-lg font-semibold leading-snug text-[#003d9b]">
              {asset.properties.name}
            </h3>
            <span className={getStatusPillClassName(asset.properties.status)}>
              {getStatusLabel(asset.properties.status)}
            </span>
          </div>
          <div className={summaryGridClassName}>
            <div className={summaryItemClassName}>
              <span className={labelTextClassName}>ID do ativo</span>
              <strong className={summaryValueClassName}>
                #{String(asset.properties.infrastructurePointId).padStart(5, '0')}
              </strong>
            </div>
            <div className={summaryItemClassName}>
              <span className={labelTextClassName}>Tipo</span>
              <strong className={summaryValueClassName}>Estacao Meteorologica</strong>
            </div>
            <div className={summaryItemClassName}>
              <span className={labelTextClassName}>Municipio</span>
              <strong className={summaryValueClassName}>
                {asset.properties.municipalityName ?? '-'}
              </strong>
            </div>
            <div className={summaryItemClassName}>
              <span className={labelTextClassName}>Status</span>
              <strong className={summaryValueClassName}>
                {getStatusLabel(asset.properties.status)}
              </strong>
            </div>
          </div>
        </section>

        <section>
          <h4 className={sectionTitleClassName}>Localizacao Precisa</h4>
          <div className={coordinateCardClassName}>
            <div className={coordinateRowClassName}>
              <span className={labelTextClassName}>Longitude</span>
              <strong className={coordinateValueClassName}>
                {asset.geometry.coordinates[0].toFixed(5)}
              </strong>
            </div>
            <div className={coordinateRowClassName}>
              <span className={labelTextClassName}>Latitude</span>
              <strong className={coordinateValueClassName}>
                {asset.geometry.coordinates[1].toFixed(5)}
              </strong>
            </div>
            <div className={coordinateRowClassName}>
              <span className={labelTextClassName}>SRID</span>
              <strong className={coordinateValueClassName}>4326</strong>
            </div>
          </div>
        </section>

        <section>
          <h4 className={sectionTitleClassName}>Area de cobertura</h4>
          <div className={summaryGridClassName}>
            <div className="grid min-h-[70px] gap-1.5 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <span className="text-[11px] font-extrabold text-blue-700 uppercase tracking-[0.04em]">
                Geometria
              </span>
              <strong className={summaryValueClassName}>
                {asset.properties.coverageArea ? 'Poligono exibido' : 'Nao cadastrada'}
              </strong>
            </div>
            <div className="grid min-h-[70px] gap-1.5 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <span className="text-[11px] font-extrabold text-blue-700 uppercase tracking-[0.04em]">
                Vertices
              </span>
              <strong className={summaryValueClassName}>
                {asset.properties.coverageArea
                  ? asset.properties.coverageArea.coordinates[0].length
                  : '-'}
              </strong>
            </div>
          </div>
        </section>

        <section>
          <h4 className={sectionTitleClassName}>Descricao detalhada</h4>
          <p className="m-0 text-sm leading-relaxed text-slate-600">
            {asset.properties.description ??
              'Ativo meteorologico cadastrado para validacao da POC geoespacial.'}
          </p>
        </section>
      </div>

      <footer className={footerClassName}>
        <button className={primaryButtonClassName} type="button" onClick={onFocusCoverage}>
          Ver cobertura no mapa
        </button>
      </footer>
    </aside>
  );
}
