import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { AssetFormState, MeteorologyAssetStatus, Municipality } from '../types/geo';
import {
  coordinateCardClassName,
  coordinateRowClassName,
  coordinateValueClassName,
  footerClassName,
  formControlClassName,
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
  textareaClassName,
} from './styles';

type AssetCreatePanelProps = {
  form: AssetFormState;
  formStatus: string;
  isSubmitting: boolean;
  municipalities: Municipality[];
  selectedPoint: [number, number] | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setForm: Dispatch<SetStateAction<AssetFormState>>;
};

export function AssetCreatePanel({
  form,
  formStatus,
  isSubmitting,
  municipalities,
  selectedPoint,
  onClose,
  onSubmit,
  setForm,
}: AssetCreatePanelProps) {
  return (
    <aside className={`${panelClassName} z-[31]`} aria-label="Cadastro de ativo meteorologico">
      <header className={panelHeaderClassName}>
        <div className="grid gap-0.5">
          <span className={panelEyebrowClassName}>Painel de cadastro</span>
          <h2 className={panelTitleClassName}>Cadastrar Ativo</h2>
        </div>
        <button className={panelCloseButtonClassName} type="button" onClick={onClose}>
          Fechar
        </button>
      </header>

      <form className="contents" onSubmit={onSubmit}>
        <div className={panelContentClassName}>
          <section>
            <h4 className={sectionTitleClassName}>Identificacao</h4>
            <div className="grid gap-3">
              <label className="grid gap-1.5 font-bold text-slate-700">
                Nome
                <input
                  className={formControlClassName}
                  value={form.name}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Estacao Meteorologica 91"
                />
              </label>
              <label className="grid gap-1.5 font-bold text-slate-700">
                Descricao
                <textarea
                  className={textareaClassName}
                  value={form.description}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Resumo operacional do ativo"
                />
              </label>
            </div>
          </section>

          <section>
            <h4 className={sectionTitleClassName}>Classificacao</h4>
            <div className={summaryGridClassName}>
              <label className={summaryItemClassName}>
                <span className={labelTextClassName}>Municipio</span>
                <select
                  className={formControlClassName}
                  value={form.municipalityId}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      municipalityId: event.target.value,
                    }))
                  }
                >
                  {municipalities.map((municipality) => (
                    <option key={municipality.id} value={municipality.id}>
                      {municipality.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={summaryItemClassName}>
                <span className={labelTextClassName}>Status</span>
                <select
                  className={formControlClassName}
                  value={form.status}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      status: event.target.value as MeteorologyAssetStatus,
                    }))
                  }
                >
                  <option value="NOT_STARTED">Nao Iniciado</option>
                  <option value="STARTED">Iniciado</option>
                  <option value="CONCLUDED">Concluido</option>
                </select>
              </label>
            </div>
          </section>

          <section>
            <h4 className={sectionTitleClassName}>Localizacao</h4>
            <div className={coordinateCardClassName}>
              <div className={coordinateRowClassName}>
                <span className={labelTextClassName}>Longitude</span>
                <strong className={coordinateValueClassName}>
                  {selectedPoint ? selectedPoint[0].toFixed(5) : '-'}
                </strong>
              </div>
              <div className={coordinateRowClassName}>
                <span className={labelTextClassName}>Latitude</span>
                <strong className={coordinateValueClassName}>
                  {selectedPoint ? selectedPoint[1].toFixed(5) : '-'}
                </strong>
              </div>
              <div className={coordinateRowClassName}>
                <span className={labelTextClassName}>Cobertura</span>
                <strong className={coordinateValueClassName}>Poligono irregular automatico</strong>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-slate-600">{formStatus}</p>
          </section>
        </div>

        <footer className={footerClassName}>
          <button
            className={primaryButtonClassName}
            type="submit"
            disabled={isSubmitting || municipalities.length === 0}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar ativo'}
          </button>
        </footer>
      </form>
    </aside>
  );
}
