import MapboxDraw from '@mapbox/mapbox-gl-draw';
import mapboxgl from 'mapbox-gl';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapCanvas } from './components/MapCanvas';
import { OperationalSidebar, type OperationalSidebarMode } from './components/OperationalSidebar';
import { TokenWarning } from './components/TokenWarning';
import {
  API_BASE_URL,
  ApiError,
  createMeteorologyAsset,
  fetchCoverageSocioeconomicData,
  fetchIsochrone,
  fetchMeteorologyAssets,
  fetchMunicipalities,
  reverseGeocodeLocation,
  searchLocation,
  updateMeteorologyAssetCoverage,
} from './lib/api';
import {
  assetMatchesFilters,
  findMunicipalityFromGeocoding,
  formatGeocodedLocation,
  getErrorMessage,
  readFirstPolygonGeometry,
} from './lib/geo';
import {
  BRAZIL_BOUNDS,
  configureUrbanBuildingStyle,
  enableTerrain,
  getPolygonBounds,
  hasUrbanBuildingAtPoint,
  installUrbanBuildingInteractions,
  METEOROLOGY_ASSETS_LAYER_ID,
  readAssetFeature,
  type UrbanBuildingInteractionsController,
  upsertAssetLayer,
  upsertCoverageSocioeconomicLayer,
  upsertIsochroneLayer,
  upsertSelectedAssetLayer,
  upsertSelectedCoverageLayer,
  upsertSelectedPointLayer,
} from './lib/mapbox';
import {
  isStateModelAsset,
  measureMapFrameRate,
  removeSelectedAsset3dModel,
  removeStateAsset3dModels,
  STATE_ASSETS_3D_MODEL_LAYER_ID,
  upsertSelectedAsset3dModel,
  upsertStateAsset3dModels,
} from './lib/mapbox-3d';
import type {
  AssetFilters,
  AssetFormState,
  CoverageSocioeconomicData,
  CreateMeteorologyAssetRequest,
  IsochroneFeatureCollection,
  MeteorologyAssetPointFeature,
  MeteorologyAssetsPointCollection,
  ModelCalibration,
  ModelPerformance,
  Municipality,
  PolygonGeometry,
} from './types/geo';

import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import 'mapbox-gl/dist/mapbox-gl.css';

const initialFormState: AssetFormState = {
  name: '',
  description: '',
  municipalityId: '',
  status: 'NOT_STARTED',
};

const initialAssetFilters: AssetFilters = {
  state: 'ALL',
  status: 'ALL',
};

const emptyAssetsGeoJson: MeteorologyAssetsPointCollection = {
  type: 'FeatureCollection',
  features: [],
};

const ASSET_CLICK_HITBOX_PX = 22;
const MODEL_CLICK_HITBOX_PX = 28;
const selectedAssetModelUrl = import.meta.env.VITE_3D_MODEL_URL ?? '/models/tower.glb';

const initialModelCalibration: ModelCalibration = {
  offsetEastMeters: 0,
  offsetNorthMeters: 0,
  scaleX: 0.8,
  scaleY: 0.8,
  scaleZ: 1.2,
  rotationZ: 35,
  clipRadiusMeters: 120,
};

function createModelPerformance(status: ModelPerformance['status']): ModelPerformance {
  return {
    status,
    assetId: null,
    modelUrl: selectedAssetModelUrl,
    durationMs: null,
    frames: null,
    averageFps: null,
    maxFrameTimeMs: null,
    measuredAt: null,
    errorMessage: null,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isFetchNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message.toLowerCase().includes('fetch');
}

function getApiErrorMessage(error: unknown): string {
  if (isFetchNetworkError(error)) {
    return `Não foi possível conectar ao backend em ${API_BASE_URL}. Verifique se a API está rodando.`;
  }

  return getErrorMessage(error);
}

function coordinatesMatch(
  firstCoordinates: [number, number],
  secondCoordinates: [number, number],
): boolean {
  const tolerance = 0.000001;

  return (
    Math.abs(firstCoordinates[0] - secondCoordinates[0]) <= tolerance &&
    Math.abs(firstCoordinates[1] - secondCoordinates[1]) <= tolerance
  );
}

function findReloadedAsset(
  currentAsset: MeteorologyAssetPointFeature,
  reloadedAssets: MeteorologyAssetPointFeature[],
): MeteorologyAssetPointFeature | null {
  return (
    reloadedAssets.find(
      (asset) =>
        asset.properties.name === currentAsset.properties.name &&
        asset.properties.municipalityName === currentAsset.properties.municipalityName &&
        asset.properties.municipalityState === currentAsset.properties.municipalityState &&
        coordinatesMatch(asset.geometry.coordinates, currentAsset.geometry.coordinates),
    ) ??
    reloadedAssets.find(
      (asset) =>
        asset.properties.name === currentAsset.properties.name &&
        asset.properties.municipalityName === currentAsset.properties.municipalityName &&
        asset.properties.municipalityState === currentAsset.properties.municipalityState,
    ) ??
    null
  );
}

function clearDrawFeatures(draw: MapboxDraw) {
  const featureIds = draw
    .getAll()
    .features.map((feature) => feature.id)
    .filter((featureId): featureId is string | number => featureId !== undefined)
    .map(String);

  if (featureIds.length > 0) {
    draw.delete(featureIds);
  }
}

function App() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const assetClickRef = useRef(false);
  const geocodeAbortControllerRef = useRef<AbortController | null>(null);
  const ignoreNextMapClickRef = useRef(false);
  const isDrawingCoverageRef = useRef(false);
  const suppressNextDrawDeleteRef = useRef(false);
  const urbanBuildingClickRef = useRef(false);
  const urbanBuildingInteractionsRef = useRef<UrbanBuildingInteractionsController | null>(null);
  const clearDrawnCoverageAreaRef = useRef<() => void>(() => undefined);
  const coverageSocioeconomicAbortControllerRef = useRef<AbortController | null>(null);
  const coverageSocioeconomicSelectionRefreshRef = useRef<number | null>(null);
  const isochroneAbortControllerRef = useRef<AbortController | null>(null);
  const locationSearchAbortControllerRef = useRef<AbortController | null>(null);
  const selectedCoverageVisibleRef = useRef(true);
  const selectedAssetRef = useRef<MeteorologyAssetPointFeature | null>(null);
  const finalizeCoverageAreaRef = useRef<(nextCoverageArea: PolygonGeometry) => void>(
    () => undefined,
  );
  const resolveSelectedPointLocationRef = useRef<(coordinates: [number, number]) => void>(
    () => undefined,
  );
  const assetsByInfrastructurePointIdRef = useRef(new Map<number, MeteorologyAssetPointFeature>());
  const hasFocusedStateModelsRef = useRef(false);
  const municipalitiesRef = useRef<Municipality[]>([]);
  const modelMeasurementSequenceRef = useRef(0);
  const sidebarModeRef = useRef<OperationalSidebarMode>('assets');
  const [formStatus, setFormStatus] = useState('Clique no mapa para escolher o ponto.');
  const [form, setForm] = useState<AssetFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [assetsGeoJson, setAssetsGeoJson] =
    useState<MeteorologyAssetsPointCollection>(emptyAssetsGeoJson);
  const [totalAssetsCount, setTotalAssetsCount] = useState(0);
  const [filters, setFilters] = useState<AssetFilters>(initialAssetFilters);
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);
  const [drawnCoverageArea, setDrawnCoverageArea] = useState<PolygonGeometry | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<MeteorologyAssetPointFeature | null>(null);
  const [coverageSocioeconomicData, setCoverageSocioeconomicData] =
    useState<CoverageSocioeconomicData | null>(null);
  const [coverageSocioeconomicStatus, setCoverageSocioeconomicStatus] = useState<
    'idle' | 'loading' | 'complete' | 'failed'
  >('idle');
  const [coverageSocioeconomicError, setCoverageSocioeconomicError] = useState<string | null>(null);
  const [isochroneData, setIsochroneData] = useState<IsochroneFeatureCollection | null>(null);
  const [isochroneStatus, setIsochroneStatus] = useState<
    'idle' | 'loading' | 'complete' | 'failed'
  >('idle');
  const [isochroneError, setIsochroneError] = useState<string | null>(null);
  const [isSelectedCoverageVisible, setIsSelectedCoverageVisible] = useState(true);
  const [sidebarMode, setSidebarMode] = useState<OperationalSidebarMode>('assets');
  const [isDrawingCoverage, setIsDrawingCoverage] = useState(false);
  const [isEditingExistingCoverage, setIsEditingExistingCoverage] = useState(false);
  const [isSavingCoverageEdit, setIsSavingCoverageEdit] = useState(false);
  const [selectedAssetElevationMeters, setSelectedAssetElevationMeters] = useState<number | null>(
    null,
  );
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchStatus, setLocationSearchStatus] = useState<
    'idle' | 'loading' | 'complete' | 'failed'
  >('idle');
  const [locationSearchMessage, setLocationSearchMessage] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [modelCalibration, setModelCalibration] =
    useState<ModelCalibration>(initialModelCalibration);
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance>(
    createModelPerformance('idle'),
  );
  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const tokenMissing = !accessToken || accessToken === 'your_mapbox_access_token_here';

  const reloadAssets = useCallback(async (signal: AbortSignal, nextFilters: AssetFilters) => {
    const geoJson = await fetchMeteorologyAssets(signal, nextFilters);
    assetsByInfrastructurePointIdRef.current = new Map(
      geoJson.features.map((feature) => [feature.properties.infrastructurePointId, feature]),
    );
    setAssetsGeoJson(geoJson);
    return geoJson;
  }, []);

  const hasActiveFilters = useMemo(
    () => filters.state !== 'ALL' || filters.status !== 'ALL',
    [filters],
  );
  const selectedAssetInfrastructurePointId =
    selectedAsset?.properties.infrastructurePointId ?? null;

  useEffect(() => {
    selectedAssetRef.current = selectedAsset;
    urbanBuildingInteractionsRef.current?.clear();
  }, [selectedAsset]);

  const clearSelectedAsset = useCallback(() => {
    coverageSocioeconomicAbortControllerRef.current?.abort();
    setSelectedAsset(null);
    setCoverageSocioeconomicData(null);
    setCoverageSocioeconomicStatus('idle');
    setCoverageSocioeconomicError(null);
    setSidebarMode('assets');

    if (!mapRef.current || !isMapLoaded) {
      return;
    }

    upsertSelectedCoverageLayer(mapRef.current, null);
    upsertSelectedAssetLayer(mapRef.current, null);
  }, [isMapLoaded]);

  const setSelectedCoverageVisibility = useCallback(
    (visible: boolean) => {
      selectedCoverageVisibleRef.current = visible;
      setIsSelectedCoverageVisible(visible);

      if (!mapRef.current || !isMapLoaded) {
        return;
      }

      upsertSelectedCoverageLayer(mapRef.current, visible ? selectedAsset : null);
    },
    [isMapLoaded, selectedAsset],
  );

  const clearDrawnCoverageArea = useCallback(() => {
    const draw = drawRef.current;

    if (draw) {
      suppressNextDrawDeleteRef.current = true;
      clearDrawFeatures(draw);
      draw.changeMode('simple_select', { featureIds: [] });
    }

    isDrawingCoverageRef.current = false;
    setIsDrawingCoverage(false);
    setIsEditingExistingCoverage(false);
    setDrawnCoverageArea(null);

    if (mapRef.current) {
      upsertSelectedCoverageLayer(mapRef.current, null);
    }
  }, []);

  const startCoverageDraw = useCallback(() => {
    if (!selectedPoint) {
      setFormStatus('Selecione o ponto do ativo antes de desenhar a área.');
      return;
    }

    const draw = drawRef.current;

    if (!draw) {
      setFormStatus('O desenho de área ainda não está disponível no mapa.');
      return;
    }

    clearDrawnCoverageArea();
    draw.changeMode('draw_polygon');
    isDrawingCoverageRef.current = true;
    setIsDrawingCoverage(true);
    setSidebarMode('coverage');
    setFormStatus('Marque a área. Clique no primeiro ponto ou em Concluir área para finalizar.');
  }, [clearDrawnCoverageArea, selectedPoint]);

  const startSelectedCoverageEdit = useCallback(() => {
    if (!selectedAsset) {
      setFormStatus('Selecione um ativo para redesenhar a cobertura.');
      return;
    }

    const draw = drawRef.current;

    if (!draw) {
      setFormStatus('O desenho de área ainda não está disponível no mapa.');
      return;
    }

    clearDrawnCoverageArea();
    setSelectedPoint(null);
    setIsEditingExistingCoverage(true);
    setSidebarMode('coverage');
    draw.changeMode('draw_polygon');
    isDrawingCoverageRef.current = true;
    setIsDrawingCoverage(true);
    setFormStatus('Redesenhe a cobertura do ativo selecionado e salve a alteração.');
  }, [clearDrawnCoverageArea, selectedAsset]);

  const finalizeCoverageArea = useCallback(
    (nextCoverageArea: PolygonGeometry) => {
      const draw = drawRef.current;

      if (draw) {
        suppressNextDrawDeleteRef.current = true;
        clearDrawFeatures(draw);
        draw.changeMode('simple_select', { featureIds: [] });
      }

      isDrawingCoverageRef.current = false;
      setIsDrawingCoverage(false);
      setDrawnCoverageArea(nextCoverageArea);
      setFormStatus('Área desenhada. Preencha os dados e salve o ativo.');

      const draftPoint = selectedPoint ?? selectedAsset?.geometry.coordinates ?? null;

      if (mapRef.current && draftPoint) {
        const draftCoverageFeature: MeteorologyAssetPointFeature = selectedAsset
          ? {
              ...selectedAsset,
              properties: {
                ...selectedAsset.properties,
                coverageArea: nextCoverageArea,
              },
            }
          : {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: draftPoint,
              },
              properties: {
                id: 0,
                infrastructurePointId: 0,
                name: form.name.trim() || 'Área desenhada',
                description: form.description.trim() || null,
                municipalityId: Number(form.municipalityId || 0),
                municipalityName: null,
                municipalityState: null,
                status: form.status,
                coverageArea: nextCoverageArea,
              },
            };

        upsertSelectedCoverageLayer(mapRef.current, draftCoverageFeature);
      }
    },
    [form.description, form.municipalityId, form.name, form.status, selectedAsset, selectedPoint],
  );

  const finishCoverageDraw = useCallback(() => {
    const draw = drawRef.current;

    if (!draw || !isDrawingCoverageRef.current) {
      return;
    }

    window.setTimeout(() => {
      const nextCoverageArea = readFirstPolygonGeometry(draw.getAll(), {
        discardActiveDrawVertex: true,
      });

      if (nextCoverageArea) {
        finalizeCoverageArea(nextCoverageArea);
        return;
      }

      setFormStatus('Marque pelo menos três pontos para concluir a área.');
    }, 0);
  }, [finalizeCoverageArea]);

  const resetCreateDraft = useCallback(() => {
    clearDrawnCoverageArea();
    setSelectedPoint(null);
    setIsEditingExistingCoverage(false);
    setSidebarMode('assets');
    setForm(() => ({
      ...initialFormState,
      municipalityId: '',
    }));
    setFormStatus('Clique no mapa para escolher o ponto.');

    if (mapRef.current && isMapLoaded) {
      upsertSelectedPointLayer(mapRef.current, null);
    }
  }, [clearDrawnCoverageArea, isMapLoaded]);

  const startCreateWorkflow = useCallback(() => {
    setSelectedAsset(null);
    setIsEditingExistingCoverage(false);
    setSidebarMode('create');
    setFormStatus(
      selectedPoint
        ? 'Ponto selecionado. Desenhe a área de cobertura.'
        : 'Clique no mapa para escolher o ponto.',
    );

    if (mapRef.current && isMapLoaded) {
      upsertSelectedCoverageLayer(mapRef.current, null);
      upsertSelectedAssetLayer(mapRef.current, null);
    }
  }, [isMapLoaded, selectedPoint]);

  const resolveSelectedPointLocation = useCallback(
    (coordinates: [number, number]) => {
      geocodeAbortControllerRef.current?.abort();

      if (!accessToken || tokenMissing) {
        setForm((currentForm) => ({
          ...currentForm,
          municipalityId: '',
        }));
        setFormStatus('Ponto selecionado. Selecione o município e desenhe a área de cobertura.');
        return;
      }

      const abortController = new AbortController();
      geocodeAbortControllerRef.current = abortController;
      setForm((currentForm) => ({
        ...currentForm,
        municipalityId: '',
      }));
      setFormStatus('Ponto selecionado. Identificando local pelo Mapbox...');

      void reverseGeocodeLocation(abortController.signal, coordinates, accessToken)
        .then((location) => {
          if (abortController.signal.aborted) {
            return;
          }

          geocodeAbortControllerRef.current = null;

          if (!location) {
            setFormStatus(
              'Ponto selecionado. Selecione o município e desenhe a área de cobertura.',
            );
            return;
          }

          const municipality = findMunicipalityFromGeocoding(location, municipalitiesRef.current);

          if (municipality) {
            setForm((currentForm) => ({
              ...currentForm,
              municipalityId: String(municipality.id),
            }));
            setFormStatus(
              `Ponto selecionado em ${municipality.state ? `${municipality.state} - ` : ''}${municipality.name}. Desenhe a área de cobertura.`,
            );
            return;
          }

          setFormStatus(
            `Mapbox identificou ${formatGeocodedLocation(location)}. Selecione o município manualmente.`,
          );
        })
        .catch((error: unknown) => {
          if (abortController.signal.aborted) {
            return;
          }

          geocodeAbortControllerRef.current = null;
          console.error('Failed to reverse geocode selected point', error);
          setFormStatus('Ponto selecionado. Não foi possível identificar o local automaticamente.');
        });
    },
    [tokenMissing],
  );

  useEffect(() => {
    clearDrawnCoverageAreaRef.current = clearDrawnCoverageArea;
  }, [clearDrawnCoverageArea]);

  useEffect(() => {
    finalizeCoverageAreaRef.current = finalizeCoverageArea;
  }, [finalizeCoverageArea]);

  useEffect(() => {
    resolveSelectedPointLocationRef.current = resolveSelectedPointLocation;
  }, [resolveSelectedPointLocation]);

  useEffect(() => {
    if (selectedAssetInfrastructurePointId === null) {
      coverageSocioeconomicAbortControllerRef.current?.abort();
      isochroneAbortControllerRef.current?.abort();
      setCoverageSocioeconomicData(null);
      setCoverageSocioeconomicStatus('idle');
      setCoverageSocioeconomicError(null);
      setIsochroneData(null);
      setIsochroneStatus('idle');
      setIsochroneError(null);
      return;
    }

    if (coverageSocioeconomicSelectionRefreshRef.current === selectedAssetInfrastructurePointId) {
      coverageSocioeconomicSelectionRefreshRef.current = null;
      return;
    }

    coverageSocioeconomicAbortControllerRef.current?.abort();
    isochroneAbortControllerRef.current?.abort();
    setCoverageSocioeconomicData(null);
    setCoverageSocioeconomicStatus('idle');
    setCoverageSocioeconomicError(null);
    setIsochroneData(null);
    setIsochroneStatus('idle');
    setIsochroneError(null);
  }, [selectedAssetInfrastructurePointId]);

  useEffect(() => {
    const abortController = new AbortController();

    void fetchMunicipalities(abortController.signal)
      .then((data) => {
        setMunicipalities(data);
        setForm((currentForm) => ({
          ...currentForm,
          municipalityId: data.some(
            (municipality) => String(municipality.id) === currentForm.municipalityId,
          )
            ? currentForm.municipalityId
            : '',
        }));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setFormStatus('Falha ao carregar municípios da API.');
      });

    return () => {
      geocodeAbortControllerRef.current?.abort();
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    municipalitiesRef.current = municipalities;
  }, [municipalities]);

  useEffect(() => {
    sidebarModeRef.current = sidebarMode;
  }, [sidebarMode]);

  useEffect(() => {
    if (tokenMissing || !mapContainerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [-53.2, -10.3],
      zoom: 3.5,
      minZoom: 3,
      maxBounds: BRAZIL_BOUNDS,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: 'simple_select',
    });
    map.addControl(draw, 'top-right');
    drawRef.current = draw;
    map.fitBounds(BRAZIL_BOUNDS, { padding: 24, duration: 0 });
    mapRef.current = map;

    map.on('style.load', () => {
      map.setConfigProperty('basemap', 'lightPreset', 'day');
      map.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
      configureUrbanBuildingStyle(map);
      enableTerrain(map);
    });

    const urbanBuildingInteractions = installUrbanBuildingInteractions(map, {
      getSelectedAsset: () => selectedAssetRef.current,
      onBuildingClick: () => {
        urbanBuildingClickRef.current = true;
        window.setTimeout(() => {
          urbanBuildingClickRef.current = false;
        }, 75);
      },
    });
    urbanBuildingInteractionsRef.current = urbanBuildingInteractions;

    const syncDrawnCoverageArea = () => {
      if (suppressNextDrawDeleteRef.current) {
        suppressNextDrawDeleteRef.current = false;
        return;
      }

      const nextCoverageArea = readFirstPolygonGeometry(draw.getAll());

      if (nextCoverageArea) {
        ignoreNextMapClickRef.current = true;
        window.setTimeout(() => {
          ignoreNextMapClickRef.current = false;
        }, 75);
        finalizeCoverageAreaRef.current(nextCoverageArea);
        return;
      }

      isDrawingCoverageRef.current = false;
      setIsDrawingCoverage(false);
      setDrawnCoverageArea(null);
      setFormStatus('Área removida. Desenhe a cobertura antes de salvar.');
    };

    map.on('load', () => {
      upsertSelectedPointLayer(map, null);
      upsertSelectedCoverageLayer(map, null);
      upsertSelectedAssetLayer(map, null);
      setIsMapLoaded(true);
    });
    map.on('draw.create', syncDrawnCoverageArea);
    map.on('draw.delete', syncDrawnCoverageArea);

    const readAssetFromRenderedFeature = (feature: mapboxgl.MapboxGeoJSONFeature) => {
      const renderedAssetFeature = readAssetFeature(feature);

      return renderedAssetFeature
        ? (assetsByInfrastructurePointIdRef.current.get(
            renderedAssetFeature.properties.infrastructurePointId,
          ) ?? renderedAssetFeature)
        : null;
    };

    const selectRenderedAsset = (assetFeature: MeteorologyAssetPointFeature) => {
      if (isStateModelAsset(assetFeature)) {
        setSelectedAsset(assetFeature);
        setIsEditingExistingCoverage(false);
        setSidebarMode('model');
        clearDrawnCoverageAreaRef.current();
        setSelectedPoint(null);
        upsertSelectedPointLayer(map, null);
        upsertSelectedCoverageLayer(map, selectedCoverageVisibleRef.current ? assetFeature : null);
        upsertSelectedAssetLayer(map, assetFeature);
        return;
      }

      setSelectedAsset(assetFeature);
      setIsEditingExistingCoverage(false);
      setSidebarMode('details');
      clearDrawnCoverageAreaRef.current();
      upsertSelectedCoverageLayer(map, selectedCoverageVisibleRef.current ? assetFeature : null);
      upsertSelectedAssetLayer(map, assetFeature);
      setSelectedPoint(null);
      upsertSelectedPointLayer(map, null);
      setFormStatus('Entregável selecionado. Clique em uma área vazia para cadastrar outro ponto.');
      map.easeTo({
        center: assetFeature.geometry.coordinates,
        zoom: Math.max(map.getZoom(), 15),
        pitch: 60,
        duration: 700,
      });
    };

    const queryRenderedFeaturesAroundPoint = (
      point: mapboxgl.Point,
      hitbox: number,
      layers: string[],
    ) =>
      map.queryRenderedFeatures(
        [
          [point.x - hitbox, point.y - hitbox],
          [point.x + hitbox, point.y + hitbox],
        ],
        { layers },
      );

    const findNearestAssetAtPoint = (
      point: mapboxgl.Point,
      hitbox: number,
      predicate: (asset: MeteorologyAssetPointFeature) => boolean = () => true,
    ) => {
      let nearestAsset: MeteorologyAssetPointFeature | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const assetFeature of assetsByInfrastructurePointIdRef.current.values()) {
        if (!predicate(assetFeature)) {
          continue;
        }

        const projectedPoint = map.project(assetFeature.geometry.coordinates);
        const distance = Math.hypot(projectedPoint.x - point.x, projectedPoint.y - point.y);

        if (distance <= hitbox && distance < nearestDistance) {
          nearestAsset = assetFeature;
          nearestDistance = distance;
        }
      }

      return nearestAsset;
    };

    map.on('click', METEOROLOGY_ASSETS_LAYER_ID, (event) => {
      if (isDrawingCoverageRef.current || draw.getMode() === 'draw_polygon') {
        return;
      }

      assetClickRef.current = true;
      event.preventDefault();

      const clickedFeature = event.features?.[0];
      const assetFeature = clickedFeature ? readAssetFromRenderedFeature(clickedFeature) : null;

      if (!assetFeature) {
        return;
      }

      selectRenderedAsset(assetFeature);
    });

    map.on('mouseenter', METEOROLOGY_ASSETS_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', METEOROLOGY_ASSETS_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('click', (event) => {
      if (assetClickRef.current) {
        assetClickRef.current = false;
        return;
      }

      if (ignoreNextMapClickRef.current) {
        ignoreNextMapClickRef.current = false;
        return;
      }

      if (urbanBuildingClickRef.current) {
        urbanBuildingClickRef.current = false;
        return;
      }

      if (isDrawingCoverageRef.current || draw.getMode() === 'draw_polygon') {
        return;
      }

      const modelFeatures = map.getLayer(STATE_ASSETS_3D_MODEL_LAYER_ID)
        ? queryRenderedFeaturesAroundPoint(event.point, MODEL_CLICK_HITBOX_PX, [
            STATE_ASSETS_3D_MODEL_LAYER_ID,
          ])
        : [];
      const nearestStateAsset = findNearestAssetAtPoint(
        event.point,
        MODEL_CLICK_HITBOX_PX,
        isStateModelAsset,
      );

      if (nearestStateAsset) {
        selectRenderedAsset(nearestStateAsset);
        return;
      }

      if (modelFeatures.length > 0) {
        setSidebarMode('model');
        setSelectedAsset(null);
        setIsEditingExistingCoverage(false);
        clearDrawnCoverageAreaRef.current();
        setSelectedPoint(null);
        upsertSelectedPointLayer(map, null);
        upsertSelectedAssetLayer(map, null);
        return;
      }

      const features = queryRenderedFeaturesAroundPoint(event.point, ASSET_CLICK_HITBOX_PX, [
        METEOROLOGY_ASSETS_LAYER_ID,
      ]);
      const assetFeature =
        (features[0] ? readAssetFromRenderedFeature(features[0]) : null) ??
        findNearestAssetAtPoint(event.point, ASSET_CLICK_HITBOX_PX);

      if (assetFeature) {
        selectRenderedAsset(assetFeature);
        return;
      }

      if (hasUrbanBuildingAtPoint(map, event.point, event.lngLat, selectedAssetRef.current)) {
        return;
      }

      const coordinates: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      setSelectedAsset(null);
      setIsEditingExistingCoverage(false);
      setSidebarMode('create');
      clearDrawnCoverageAreaRef.current();
      upsertSelectedCoverageLayer(map, null);
      upsertSelectedAssetLayer(map, null);
      setSelectedPoint(coordinates);
      setForm((currentForm) => ({
        ...currentForm,
        municipalityId: '',
      }));
      upsertSelectedPointLayer(map, coordinates);
      resolveSelectedPointLocationRef.current(coordinates);
    });

    map.on('dblclick', (event) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: [METEOROLOGY_ASSETS_LAYER_ID],
      });

      if (features.length > 0) {
        event.preventDefault();
      }
    });

    return () => {
      map.off('draw.create', syncDrawnCoverageArea);
      map.off('draw.delete', syncDrawnCoverageArea);
      urbanBuildingInteractions.dispose();
      urbanBuildingInteractionsRef.current = null;
      drawRef.current = null;
      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, [tokenMissing]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) {
      return;
    }

    upsertAssetLayer(mapRef.current, assetsGeoJson);
  }, [assetsGeoJson, isMapLoaded]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) {
      return;
    }

    upsertSelectedCoverageLayer(mapRef.current, isSelectedCoverageVisible ? selectedAsset : null);
  }, [isMapLoaded, isSelectedCoverageVisible, selectedAsset]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) {
      return;
    }

    upsertCoverageSocioeconomicLayer(mapRef.current, coverageSocioeconomicData);
  }, [coverageSocioeconomicData, isMapLoaded]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) {
      return;
    }

    upsertIsochroneLayer(mapRef.current, isochroneData);
  }, [isochroneData, isMapLoaded]);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !selectedAsset) {
      setSelectedAssetElevationMeters(null);
      return;
    }

    const elevation = mapRef.current.queryTerrainElevation(selectedAsset.geometry.coordinates, {
      exaggerated: false,
    });

    setSelectedAssetElevationMeters(typeof elevation === 'number' ? elevation : null);
  }, [isMapLoaded, selectedAsset]);

  useEffect(() => {
    const map = mapRef.current;

    if (!isMapLoaded || !map) {
      return;
    }

    const stateAssets = upsertStateAsset3dModels(map, assetsGeoJson, {
      modelUrl: selectedAssetModelUrl,
      scale: [modelCalibration.scaleX, modelCalibration.scaleY, modelCalibration.scaleZ],
      rotation: [0, 0, modelCalibration.rotationZ],
      offsetMeters: {
        east: modelCalibration.offsetEastMeters,
        north: modelCalibration.offsetNorthMeters,
      },
      clipRadiusMeters: modelCalibration.clipRadiusMeters,
      minZoom: 15,
      onReady: () => {
        void measureMapFrameRate(5000).then((measurement) => {
          console.info('Configured state 3D model performance', {
            modelUrl: selectedAssetModelUrl,
            assetsCount: stateAssets.length,
            ...measurement,
          });
        });
      },
      onError: (error) => {
        console.error('Failed to render configured state 3D models', error);
      },
    });

    if (stateAssets.length > 0 && !hasFocusedStateModelsRef.current) {
      const firstStateAsset = stateAssets[0];
      hasFocusedStateModelsRef.current = true;

      map.easeTo({
        center: firstStateAsset.geometry.coordinates,
        zoom: 15.27,
        pitch: 42,
        bearing: -50,
        duration: 900,
      });
    }

    return () => {
      if (mapRef.current) {
        removeStateAsset3dModels(mapRef.current);
      }
    };
  }, [assetsGeoJson, isMapLoaded, modelCalibration]);

  useEffect(() => {
    const map = mapRef.current;
    modelMeasurementSequenceRef.current += 1;
    const sequence = modelMeasurementSequenceRef.current;

    if (!isMapLoaded || !map || !selectedAsset) {
      if (map) {
        removeSelectedAsset3dModel(map);
      }

      setModelPerformance(createModelPerformance('idle'));
      return;
    }

    setModelPerformance({
      ...createModelPerformance('measuring'),
      assetId: selectedAsset.properties.infrastructurePointId,
    });

    upsertSelectedAsset3dModel(map, selectedAsset, {
      modelUrl: selectedAssetModelUrl,
      scale: [modelCalibration.scaleX, modelCalibration.scaleY, modelCalibration.scaleZ],
      rotation: [0, 0, modelCalibration.rotationZ],
      offsetMeters: {
        east: modelCalibration.offsetEastMeters,
        north: modelCalibration.offsetNorthMeters,
      },
      clipRadiusMeters: modelCalibration.clipRadiusMeters,
      minZoom: 15,
      onReady: () => {
        if (sequence !== modelMeasurementSequenceRef.current) {
          return;
        }

        void measureMapFrameRate(5000)
          .then((measurement) => {
            if (sequence !== modelMeasurementSequenceRef.current) {
              return;
            }

            setModelPerformance({
              status: 'complete',
              assetId: selectedAsset.properties.infrastructurePointId,
              modelUrl: selectedAssetModelUrl,
              durationMs: measurement.durationMs,
              frames: measurement.frames,
              averageFps: measurement.averageFps,
              maxFrameTimeMs: measurement.maxFrameTimeMs,
              measuredAt: measurement.measuredAt,
              errorMessage: null,
            });
          })
          .catch((error: unknown) => {
            if (sequence !== modelMeasurementSequenceRef.current) {
              return;
            }

            setModelPerformance({
              ...createModelPerformance('failed'),
              assetId: selectedAsset.properties.infrastructurePointId,
              errorMessage: getErrorMessage(error),
            });
          });
      },
      onError: (error) => {
        if (sequence !== modelMeasurementSequenceRef.current) {
          return;
        }

        setModelPerformance({
          ...createModelPerformance('failed'),
          assetId: selectedAsset.properties.infrastructurePointId,
          errorMessage: getErrorMessage(error),
        });
      },
    });

    return () => {
      if (mapRef.current) {
        removeSelectedAsset3dModel(mapRef.current);
      }
    };
  }, [isMapLoaded, modelCalibration, selectedAsset]);

  useEffect(() => {
    if (selectedAsset && !assetMatchesFilters(selectedAsset, filters)) {
      clearSelectedAsset();
    }
  }, [clearSelectedAsset, filters, selectedAsset]);

  useEffect(() => {
    if (!isMapLoaded) {
      return;
    }

    const abortController = new AbortController();

    void reloadAssets(abortController.signal, filters)
      .then((geoJson) => {
        if (!hasActiveFilters) {
          setTotalAssetsCount(geoJson.features.length);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        const errorMessage = getErrorMessage(error);
        console.error('Failed to load filtered meteorology assets from API', error);
        setFormStatus(`Falha ao carregar entregáveis da API: ${errorMessage}`);
      });

    if (hasActiveFilters && totalAssetsCount === 0) {
      const totalAbortController = new AbortController();

      void fetchMeteorologyAssets(totalAbortController.signal, initialAssetFilters)
        .then((geoJson) => setTotalAssetsCount(geoJson.features.length))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }

          console.error('Failed to load total meteorology assets count from API', error);
        });

      return () => {
        abortController.abort();
        totalAbortController.abort();
      };
    }

    return () => {
      abortController.abort();
    };
  }, [filters, hasActiveFilters, isMapLoaded, reloadAssets, totalAssetsCount]);

  const loadCoverageSocioeconomicData = useCallback(async () => {
    if (!selectedAsset) {
      return;
    }

    coverageSocioeconomicAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    coverageSocioeconomicAbortControllerRef.current = abortController;
    setCoverageSocioeconomicStatus('loading');
    setCoverageSocioeconomicError(null);

    try {
      const data = await fetchCoverageSocioeconomicData(
        abortController.signal,
        selectedAsset.properties.infrastructurePointId,
      );

      if (abortController.signal.aborted) {
        return;
      }

      setCoverageSocioeconomicData(data);
      setCoverageSocioeconomicStatus('complete');
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        try {
          const geoJson = await reloadAssets(abortController.signal, filters);

          if (abortController.signal.aborted) {
            return;
          }

          const reloadedAsset = findReloadedAsset(selectedAsset, geoJson.features);

          if (!reloadedAsset) {
            setCoverageSocioeconomicStatus('failed');
            setCoverageSocioeconomicError(
              'O ativo selecionado não existe mais na base atual. Selecione o ativo novamente.',
            );
            return;
          }

          const retryData = await fetchCoverageSocioeconomicData(
            abortController.signal,
            reloadedAsset.properties.infrastructurePointId,
          );

          if (abortController.signal.aborted) {
            return;
          }

          coverageSocioeconomicSelectionRefreshRef.current =
            reloadedAsset.properties.infrastructurePointId;
          setSelectedAsset(reloadedAsset);
          setCoverageSocioeconomicData(retryData);
          setCoverageSocioeconomicStatus('complete');
          setCoverageSocioeconomicError(null);

          if (mapRef.current) {
            upsertSelectedCoverageLayer(
              mapRef.current,
              selectedCoverageVisibleRef.current ? reloadedAsset : null,
            );
            upsertSelectedAssetLayer(mapRef.current, reloadedAsset);
          }

          return;
        } catch (retryError: unknown) {
          if (isAbortError(retryError)) {
            return;
          }

          const retryErrorMessage = getApiErrorMessage(retryError);
          console.error('Failed to reload coverage socioeconomic data', retryError);
          setCoverageSocioeconomicStatus('failed');
          setCoverageSocioeconomicError(retryErrorMessage);
          return;
        }
      }

      const errorMessage = getApiErrorMessage(error);
      console.error('Failed to load coverage socioeconomic data', error);
      setCoverageSocioeconomicStatus('failed');
      setCoverageSocioeconomicError(errorMessage);
    } finally {
      if (coverageSocioeconomicAbortControllerRef.current === abortController) {
        coverageSocioeconomicAbortControllerRef.current = null;
      }
    }
  }, [filters, reloadAssets, selectedAsset]);

  const loadSelectedAssetIsochrone = useCallback(async () => {
    if (!selectedAsset || !accessToken || tokenMissing) {
      return;
    }

    isochroneAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    isochroneAbortControllerRef.current = abortController;
    setIsochroneStatus('loading');
    setIsochroneError(null);

    try {
      const data = await fetchIsochrone(
        abortController.signal,
        selectedAsset.geometry.coordinates,
        accessToken,
      );

      if (abortController.signal.aborted) {
        return;
      }

      setIsochroneData(data);
      setIsochroneStatus('complete');
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return;
      }

      const errorMessage = getErrorMessage(error);
      console.error('Failed to load isochrone', error);
      setIsochroneStatus('failed');
      setIsochroneError(errorMessage);
    } finally {
      if (isochroneAbortControllerRef.current === abortController) {
        isochroneAbortControllerRef.current = null;
      }
    }
  }, [selectedAsset, tokenMissing]);

  const handleLocationSearch = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const query = locationSearchQuery.trim();

      if (!query || !accessToken || tokenMissing) {
        return;
      }

      locationSearchAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      locationSearchAbortControllerRef.current = abortController;
      setLocationSearchStatus('loading');
      setLocationSearchMessage(null);

      try {
        const result = await searchLocation(abortController.signal, query, accessToken);

        if (abortController.signal.aborted) {
          return;
        }

        if (!result) {
          setLocationSearchStatus('failed');
          setLocationSearchMessage('Nenhum local encontrado no Brasil.');
          return;
        }

        mapRef.current?.easeTo({
          center: result.coordinates,
          zoom: 12,
          pitch: 42,
          duration: 700,
        });
        setLocationSearchStatus('complete');
        setLocationSearchMessage(result.label);
      } catch (error: unknown) {
        if (isAbortError(error)) {
          return;
        }

        setLocationSearchStatus('failed');
        setLocationSearchMessage(getErrorMessage(error));
      } finally {
        if (locationSearchAbortControllerRef.current === abortController) {
          locationSearchAbortControllerRef.current = null;
        }
      }
    },
    [locationSearchQuery, tokenMissing],
  );

  const saveCoverageEdit = useCallback(async () => {
    if (!selectedAsset || !drawnCoverageArea) {
      setFormStatus('Redesenhe a cobertura antes de salvar a alteração.');
      return;
    }

    setIsSavingCoverageEdit(true);
    setFormStatus('Salvando nova cobertura do ativo...');

    try {
      await updateMeteorologyAssetCoverage(
        selectedAsset.properties.infrastructurePointId,
        drawnCoverageArea,
      );

      const updatedAsset: MeteorologyAssetPointFeature = {
        ...selectedAsset,
        properties: {
          ...selectedAsset.properties,
          coverageArea: drawnCoverageArea,
        },
      };
      const abortController = new AbortController();
      await reloadAssets(abortController.signal, filters);
      setSelectedAsset(updatedAsset);
      setDrawnCoverageArea(null);
      setIsEditingExistingCoverage(false);
      setSidebarMode('details');
      setFormStatus('Cobertura atualizada. Dados e polígono foram recarregados.');

      if (mapRef.current) {
        upsertSelectedCoverageLayer(
          mapRef.current,
          selectedCoverageVisibleRef.current ? updatedAsset : null,
        );
        upsertSelectedAssetLayer(mapRef.current, updatedAsset);
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Failed to update meteorology asset coverage', error);
      setFormStatus(`Falha ao atualizar cobertura: ${errorMessage}`);
    } finally {
      setIsSavingCoverageEdit(false);
    }
  }, [drawnCoverageArea, filters, reloadAssets, selectedAsset]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedPoint) {
      setFormStatus('Selecione um ponto no mapa antes de salvar.');
      return;
    }

    if (!form.name.trim()) {
      setFormStatus('Informe o nome do ativo.');
      return;
    }

    if (!form.municipalityId) {
      setFormStatus('Selecione um município.');
      return;
    }

    if (!drawnCoverageArea) {
      setFormStatus('Desenhe a área de cobertura antes de salvar.');
      return;
    }

    const payload: CreateMeteorologyAssetRequest = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      municipalityId: Number(form.municipalityId),
      geometry: {
        type: 'Point',
        coordinates: selectedPoint,
      },
      coverageArea: drawnCoverageArea,
      status: form.status,
    };

    setIsSubmitting(true);
    setFormStatus('Salvando ativo meteorológico...');

    try {
      await createMeteorologyAsset(payload);
      setForm(() => ({
        ...initialFormState,
        municipalityId: '',
      }));
      setSelectedPoint(null);
      clearDrawnCoverageArea();
      setSidebarMode('assets');
      setFormStatus('Ativo salvo. A camada foi atualizada.');

      if (mapRef.current) {
        upsertSelectedPointLayer(mapRef.current, null);
        upsertSelectedCoverageLayer(mapRef.current, null);
        const abortController = new AbortController();
        const geoJson = await reloadAssets(abortController.signal, filters);

        if (!hasActiveFilters) {
          setTotalAssetsCount(geoJson.features.length);
        }
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Failed to create meteorology asset', error);
      setFormStatus(`Falha ao salvar ativo meteorológico: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const focusSelectedAssetCoverage = () => {
    if (!mapRef.current || !selectedAsset) {
      return;
    }

    const coverageBounds = selectedAsset.properties.coverageArea
      ? getPolygonBounds(selectedAsset.properties.coverageArea)
      : null;

    if (coverageBounds) {
      mapRef.current.fitBounds(coverageBounds, {
        padding: 96,
        maxZoom: 9,
        duration: 600,
      });
      return;
    }

    mapRef.current.easeTo({
      center: selectedAsset.geometry.coordinates,
      zoom: Math.max(mapRef.current.getZoom(), 8),
      duration: 600,
    });
  };

  const selectAssetFromSidebar = useCallback((assetFeature: MeteorologyAssetPointFeature) => {
    const map = mapRef.current;

    setSelectedAsset(assetFeature);
    setIsEditingExistingCoverage(false);
    setSidebarMode(isStateModelAsset(assetFeature) ? 'model' : 'details');
    clearDrawnCoverageAreaRef.current();
    setSelectedPoint(null);

    if (!map) {
      return;
    }

    upsertSelectedPointLayer(map, null);
    upsertSelectedCoverageLayer(map, selectedCoverageVisibleRef.current ? assetFeature : null);
    upsertSelectedAssetLayer(map, assetFeature);
    map.easeTo({
      center: assetFeature.geometry.coordinates,
      zoom: Math.max(map.getZoom(), 15),
      pitch: 60,
      duration: 700,
    });
  }, []);

  const resetModelCalibration = useCallback(() => {
    setModelCalibration(initialModelCalibration);
  }, []);

  return (
    <>
      <MapCanvas containerRef={mapContainerRef} />

      {!tokenMissing && (
        <OperationalSidebar
          assets={assetsGeoJson.features}
          coverageArea={drawnCoverageArea}
          coverageSocioeconomicData={coverageSocioeconomicData}
          coverageSocioeconomicError={coverageSocioeconomicError}
          coverageSocioeconomicStatus={coverageSocioeconomicStatus}
          filters={filters}
          form={form}
          formStatus={formStatus}
          isDrawingCoverage={isDrawingCoverage}
          isEditingExistingCoverage={isEditingExistingCoverage}
          isSavingCoverageEdit={isSavingCoverageEdit}
          isSelectedCoverageVisible={isSelectedCoverageVisible}
          isSubmitting={isSubmitting}
          isochroneError={isochroneError}
          isochroneStatus={isochroneStatus}
          locationSearchMessage={locationSearchMessage}
          locationSearchQuery={locationSearchQuery}
          locationSearchStatus={locationSearchStatus}
          mode={sidebarMode}
          modelCalibration={modelCalibration}
          modelPerformance={modelPerformance}
          municipalities={municipalities}
          selectedAsset={selectedAsset}
          selectedAssetElevationMeters={selectedAssetElevationMeters}
          selectedPoint={selectedPoint}
          totalCount={totalAssetsCount || assetsGeoJson.features.length}
          visibleCount={assetsGeoJson.features.length}
          onChangeFilters={setFilters}
          onChangeMode={setSidebarMode}
          onClearCoverage={clearDrawnCoverageArea}
          onClearFilters={() => setFilters(initialAssetFilters)}
          onFocusCoverage={focusSelectedAssetCoverage}
          onFinishCoverageDraw={finishCoverageDraw}
          onLoadCoverageSocioeconomicData={loadCoverageSocioeconomicData}
          onLoadIsochrone={loadSelectedAssetIsochrone}
          onLocationSearchSubmit={handleLocationSearch}
          onResetCreateDraft={resetCreateDraft}
          onResetModelCalibration={resetModelCalibration}
          onSaveCoverageEdit={saveCoverageEdit}
          onSelectAsset={selectAssetFromSidebar}
          onStartSelectedCoverageEdit={startSelectedCoverageEdit}
          onStartCoverageDraw={startCoverageDraw}
          onStartCreate={startCreateWorkflow}
          onSubmit={handleSubmit}
          onToggleSelectedCoverage={setSelectedCoverageVisibility}
          setForm={setForm}
          setLocationSearchQuery={setLocationSearchQuery}
          setModelCalibration={setModelCalibration}
        />
      )}

      {tokenMissing && <TokenWarning />}
    </>
  );
}

export default App;
