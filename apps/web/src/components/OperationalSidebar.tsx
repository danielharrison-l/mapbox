import {
  BadgeCheck,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Database,
  Eye,
  EyeOff,
  Info,
  ListFilter,
  type LucideIcon,
  MapPinned,
  PenTool,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { type Dispatch, type FormEvent, type SetStateAction, useMemo } from 'react';
import { getStateOptions, getStatusLabel, getStatusPillClassName } from '../lib/geo';
import { cn } from '../lib/utils';
import type {
  AssetFilters,
  AssetFormState,
  IbgeSocioeconomicData,
  MeteorologyAssetPointFeature,
  MeteorologyAssetStatus,
  ModelCalibration,
  ModelPerformance,
  Municipality,
  PolygonGeometry,
} from '../types/geo';
import { Alert } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from './ui/sidebar';
import { Switch } from './ui/switch';
import { Tabs, TabsContent } from './ui/tabs';

export type OperationalSidebarMode =
  | 'search'
  | 'assets'
  | 'details'
  | 'create'
  | 'coverage'
  | 'data'
  | 'model';

type OperationalSidebarProps = {
  assets: MeteorologyAssetPointFeature[];
  coverageArea: PolygonGeometry | null;
  ibgeSocioeconomicData: IbgeSocioeconomicData | null;
  ibgeSocioeconomicError: string | null;
  ibgeSocioeconomicStatus: 'idle' | 'loading' | 'complete' | 'failed';
  filters: AssetFilters;
  form: AssetFormState;
  formStatus: string;
  isDrawingCoverage: boolean;
  isEditingExistingCoverage: boolean;
  isSavingCoverageEdit: boolean;
  isSubmitting: boolean;
  isSelectedCoverageVisible: boolean;
  isochroneError: string | null;
  isochroneStatus: 'idle' | 'loading' | 'complete' | 'failed';
  locationSearchMessage: string | null;
  locationSearchQuery: string;
  locationSearchStatus: 'idle' | 'loading' | 'complete' | 'failed';
  mode: OperationalSidebarMode;
  modelCalibration: ModelCalibration;
  modelPerformance: ModelPerformance;
  municipalities: Municipality[];
  selectedAsset: MeteorologyAssetPointFeature | null;
  selectedAssetElevationMeters: number | null;
  selectedPoint: [number, number] | null;
  totalCount: number;
  visibleCount: number;
  onChangeFilters: (filters: AssetFilters) => void;
  onChangeMode: (mode: OperationalSidebarMode) => void;
  onClearCoverage: () => void;
  onClearFilters: () => void;
  onFocusCoverage: () => void;
  onFinishCoverageDraw: () => void;
  onLoadIbgeSocioeconomicData: () => void;
  onLoadIsochrone: () => void;
  onLocationSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResetCreateDraft: () => void;
  onResetModelCalibration: () => void;
  onSaveCoverageEdit: () => void;
  onSelectAsset: (asset: MeteorologyAssetPointFeature) => void;
  onStartCoverageDraw: () => void;
  onStartCreate: () => void;
  onStartSelectedCoverageEdit: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleSelectedCoverage: (visible: boolean) => void;
  setForm: Dispatch<SetStateAction<AssetFormState>>;
  setLocationSearchQuery: Dispatch<SetStateAction<string>>;
  setModelCalibration: Dispatch<SetStateAction<ModelCalibration>>;
};

type CalibrationField = {
  key: keyof ModelCalibration;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
};

const statusOptions: MeteorologyAssetStatus[] = ['NOT_STARTED', 'STARTED', 'CONCLUDED'];

const calibrationFields: CalibrationField[] = [
  { key: 'offsetEastMeters', label: 'Leste', min: -120, max: 120, step: 1, suffix: 'm' },
  { key: 'offsetNorthMeters', label: 'Norte', min: -120, max: 120, step: 1, suffix: 'm' },
  { key: 'scaleX', label: 'Escala X', min: 0.1, max: 3, step: 0.05, suffix: 'x' },
  { key: 'scaleY', label: 'Escala Y', min: 0.1, max: 3, step: 0.05, suffix: 'x' },
  { key: 'scaleZ', label: 'Altura', min: 0.1, max: 4, step: 0.05, suffix: 'x' },
  { key: 'rotationZ', label: 'Rotação', min: 0, max: 360, step: 1, suffix: '°' },
  { key: 'clipRadiusMeters', label: 'Recorte', min: 10, max: 200, step: 5, suffix: 'm' },
];

const sidebarNavigationItems: Array<{
  icon: LucideIcon;
  label: string;
  mobileLabel: string;
  mode: OperationalSidebarMode;
  requiresAsset?: boolean;
}> = [
  { icon: Search, label: 'Pesquisa', mobileLabel: 'Busca', mode: 'search' },
  { icon: ListFilter, label: 'Ativos', mobileLabel: 'Ativos', mode: 'assets' },
  { icon: Info, label: 'Detalhes', mobileLabel: 'Info', mode: 'details', requiresAsset: true },
  { icon: Plus, label: 'Cadastro', mobileLabel: 'Novo', mode: 'create' },
  { icon: PenTool, label: 'Cobertura', mobileLabel: 'Mapa', mode: 'coverage' },
  { icon: Database, label: 'Dados', mobileLabel: 'Dados', mode: 'data', requiresAsset: true },
  { icon: Box, label: 'Modelo 3D', mobileLabel: '3D', mode: 'model' },
];

const formControlClassName =
  'min-h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm font-normal text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const labelClassName = 'text-[11px] font-extrabold text-slate-500 uppercase tracking-[0.04em]';
const sectionTitleClassName = 'text-sm font-bold leading-snug text-slate-900';
const metricCardClassName =
  'grid min-h-[70px] min-w-0 gap-1.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm';

const modeCopy: Record<OperationalSidebarMode, { title: string; subtitle: string }> = {
  search: {
    title: 'Pesquisa',
    subtitle: 'Município, endereço ou coordenadas',
  },
  assets: {
    title: 'Inventário de Ativos',
    subtitle: 'Filtros e seleção operacional',
  },
  details: {
    title: 'Detalhes do Ativo',
    subtitle: 'Resumo técnico do ponto selecionado',
  },
  create: {
    title: 'Cadastrar Ativo',
    subtitle: 'Novo ponto meteorológico',
  },
  coverage: {
    title: 'Área de Cobertura',
    subtitle: 'Desenho e revisão do polígono',
  },
  data: {
    title: 'Indicadores IBGE',
    subtitle: 'Dados municipais via API oficial',
  },
  model: {
    title: 'Modelo 3D',
    subtitle: 'Calibração e performance',
  },
};

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

function getModelPerformanceLabel(modelPerformance: ModelPerformance) {
  if (modelPerformance.status === 'measuring') {
    return 'Medindo renderização';
  }

  if (modelPerformance.status === 'complete') {
    return `${modelPerformance.averageFps?.toFixed(1) ?? '-'} FPS`;
  }

  if (modelPerformance.status === 'failed') {
    return 'Falha no modelo';
  }

  return 'Aguardando seleção';
}

function getCoverageVerticesCount(coverageArea: PolygonGeometry | null) {
  return coverageArea?.coordinates[0]?.length ?? 0;
}

function getCoverageGeometryLabel(
  selectedAsset: MeteorologyAssetPointFeature,
  isSelectedCoverageVisible: boolean,
) {
  if (!selectedAsset.properties.coverageArea) {
    return 'Não cadastrada';
  }

  return isSelectedCoverageVisible ? 'Polígono visível' : 'Polígono oculto';
}

export function OperationalSidebar({
  assets,
  coverageArea,
  ibgeSocioeconomicData,
  ibgeSocioeconomicError,
  ibgeSocioeconomicStatus,
  filters,
  form,
  formStatus,
  isDrawingCoverage,
  isEditingExistingCoverage,
  isSavingCoverageEdit,
  isSubmitting,
  isSelectedCoverageVisible,
  isochroneError,
  isochroneStatus,
  locationSearchMessage,
  locationSearchQuery,
  locationSearchStatus,
  mode,
  modelCalibration,
  modelPerformance,
  municipalities,
  selectedAsset,
  selectedAssetElevationMeters,
  selectedPoint,
  totalCount,
  visibleCount,
  onChangeFilters,
  onChangeMode,
  onClearCoverage,
  onClearFilters,
  onFocusCoverage,
  onFinishCoverageDraw,
  onLoadIbgeSocioeconomicData,
  onLoadIsochrone,
  onLocationSearchSubmit,
  onResetCreateDraft,
  onResetModelCalibration,
  onSaveCoverageEdit,
  onSelectAsset,
  onStartCoverageDraw,
  onStartCreate,
  onStartSelectedCoverageEdit,
  onSubmit,
  onToggleSelectedCoverage,
  setForm,
  setLocationSearchQuery,
  setModelCalibration,
}: OperationalSidebarProps) {
  return (
    <SidebarProvider>
      <OperationalSidebarShell
        assets={assets}
        coverageArea={coverageArea}
        ibgeSocioeconomicData={ibgeSocioeconomicData}
        ibgeSocioeconomicError={ibgeSocioeconomicError}
        ibgeSocioeconomicStatus={ibgeSocioeconomicStatus}
        filters={filters}
        form={form}
        formStatus={formStatus}
        isDrawingCoverage={isDrawingCoverage}
        isEditingExistingCoverage={isEditingExistingCoverage}
        isSavingCoverageEdit={isSavingCoverageEdit}
        isSubmitting={isSubmitting}
        isSelectedCoverageVisible={isSelectedCoverageVisible}
        isochroneError={isochroneError}
        isochroneStatus={isochroneStatus}
        locationSearchMessage={locationSearchMessage}
        locationSearchQuery={locationSearchQuery}
        locationSearchStatus={locationSearchStatus}
        mode={mode}
        modelCalibration={modelCalibration}
        modelPerformance={modelPerformance}
        municipalities={municipalities}
        selectedAsset={selectedAsset}
        selectedAssetElevationMeters={selectedAssetElevationMeters}
        selectedPoint={selectedPoint}
        totalCount={totalCount}
        visibleCount={visibleCount}
        onChangeFilters={onChangeFilters}
        onChangeMode={onChangeMode}
        onClearCoverage={onClearCoverage}
        onClearFilters={onClearFilters}
        onFocusCoverage={onFocusCoverage}
        onFinishCoverageDraw={onFinishCoverageDraw}
        onLoadIbgeSocioeconomicData={onLoadIbgeSocioeconomicData}
        onLoadIsochrone={onLoadIsochrone}
        onLocationSearchSubmit={onLocationSearchSubmit}
        onResetCreateDraft={onResetCreateDraft}
        onResetModelCalibration={onResetModelCalibration}
        onSaveCoverageEdit={onSaveCoverageEdit}
        onSelectAsset={onSelectAsset}
        onStartCoverageDraw={onStartCoverageDraw}
        onStartCreate={onStartCreate}
        onStartSelectedCoverageEdit={onStartSelectedCoverageEdit}
        onSubmit={onSubmit}
        onToggleSelectedCoverage={onToggleSelectedCoverage}
        setForm={setForm}
        setLocationSearchQuery={setLocationSearchQuery}
        setModelCalibration={setModelCalibration}
      />
    </SidebarProvider>
  );
}

function OperationalSidebarShell({
  assets,
  coverageArea,
  ibgeSocioeconomicData,
  ibgeSocioeconomicError,
  ibgeSocioeconomicStatus,
  filters,
  form,
  formStatus,
  isDrawingCoverage,
  isEditingExistingCoverage,
  isSavingCoverageEdit,
  isSubmitting,
  isSelectedCoverageVisible,
  isochroneError,
  isochroneStatus,
  locationSearchMessage,
  locationSearchQuery,
  locationSearchStatus,
  mode,
  modelCalibration,
  modelPerformance,
  municipalities,
  selectedAsset,
  selectedAssetElevationMeters,
  selectedPoint,
  totalCount,
  visibleCount,
  onChangeFilters,
  onChangeMode,
  onClearCoverage,
  onClearFilters,
  onFocusCoverage,
  onFinishCoverageDraw,
  onLoadIbgeSocioeconomicData,
  onLoadIsochrone,
  onLocationSearchSubmit,
  onResetCreateDraft,
  onResetModelCalibration,
  onSaveCoverageEdit,
  onSelectAsset,
  onStartCoverageDraw,
  onStartCreate,
  onStartSelectedCoverageEdit,
  onSubmit,
  onToggleSelectedCoverage,
  setForm,
  setLocationSearchQuery,
  setModelCalibration,
}: OperationalSidebarProps) {
  const { open, setOpen, toggleSidebar } = useSidebar();
  const stateOptions = getStateOptions(municipalities);
  const hasActiveFilters = filters.state !== 'ALL' || filters.status !== 'ALL';
  const coverageVerticesCount = getCoverageVerticesCount(coverageArea);
  const isIbgeDataLoading = ibgeSocioeconomicStatus === 'loading';
  const currentCoordinates =
    selectedPoint ?? selectedAsset?.geometry.coordinates ?? assets[0]?.geometry.coordinates ?? null;
  const currentModeCopy = modeCopy[mode];
  const statusCoordinates = useMemo(
    () => ({
      latitude: currentCoordinates ? currentCoordinates[1].toFixed(5) : '-',
      longitude: currentCoordinates ? currentCoordinates[0].toFixed(5) : '-',
    }),
    [currentCoordinates],
  );
  const selectedContextLabel = selectedAsset
    ? `#${String(selectedAsset.properties.infrastructurePointId).padStart(5, '0')}`
    : selectedPoint
      ? 'Novo ponto'
      : 'Sem seleção';
  const handleModeNavigation = (nextMode: OperationalSidebarMode) => {
    onChangeMode(nextMode);
    setOpen(nextMode === mode ? !open : true);
  };

  return (
    <Sidebar
      aria-label="Operações do mapa"
      className="font-sans shadow-[8px_0_30px_rgb(15_23_42_/_10%)]"
    >
      <Tabs
        className="contents"
        value={mode}
        onValueChange={(value) => onChangeMode(value as OperationalSidebarMode)}
      >
        <div className="flex min-h-0 flex-1">
          <SidebarRail>
            <SidebarMenu>
              <div className="mb-4 grid gap-2">
                <SidebarMenuButton
                  aria-label={open ? 'Recolher sidebar' : 'Expandir sidebar'}
                  className="bg-white text-blue-700 shadow-sm ring-1 ring-blue-100 hover:text-blue-800"
                  title={open ? 'Recolher sidebar' : 'Expandir sidebar'}
                  onClick={toggleSidebar}
                >
                  {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </SidebarMenuButton>
                <Separator className="bg-blue-100" />
              </div>

              {sidebarNavigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.mode === mode;
                const isDisabled = Boolean(item.requiresAsset && !selectedAsset);

                return (
                  <SidebarMenuButton
                    aria-label={item.label}
                    aria-pressed={isActive}
                    active={isActive}
                    disabled={isDisabled}
                    key={item.mode}
                    title={open ? undefined : item.label}
                    onClick={() => handleModeNavigation(item.mode)}
                  >
                    <Icon size={17} strokeWidth={2.2} />
                  </SidebarMenuButton>
                );
              })}

              <Separator className="my-2 bg-blue-100" />
            </SidebarMenu>
          </SidebarRail>

          {open && (
            <div className="grid min-w-0 flex-1 grid-rows-[auto_1fr_auto] bg-[#f8f9ff]">
              <SidebarHeader>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="grid min-w-0 gap-1">
                    <h1 className="m-0 text-lg font-bold leading-tight text-slate-950">
                      {currentModeCopy.title}
                    </h1>
                    <span className="text-[11px] leading-snug text-slate-600">
                      {currentModeCopy.subtitle}
                    </span>
                  </div>
                  {mode === 'create' && (
                    <Button
                      className="h-9 px-3 text-xs shadow-sm"
                      size="sm"
                      type="button"
                      onClick={onStartCreate}
                    >
                      <Plus size={14} />
                      Novo
                    </Button>
                  )}
                </div>
              </SidebarHeader>

              <SidebarContent>
                <TabsContent value="search">
                  <SearchTab
                    locationSearchMessage={locationSearchMessage}
                    locationSearchQuery={locationSearchQuery}
                    locationSearchStatus={locationSearchStatus}
                    setLocationSearchQuery={setLocationSearchQuery}
                    onSubmit={onLocationSearchSubmit}
                  />
                </TabsContent>

                <TabsContent value="assets">
                  <AssetsTab
                    assets={assets}
                    filters={filters}
                    hasActiveFilters={hasActiveFilters}
                    stateOptions={stateOptions}
                    totalCount={totalCount}
                    visibleCount={visibleCount}
                    onChangeFilters={onChangeFilters}
                    onClearFilters={onClearFilters}
                    onSelectAsset={onSelectAsset}
                  />
                </TabsContent>

                <TabsContent value="details">
                  <DetailsTab
                    isSelectedCoverageVisible={isSelectedCoverageVisible}
                    isochroneError={isochroneError}
                    isochroneStatus={isochroneStatus}
                    selectedAsset={selectedAsset}
                    selectedAssetElevationMeters={selectedAssetElevationMeters}
                    onFocusCoverage={onFocusCoverage}
                    onLoadIsochrone={onLoadIsochrone}
                    onOpenCoverage={() => onChangeMode('coverage')}
                    onOpenData={() => {
                      onChangeMode('data');
                      onLoadIbgeSocioeconomicData();
                    }}
                    onToggleSelectedCoverage={onToggleSelectedCoverage}
                  />
                </TabsContent>

                <TabsContent value="create">
                  <CreateTab
                    coverageArea={coverageArea}
                    form={form}
                    formStatus={formStatus}
                    isSubmitting={isSubmitting}
                    municipalities={municipalities}
                    selectedPoint={selectedPoint}
                    setForm={setForm}
                    onResetCreateDraft={onResetCreateDraft}
                    onSubmit={onSubmit}
                  />
                </TabsContent>

                <TabsContent value="coverage">
                  <CoverageTab
                    coverageArea={coverageArea}
                    coverageVerticesCount={coverageVerticesCount}
                    formStatus={formStatus}
                    isDrawingCoverage={isDrawingCoverage}
                    isEditingExistingCoverage={isEditingExistingCoverage}
                    isSavingCoverageEdit={isSavingCoverageEdit}
                    isSelectedCoverageVisible={isSelectedCoverageVisible}
                    isSubmitting={isSubmitting}
                    selectedAsset={selectedAsset}
                    selectedPoint={selectedPoint}
                    onClearCoverage={onClearCoverage}
                    onFinishCoverageDraw={onFinishCoverageDraw}
                    onFocusCoverage={onFocusCoverage}
                    onStartCoverageDraw={onStartCoverageDraw}
                    onStartSelectedCoverageEdit={onStartSelectedCoverageEdit}
                    onSaveCoverageEdit={onSaveCoverageEdit}
                    onSubmit={onSubmit}
                    onToggleSelectedCoverage={onToggleSelectedCoverage}
                  />
                </TabsContent>

                <TabsContent value="data">
                  <DataTab
                    ibgeSocioeconomicData={ibgeSocioeconomicData}
                    ibgeSocioeconomicError={ibgeSocioeconomicError}
                    ibgeSocioeconomicStatus={ibgeSocioeconomicStatus}
                    isIbgeDataLoading={isIbgeDataLoading}
                    selectedAsset={selectedAsset}
                    onLoadIbgeSocioeconomicData={onLoadIbgeSocioeconomicData}
                  />
                </TabsContent>

                <TabsContent value="model">
                  <ModelTab
                    modelCalibration={modelCalibration}
                    modelPerformance={modelPerformance}
                    setModelCalibration={setModelCalibration}
                    onResetModelCalibration={onResetModelCalibration}
                  />
                </TabsContent>
              </SidebarContent>

              <SidebarFooter>
                <div className="flex items-center justify-between text-[11px] text-slate-700">
                  <span className="font-semibold">Sincronização</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    Ativo
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700">
                  <span>Lat: {statusCoordinates.latitude}</span>
                  <span>Long: {statusCoordinates.longitude}</span>
                  <span>Visíveis: {visibleCount}</span>
                  <span>{selectedContextLabel}</span>
                </div>
              </SidebarFooter>
            </div>
          )}

          {open && (
            <nav className="fixed right-3 bottom-2 left-3 z-40 hidden h-[56px] grid-cols-5 rounded-lg border border-slate-200 bg-white/95 px-2 shadow-[0_8px_24px_rgb(15_23_42_/_18%)] backdrop-blur max-[760px]:grid">
              {sidebarNavigationItems.slice(0, 5).map((item) => {
                const Icon = item.icon;
                const isActive = item.mode === mode;
                const isDisabled = Boolean(item.requiresAsset && !selectedAsset);

                return (
                  <button
                    className={cn(
                      'grid cursor-pointer place-items-center content-center gap-0.5 text-[10px] font-bold text-slate-500 disabled:cursor-not-allowed disabled:opacity-35',
                      isActive && 'text-blue-700',
                    )}
                    disabled={isDisabled}
                    key={item.mode}
                    type="button"
                    onClick={() => handleModeNavigation(item.mode)}
                  >
                    <Icon size={18} />
                    <span>{item.mobileLabel}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </Tabs>
    </Sidebar>
  );
}

function SearchTab({
  locationSearchMessage,
  locationSearchQuery,
  locationSearchStatus,
  setLocationSearchQuery,
  onSubmit,
}: {
  locationSearchMessage: string | null;
  locationSearchQuery: string;
  locationSearchStatus: 'idle' | 'loading' | 'complete' | 'failed';
  setLocationSearchQuery: Dispatch<SetStateAction<string>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-3">
        <h2 className={sectionTitleClassName}>Localizar no mapa</h2>
        <MapSearchForm
          locationSearchMessage={locationSearchMessage}
          locationSearchQuery={locationSearchQuery}
          locationSearchStatus={locationSearchStatus}
          setLocationSearchQuery={setLocationSearchQuery}
          onSubmit={onSubmit}
        />
      </section>
    </div>
  );
}

function MapSearchForm({
  locationSearchMessage,
  locationSearchQuery,
  locationSearchStatus,
  setLocationSearchQuery,
  onSubmit,
}: {
  locationSearchMessage: string | null;
  locationSearchQuery: string;
  locationSearchStatus: 'idle' | 'loading' | 'complete' | 'failed';
  setLocationSearchQuery: Dispatch<SetStateAction<string>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isLoading = locationSearchStatus === 'loading';

  return (
    <form
      className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
      onSubmit={onSubmit}
    >
      <label className="sr-only" htmlFor="sidebar-mapbox-location-search">
        Buscar local no mapa
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          className="min-h-9 min-w-0 rounded-md border border-slate-200 px-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          id="sidebar-mapbox-location-search"
          placeholder="Município, endereço ou coordenadas"
          value={locationSearchQuery}
          onChange={(event) => setLocationSearchQuery(event.target.value)}
        />
        <Button
          className="h-9 px-3 text-xs"
          disabled={isLoading || !locationSearchQuery.trim()}
          size="sm"
          type="submit"
        >
          <Search size={14} />
          {isLoading ? 'Buscando' : 'Ir'}
        </Button>
      </div>
      {locationSearchMessage && (
        <span
          className={cn(
            'min-w-0 truncate px-1 text-xs font-semibold',
            locationSearchStatus === 'failed' ? 'text-red-600' : 'text-slate-600',
          )}
        >
          {locationSearchMessage}
        </span>
      )}
    </form>
  );
}

function AssetsTab({
  assets,
  filters,
  hasActiveFilters,
  stateOptions,
  totalCount,
  visibleCount,
  onChangeFilters,
  onClearFilters,
  onSelectAsset,
}: {
  assets: MeteorologyAssetPointFeature[];
  filters: AssetFilters;
  hasActiveFilters: boolean;
  stateOptions: string[];
  totalCount: number;
  visibleCount: number;
  onChangeFilters: (filters: AssetFilters) => void;
  onClearFilters: () => void;
  onSelectAsset: (asset: MeteorologyAssetPointFeature) => void;
}) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className={sectionTitleClassName}>Filtros e inventário</h2>
          <Badge variant="secondary">
            {visibleCount}/{totalCount}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5">
            <span className={labelClassName}>Estado</span>
            <select
              className={formControlClassName}
              value={filters.state}
              onChange={(event) =>
                onChangeFilters({
                  ...filters,
                  state: event.target.value,
                })
              }
            >
              <option value="ALL">Todos</option>
              {stateOptions.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className={labelClassName}>Status</span>
            <select
              className={formControlClassName}
              value={filters.status}
              onChange={(event) =>
                onChangeFilters({
                  ...filters,
                  status: event.target.value as AssetFilters['status'],
                })
              }
            >
              <option value="ALL">Todos</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {hasActiveFilters && (
          <Button variant="outline" type="button" onClick={onClearFilters}>
            <Trash2 size={15} />
            Limpar filtros
          </Button>
        )}
      </section>

      <Separator />

      <section className="grid gap-2">
        <h2 className={sectionTitleClassName}>Ativos visíveis</h2>
        <div className="grid gap-2">
          {assets.map((asset) => (
            <button
              className="grid cursor-pointer gap-2 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
              key={asset.properties.infrastructurePointId}
              type="button"
              onClick={() => onSelectAsset(asset)}
            >
              <div className="flex items-start justify-between gap-3">
                <strong className="text-sm leading-snug text-slate-900">
                  {asset.properties.name}
                </strong>
                <span className={getStatusPillClassName(asset.properties.status)}>
                  {getStatusLabel(asset.properties.status)}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {asset.properties.municipalityState ?? '-'} -{' '}
                {asset.properties.municipalityName ?? 'Município não informado'}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function DetailsTab({
  isSelectedCoverageVisible,
  isochroneError,
  isochroneStatus,
  selectedAsset,
  selectedAssetElevationMeters,
  onFocusCoverage,
  onLoadIsochrone,
  onOpenCoverage,
  onOpenData,
  onToggleSelectedCoverage,
}: {
  isSelectedCoverageVisible: boolean;
  isochroneError: string | null;
  isochroneStatus: 'idle' | 'loading' | 'complete' | 'failed';
  selectedAsset: MeteorologyAssetPointFeature | null;
  selectedAssetElevationMeters: number | null;
  onFocusCoverage: () => void;
  onLoadIsochrone: () => void;
  onOpenCoverage: () => void;
  onOpenData: () => void;
  onToggleSelectedCoverage: (visible: boolean) => void;
}) {
  if (!selectedAsset) {
    return <EmptyState text="Selecione um ativo no mapa ou na lista para ver os detalhes." />;
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <h2 className="m-0 text-lg font-semibold leading-tight text-slate-900">
              {selectedAsset.properties.name}
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              #{String(selectedAsset.properties.infrastructurePointId).padStart(5, '0')}
            </span>
          </div>
          <span className={getStatusPillClassName(selectedAsset.properties.status)}>
            {getStatusLabel(selectedAsset.properties.status)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric label="Município" value={selectedAsset.properties.municipalityName ?? '-'} />
          <Metric label="Estado" value={selectedAsset.properties.municipalityState ?? '-'} />
          <Metric label="Longitude" value={selectedAsset.geometry.coordinates[0].toFixed(5)} />
          <Metric label="Latitude" value={selectedAsset.geometry.coordinates[1].toFixed(5)} />
          <Metric
            label="Elevação"
            value={
              selectedAssetElevationMeters === null
                ? '-'
                : `${selectedAssetElevationMeters.toFixed(1)} m`
            }
          />
        </div>
        <Alert>
          Modo urbano ativo em zoom alto: prédios próximos ao ativo ou à cobertura podem ser
          destacados no mapa.
        </Alert>
      </section>

      <section className="grid gap-3">
        <h2 className={sectionTitleClassName}>Cobertura</h2>
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Geometria"
            value={getCoverageGeometryLabel(selectedAsset, isSelectedCoverageVisible)}
          />
          <Metric
            label="Vértices"
            value={
              selectedAsset.properties.coverageArea
                ? String(selectedAsset.properties.coverageArea.coordinates[0].length)
                : '-'
            }
          />
        </div>
        <CoverageVisibilityToggle
          checked={isSelectedCoverageVisible}
          disabled={!selectedAsset.properties.coverageArea}
          onCheckedChange={onToggleSelectedCoverage}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" type="button" onClick={onFocusCoverage}>
            <Crosshair size={15} />
            Focar área
          </Button>
          <Button variant="success" type="button" onClick={onOpenData}>
            <Database size={15} />
            Cruzar dados
          </Button>
        </div>
        <Button variant="secondary" type="button" onClick={onOpenCoverage}>
          <MapPinned size={15} />
          Abrir controles de cobertura
        </Button>
        <Button
          variant="outline"
          type="button"
          disabled={isochroneStatus === 'loading'}
          onClick={onLoadIsochrone}
        >
          <MapPinned size={15} />
          {isochroneStatus === 'loading'
            ? 'Calculando alcance de carro'
            : 'Alcance 15/30 min de carro'}
        </Button>
        {isochroneStatus === 'complete' && (
          <Alert>Alcance de deslocamento de carro renderizado no mapa.</Alert>
        )}
        {isochroneStatus === 'failed' && (
          <Alert className="border-red-200 bg-red-50 text-red-700">
            Falha ao calcular alcance de carro: {isochroneError ?? 'erro desconhecido'}
          </Alert>
        )}
      </section>

      <section className="grid gap-2">
        <h2 className={sectionTitleClassName}>Descrição</h2>
        <p className="m-0 text-sm leading-relaxed text-slate-600">
          {selectedAsset.properties.description ??
            'Ativo meteorológico cadastrado para validação da POC geoespacial.'}
        </p>
      </section>
    </div>
  );
}

function CreateTab({
  coverageArea,
  form,
  formStatus,
  isSubmitting,
  municipalities,
  selectedPoint,
  setForm,
  onResetCreateDraft,
  onSubmit,
}: {
  coverageArea: PolygonGeometry | null;
  form: AssetFormState;
  formStatus: string;
  isSubmitting: boolean;
  municipalities: Municipality[];
  selectedPoint: [number, number] | null;
  setForm: Dispatch<SetStateAction<AssetFormState>>;
  onResetCreateDraft: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="grid gap-5" id="asset-create-form" onSubmit={onSubmit}>
      <Alert>{formStatus}</Alert>

      <section className="grid gap-3">
        <h2 className={sectionTitleClassName}>Identificação</h2>
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
            placeholder="Estação Meteorológica 91"
          />
        </label>
        <label className="grid gap-1.5 font-bold text-slate-700">
          Descrição
          <textarea
            className="min-h-20 w-full resize-y rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal text-slate-900"
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
      </section>

      <section className="grid gap-3">
        <h2 className={sectionTitleClassName}>Classificação</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5">
            <span className={labelClassName}>Município</span>
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
              <option value="">Selecione</option>
              {municipalities.map((municipality) => (
                <option key={municipality.id} value={municipality.id}>
                  {municipality.state ? `${municipality.state} - ` : ''}
                  {municipality.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className={labelClassName}>Status</span>
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
              <option value="NOT_STARTED">Não iniciado</option>
              <option value="STARTED">Iniciado</option>
              <option value="CONCLUDED">Concluído</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className={sectionTitleClassName}>Localização</h2>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Longitude" value={selectedPoint ? selectedPoint[0].toFixed(5) : '-'} />
          <Metric label="Latitude" value={selectedPoint ? selectedPoint[1].toFixed(5) : '-'} />
          <Metric
            label="Cobertura"
            value={coverageArea ? `${getCoverageVerticesCount(coverageArea)} vértices` : '-'}
          />
          <Metric label="SRID" value="4326" />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" type="button" onClick={onResetCreateDraft}>
          <Trash2 size={15} />
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || municipalities.length === 0}>
          <Save size={15} />
          {isSubmitting ? 'Salvando' : 'Salvar ativo'}
        </Button>
      </div>
    </form>
  );
}

function CoverageTab({
  coverageArea,
  coverageVerticesCount,
  formStatus,
  isDrawingCoverage,
  isEditingExistingCoverage,
  isSavingCoverageEdit,
  isSelectedCoverageVisible,
  isSubmitting,
  selectedAsset,
  selectedPoint,
  onClearCoverage,
  onFinishCoverageDraw,
  onFocusCoverage,
  onSaveCoverageEdit,
  onStartCoverageDraw,
  onStartSelectedCoverageEdit,
  onSubmit,
  onToggleSelectedCoverage,
}: {
  coverageArea: PolygonGeometry | null;
  coverageVerticesCount: number;
  formStatus: string;
  isDrawingCoverage: boolean;
  isEditingExistingCoverage: boolean;
  isSavingCoverageEdit: boolean;
  isSelectedCoverageVisible: boolean;
  isSubmitting: boolean;
  selectedAsset: MeteorologyAssetPointFeature | null;
  selectedPoint: [number, number] | null;
  onClearCoverage: () => void;
  onFinishCoverageDraw: () => void;
  onFocusCoverage: () => void;
  onSaveCoverageEdit: () => void;
  onStartCoverageDraw: () => void;
  onStartSelectedCoverageEdit: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleSelectedCoverage: (visible: boolean) => void;
}) {
  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <section className="grid gap-3">
        <h2 className={sectionTitleClassName}>Controles de desenho</h2>
        <Alert>{formStatus}</Alert>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            type="button"
            disabled={!selectedPoint || Boolean(coverageArea)}
            onClick={onStartCoverageDraw}
          >
            <PenTool size={15} />
            {isDrawingCoverage ? 'Desenhando' : 'Desenhar'}
          </Button>
          <Button
            variant="success"
            type="button"
            disabled={!isDrawingCoverage}
            onClick={onFinishCoverageDraw}
          >
            <Check size={15} />
            Concluir
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={!coverageArea && !isDrawingCoverage}
            onClick={onClearCoverage}
          >
            <Trash2 size={15} />
            Limpar
          </Button>
        </div>
        {selectedAsset && !selectedPoint && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              type="button"
              disabled={Boolean(coverageArea) || isDrawingCoverage}
              onClick={onStartSelectedCoverageEdit}
            >
              <PenTool size={15} />
              Redesenhar atual
            </Button>
            <Button
              variant="success"
              type="button"
              disabled={!coverageArea || !isEditingExistingCoverage || isSavingCoverageEdit}
              onClick={onSaveCoverageEdit}
            >
              <Save size={15} />
              {isSavingCoverageEdit ? 'Salvando' : 'Salvar cobertura'}
            </Button>
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className={sectionTitleClassName}>Resumo da cobertura</h2>
        <CoverageVisibilityToggle
          checked={isSelectedCoverageVisible}
          disabled={!selectedAsset?.properties.coverageArea}
          onCheckedChange={onToggleSelectedCoverage}
        />
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Novo ativo" value={coverageArea ? 'Área pronta' : 'Pendente'} />
          <Metric label="Vértices" value={coverageArea ? String(coverageVerticesCount) : '-'} />
          <Metric
            label="Ativo selecionado"
            value={selectedAsset?.properties.coverageArea ? 'Com cobertura' : '-'}
          />
          <Metric
            label="Ponto"
            value={
              selectedPoint ? `${selectedPoint[0].toFixed(3)}, ${selectedPoint[1].toFixed(3)}` : '-'
            }
          />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" type="button" disabled={!selectedAsset} onClick={onFocusCoverage}>
          <Crosshair size={15} />
          Focar atual
        </Button>
        <Button type="submit" disabled={isSubmitting || !selectedPoint}>
          <Save size={15} />
          Salvar ativo
        </Button>
      </div>
    </form>
  );
}

function CoverageVisibilityToggle({
  checked,
  disabled,
  onCheckedChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const Icon = checked ? Eye : EyeOff;

  return (
    <div className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={checked ? 'text-blue-700' : 'text-slate-400'} size={16} />
        <div className="grid min-w-0 gap-0.5">
          <span className="text-sm font-bold text-slate-900">Área delimitada</span>
          <span className="truncate text-[11px] font-medium text-slate-500">
            {checked ? 'Visível no mapa' : 'Oculta no mapa'}
          </span>
        </div>
      </div>
      <Switch
        aria-label={checked ? 'Ocultar área delimitada' : 'Mostrar área delimitada'}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function DataTab({
  ibgeSocioeconomicData,
  ibgeSocioeconomicError,
  ibgeSocioeconomicStatus,
  isIbgeDataLoading,
  selectedAsset,
  onLoadIbgeSocioeconomicData,
}: {
  ibgeSocioeconomicData: IbgeSocioeconomicData | null;
  ibgeSocioeconomicError: string | null;
  ibgeSocioeconomicStatus: 'idle' | 'loading' | 'complete' | 'failed';
  isIbgeDataLoading: boolean;
  selectedAsset: MeteorologyAssetPointFeature | null;
  onLoadIbgeSocioeconomicData: () => void;
}) {
  if (!selectedAsset) {
    return <EmptyState text="Selecione um ativo para consultar indicadores municipais do IBGE." />;
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <h2 className={cn(sectionTitleClassName, 'pt-1 text-base')}>
            Indicadores municipais IBGE
          </h2>
          <Button
            size="sm"
            type="button"
            variant="success"
            disabled={isIbgeDataLoading}
            onClick={onLoadIbgeSocioeconomicData}
          >
            <Database size={15} />
            {isIbgeDataLoading ? 'Consultando' : 'Consultar'}
          </Button>
        </div>

        {isIbgeDataLoading && (
          <div className="grid gap-2">
            <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
          </div>
        )}

        {!isIbgeDataLoading && ibgeSocioeconomicData && (
          <div className="grid gap-5">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-3">
              <MetricTrend
                label="População"
                value={formatNullableInteger(ibgeSocioeconomicData.population)}
              />
              <MetricTrend
                label="Domicílios"
                value={formatNullableInteger(ibgeSocioeconomicData.occupiedHouseholds)}
              />
              <MetricTrend
                label="Média/Domicílio"
                value={formatNullableDecimal(ibgeSocioeconomicData.averageResidentsPerHousehold)}
              />
            </div>

            <section className="grid gap-2">
              <h3 className={sectionTitleClassName}>Município consultado</h3>
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="grid min-w-0 gap-0.5">
                    <strong className="min-w-0 truncate text-sm text-slate-900">
                      {ibgeSocioeconomicData.municipality.name}
                    </strong>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {ibgeSocioeconomicData.municipality.state ?? 'UF não informada'} · IBGE{' '}
                      {ibgeSocioeconomicData.municipality.ibgeCode ?? 'não identificado'}
                    </span>
                  </div>
                  <Badge className="shrink-0 bg-emerald-100 text-emerald-800">
                    {ibgeSocioeconomicData.referenceYear}
                  </Badge>
                </div>
                <span className="text-xs font-medium text-slate-600">
                  Fonte: {ibgeSocioeconomicData.source}
                </span>
              </div>
            </section>

            <section className="grid gap-2">
              <h3 className={sectionTitleClassName}>Indicadores</h3>
              {ibgeSocioeconomicData.indicators.length > 0 ? (
                <div className="grid max-h-[280px] gap-2 overflow-y-auto pr-1">
                  {ibgeSocioeconomicData.indicators.map((indicator) => (
                    <div
                      className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                      key={indicator.key}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="grid min-w-0 gap-0.5">
                          <strong className="min-w-0 truncate text-sm text-slate-900">
                            {indicator.label}
                          </strong>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {indicator.source}
                          </span>
                        </div>
                        <Badge className="shrink-0 bg-emerald-100 text-emerald-800">
                          {indicator.referenceYear}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                        <span>
                          Valor: <strong>{formatIndicatorValue(indicator.value)}</strong>
                        </span>
                        <span>
                          Unidade: <strong>{indicator.unit}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>Nenhum indicador do IBGE foi encontrado para este município.</Alert>
              )}
            </section>
          </div>
        )}

        {!isIbgeDataLoading && !ibgeSocioeconomicData && (
          <Alert
            className={
              ibgeSocioeconomicStatus === 'failed'
                ? 'border-red-200 bg-red-50 text-red-700'
                : undefined
            }
          >
            {ibgeSocioeconomicStatus === 'failed'
              ? `Falha ao consultar: ${ibgeSocioeconomicError ?? 'erro desconhecido'}`
              : 'Nenhum indicador IBGE carregado para este ativo.'}
          </Alert>
        )}
      </section>
    </div>
  );
}

function formatNullableInteger(value: number | null): string {
  return value === null ? '-' : integerFormatter.format(value);
}

function formatNullableDecimal(value: number | null): string {
  return value === null ? '-' : decimalFormatter.format(value);
}

function formatIndicatorValue(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return Number.isInteger(value) ? integerFormatter.format(value) : decimalFormatter.format(value);
}

function ModelTab({
  modelCalibration,
  modelPerformance,
  setModelCalibration,
  onResetModelCalibration,
}: {
  modelCalibration: ModelCalibration;
  modelPerformance: ModelPerformance;
  setModelCalibration: Dispatch<SetStateAction<ModelCalibration>>;
  onResetModelCalibration: () => void;
}) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className={sectionTitleClassName}>Modelo 3D</h2>
          <Button variant="outline" size="sm" type="button" onClick={onResetModelCalibration}>
            <RotateCcw size={15} />
            Redefinir
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric label="Status" value={getModelPerformanceLabel(modelPerformance)} />
          <Metric
            label="Janela"
            value={
              modelPerformance.durationMs
                ? `${(modelPerformance.durationMs / 1000).toFixed(1)}s`
                : '5.0s'
            }
          />
          <Metric label="Frames" value={modelPerformance.frames?.toString() ?? '-'} />
          <Metric
            label="Pior frame"
            value={
              modelPerformance.maxFrameTimeMs
                ? `${modelPerformance.maxFrameTimeMs.toFixed(1)}ms`
                : '-'
            }
          />
        </div>

        <Alert>
          GLBs mockados fixos em PA, MG e SP. Novos ativos meteorológicos não adicionam modelos
          automaticamente.
        </Alert>

        {modelPerformance.status === 'failed' && (
          <Alert className="border-red-200 bg-red-50 text-red-700">
            {modelPerformance.errorMessage ?? 'Não foi possível carregar o arquivo GLB.'}
          </Alert>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className={sectionTitleClassName}>Calibração</h2>
        <div className="grid gap-2">
          {calibrationFields.map((field) => (
            <label className="grid gap-1" key={field.key}>
              <span className="flex items-center justify-between gap-2">
                <span className={labelClassName}>{field.label}</span>
                <strong className="text-xs text-slate-700">
                  {modelCalibration[field.key]}
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
                  value={modelCalibration[field.key]}
                  onChange={(event) =>
                    setModelCalibration((currentCalibration) => ({
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
                  value={modelCalibration[field.key]}
                  onChange={(event) =>
                    setModelCalibration((currentCalibration) => ({
                      ...currentCalibration,
                      [field.key]: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={metricCardClassName}>
      <span className={cn(labelClassName, 'min-w-0 truncate')}>{label}</span>
      <strong className="min-w-0 break-words text-[13px] leading-snug font-bold text-slate-900">
        {value}
      </strong>
    </div>
  );
}

function MetricTrend({ label, value }: { label: string; value: string }) {
  const isCurrencyValue = value.includes('R$');

  return (
    <div className="grid min-h-[92px] min-w-0 content-between gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <span className="min-w-0 text-[11px] leading-snug font-medium text-slate-600">{label}</span>
      <strong
        className={cn(
          'min-w-0 text-slate-950 tabular-nums',
          isCurrencyValue
            ? 'whitespace-nowrap text-[15px] leading-none font-extrabold tracking-normal'
            : 'break-words text-[18px] leading-tight font-extrabold',
        )}
      >
        {value}
      </strong>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Alert className="grid min-h-32 place-items-center text-center font-semibold text-slate-600">
      <div className="grid justify-items-center gap-2">
        <BadgeCheck size={22} className="text-slate-400" />
        <span>{text}</span>
      </div>
    </Alert>
  );
}
