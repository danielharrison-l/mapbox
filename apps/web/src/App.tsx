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
  fetchMeteorologyAssets,
  fetchMunicipalities,
  reverseGeocodeLocation,
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
  getPolygonBounds,
  METEOROLOGY_ASSETS_LAYER_ID,
  readAssetFeature,
  upsertAssetLayer,
  upsertSelectedAssetLayer,
  upsertSelectedCoverageLayer,
  upsertSelectedPointLayer,
} from './lib/mapbox';
import {
  measureMapFrameRate,
  PARA_ASSETS_3D_MODEL_LAYER_ID,
  removeParaAsset3dModels,
  removeSelectedAsset3dModel,
  upsertParaAsset3dModels,
  upsertSelectedAsset3dModel,
} from './lib/mapbox-3d';
import type {
  AssetFilters,
  AssetFormState,
  CoverageSocioeconomicData,
  CreateMeteorologyAssetRequest,
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
    return `Nao foi possivel conectar ao backend em ${API_BASE_URL}. Verifique se a API esta rodando.`;
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
  const clearDrawnCoverageAreaRef = useRef<() => void>(() => undefined);
  const coverageSocioeconomicAbortControllerRef = useRef<AbortController | null>(null);
  const coverageSocioeconomicSelectionRefreshRef = useRef<number | null>(null);
  const selectedCoverageVisibleRef = useRef(true);
  const finalizeCoverageAreaRef = useRef<(nextCoverageArea: PolygonGeometry) => void>(
    () => undefined,
  );
  const resolveSelectedPointLocationRef = useRef<(coordinates: [number, number]) => void>(
    () => undefined,
  );
  const assetsByInfrastructurePointIdRef = useRef(new Map<number, MeteorologyAssetPointFeature>());
  const hasFocusedParaModelsRef = useRef(false);
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
  const [isSelectedCoverageVisible, setIsSelectedCoverageVisible] = useState(true);
  const [sidebarMode, setSidebarMode] = useState<OperationalSidebarMode>('assets');
  const [isDrawingCoverage, setIsDrawingCoverage] = useState(false);
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
    setDrawnCoverageArea(null);

    if (mapRef.current) {
      upsertSelectedCoverageLayer(mapRef.current, null);
    }
  }, []);

  const startCoverageDraw = useCallback(() => {
    if (!selectedPoint) {
      setFormStatus('Selecione o ponto do ativo antes de desenhar a area.');
      return;
    }

    const draw = drawRef.current;

    if (!draw) {
      setFormStatus('O desenho de area ainda nao esta disponivel no mapa.');
      return;
    }

    clearDrawnCoverageArea();
    draw.changeMode('draw_polygon');
    isDrawingCoverageRef.current = true;
    setIsDrawingCoverage(true);
    setSidebarMode('coverage');
    setFormStatus('Marque a area. Clique no primeiro ponto ou em Concluir area para finalizar.');
  }, [clearDrawnCoverageArea, selectedPoint]);

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
      setFormStatus('Area desenhada. Preencha os dados e salve o ativo.');

      if (mapRef.current && selectedPoint) {
        upsertSelectedCoverageLayer(mapRef.current, {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: selectedPoint,
          },
          properties: {
            id: 0,
            infrastructurePointId: 0,
            name: form.name.trim() || 'Area desenhada',
            description: form.description.trim() || null,
            municipalityId: Number(form.municipalityId || 0),
            municipalityName: null,
            municipalityState: null,
            status: form.status,
            coverageArea: nextCoverageArea,
          },
        });
      }
    },
    [form.description, form.municipalityId, form.name, form.status, selectedPoint],
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

      setFormStatus('Marque pelo menos tres pontos para concluir a area.');
    }, 0);
  }, [finalizeCoverageArea]);

  const resetCreateDraft = useCallback(() => {
    clearDrawnCoverageArea();
    setSelectedPoint(null);
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
    setSidebarMode('create');
    setFormStatus(
      selectedPoint
        ? 'Ponto selecionado. Desenhe a area de cobertura.'
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
        setFormStatus('Ponto selecionado. Selecione o municipio e desenhe a area de cobertura.');
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
              'Ponto selecionado. Selecione o municipio e desenhe a area de cobertura.',
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
              `Ponto selecionado em ${municipality.state ? `${municipality.state} - ` : ''}${municipality.name}. Desenhe a area de cobertura.`,
            );
            return;
          }

          setFormStatus(
            `Mapbox identificou ${formatGeocodedLocation(location)}. Selecione o municipio manualmente.`,
          );
        })
        .catch((error: unknown) => {
          if (abortController.signal.aborted) {
            return;
          }

          geocodeAbortControllerRef.current = null;
          console.error('Failed to reverse geocode selected point', error);
          setFormStatus('Ponto selecionado. Nao foi possivel identificar o local automaticamente.');
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
      setCoverageSocioeconomicData(null);
      setCoverageSocioeconomicStatus('idle');
      setCoverageSocioeconomicError(null);
      return;
    }

    if (coverageSocioeconomicSelectionRefreshRef.current === selectedAssetInfrastructurePointId) {
      coverageSocioeconomicSelectionRefreshRef.current = null;
      return;
    }

    coverageSocioeconomicAbortControllerRef.current?.abort();
    setCoverageSocioeconomicData(null);
    setCoverageSocioeconomicStatus('idle');
    setCoverageSocioeconomicError(null);
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

        setFormStatus('Falha ao carregar municipios da API.');
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
    });

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
      setFormStatus('Area removida. Desenhe a cobertura antes de salvar.');
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
      if (assetFeature.properties.municipalityState === 'PA') {
        setSelectedAsset(assetFeature);
        setSidebarMode('model');
        clearDrawnCoverageAreaRef.current();
        setSelectedPoint(null);
        upsertSelectedPointLayer(map, null);
        upsertSelectedCoverageLayer(map, selectedCoverageVisibleRef.current ? assetFeature : null);
        upsertSelectedAssetLayer(map, assetFeature);
        return;
      }

      setSelectedAsset(assetFeature);
      setSidebarMode('details');
      clearDrawnCoverageAreaRef.current();
      upsertSelectedCoverageLayer(map, selectedCoverageVisibleRef.current ? assetFeature : null);
      upsertSelectedAssetLayer(map, assetFeature);
      setSelectedPoint(null);
      upsertSelectedPointLayer(map, null);
      setFormStatus('Entregavel selecionado. Clique em uma area vazia para cadastrar outro ponto.');
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
      const isCreateWorkflow =
        sidebarModeRef.current === 'create' || sidebarModeRef.current === 'coverage';

      if (isCreateWorkflow) {
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

      if (isDrawingCoverageRef.current || draw.getMode() === 'draw_polygon') {
        return;
      }

      const isCreateMode =
        sidebarModeRef.current === 'create' || sidebarModeRef.current === 'coverage';

      if (!isCreateMode) {
        const modelFeatures = map.getLayer(PARA_ASSETS_3D_MODEL_LAYER_ID)
          ? queryRenderedFeaturesAroundPoint(event.point, MODEL_CLICK_HITBOX_PX, [
              PARA_ASSETS_3D_MODEL_LAYER_ID,
            ])
          : [];
        const nearestParaAsset = findNearestAssetAtPoint(
          event.point,
          MODEL_CLICK_HITBOX_PX,
          (assetFeature) => assetFeature.properties.municipalityState === 'PA',
        );

        if (nearestParaAsset) {
          selectRenderedAsset(nearestParaAsset);
          return;
        }

        if (modelFeatures.length > 0) {
          setSidebarMode('model');
          setSelectedAsset(null);
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
      }

      const coordinates: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      setSelectedAsset(null);
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
    const map = mapRef.current;

    if (!isMapLoaded || !map) {
      return;
    }

    const paraAssets = upsertParaAsset3dModels(map, assetsGeoJson, {
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
          console.info('Para 3D model performance', {
            modelUrl: selectedAssetModelUrl,
            assetsCount: paraAssets.length,
            ...measurement,
          });
        });
      },
      onError: (error) => {
        console.error('Failed to render Para 3D models', error);
      },
    });

    if (paraAssets.length > 0 && !hasFocusedParaModelsRef.current) {
      const firstParaAsset = paraAssets[0];
      hasFocusedParaModelsRef.current = true;

      map.easeTo({
        center: firstParaAsset.geometry.coordinates,
        zoom: 15.27,
        pitch: 42,
        bearing: -50,
        duration: 900,
      });
    }

    return () => {
      if (mapRef.current) {
        removeParaAsset3dModels(mapRef.current);
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
        setFormStatus(`Falha ao carregar entregaveis da API: ${errorMessage}`);
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
              'O ativo selecionado nao existe mais na base atual. Selecione o ativo novamente.',
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
      setFormStatus('Selecione um municipio.');
      return;
    }

    if (!drawnCoverageArea) {
      setFormStatus('Desenhe a area de cobertura antes de salvar.');
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
    setFormStatus('Salvando ativo meteorologico...');

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
      setFormStatus(`Falha ao salvar ativo meteorologico: ${errorMessage}`);
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
    setSidebarMode(assetFeature.properties.municipalityState === 'PA' ? 'model' : 'details');
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
          isSelectedCoverageVisible={isSelectedCoverageVisible}
          isSubmitting={isSubmitting}
          mode={sidebarMode}
          modelCalibration={modelCalibration}
          modelPerformance={modelPerformance}
          municipalities={municipalities}
          selectedAsset={selectedAsset}
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
          onResetCreateDraft={resetCreateDraft}
          onResetModelCalibration={resetModelCalibration}
          onSelectAsset={selectAssetFromSidebar}
          onStartCoverageDraw={startCoverageDraw}
          onStartCreate={startCreateWorkflow}
          onSubmit={handleSubmit}
          onToggleSelectedCoverage={setSelectedCoverageVisibility}
          setForm={setForm}
          setModelCalibration={setModelCalibration}
        />
      )}

      {tokenMissing && <TokenWarning />}
    </>
  );
}

export default App;
