import mapboxgl from 'mapbox-gl';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AssetCreatePanel } from './components/AssetCreatePanel';
import { AssetDetailsPanel } from './components/AssetDetailsPanel';
import { MapActions } from './components/MapActions';
import { MapCanvas } from './components/MapCanvas';
import { TokenWarning } from './components/TokenWarning';
import { createMeteorologyAsset, fetchMeteorologyAssets, fetchMunicipalities } from './lib/api';
import { createCoverageArea, getErrorMessage } from './lib/geo';
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
import type {
  AssetFormState,
  CreateMeteorologyAssetRequest,
  MeteorologyAssetPointFeature,
  Municipality,
} from './types/geo';

import 'mapbox-gl/dist/mapbox-gl.css';

const initialFormState: AssetFormState = {
  name: '',
  description: '',
  municipalityId: '',
  status: 'NOT_STARTED',
};

function App() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const assetClickRef = useRef(false);
  const assetsByInfrastructurePointIdRef = useRef(new Map<number, MeteorologyAssetPointFeature>());
  const [formStatus, setFormStatus] = useState('Clique no mapa para escolher o ponto.');
  const [form, setForm] = useState<AssetFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<MeteorologyAssetPointFeature | null>(null);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const tokenMissing = !accessToken || accessToken === 'your_mapbox_access_token_here';

  const reloadAssets = useCallback(async (signal: AbortSignal) => {
    if (!mapRef.current) {
      return;
    }

    const geoJson = await fetchMeteorologyAssets(signal);
    assetsByInfrastructurePointIdRef.current = new Map(
      geoJson.features.map((feature) => [feature.properties.infrastructurePointId, feature]),
    );
    upsertAssetLayer(mapRef.current, geoJson);
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    void fetchMunicipalities(abortController.signal)
      .then((data) => {
        setMunicipalities(data);
        setForm((currentForm) => ({
          ...currentForm,
          municipalityId: currentForm.municipalityId || String(data[0]?.id ?? ''),
        }));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setFormStatus('Falha ao carregar municipios da API.');
      });

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    if (tokenMissing || !mapContainerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-53.2, -10.3],
      zoom: 3.5,
      minZoom: 3,
      maxBounds: BRAZIL_BOUNDS,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    map.fitBounds(BRAZIL_BOUNDS, { padding: 24, duration: 0 });
    mapRef.current = map;

    const abortController = new AbortController();

    map.on('load', () => {
      upsertSelectedPointLayer(map, null);
      upsertSelectedCoverageLayer(map, null);
      upsertSelectedAssetLayer(map, null);
      void reloadAssets(abortController.signal).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        const errorMessage = getErrorMessage(error);
        console.error('Failed to load meteorology assets from API', error);
        setFormStatus(`Falha ao carregar entregaveis da API: ${errorMessage}`);
      });
    });

    map.on('click', METEOROLOGY_ASSETS_LAYER_ID, (event) => {
      assetClickRef.current = true;
      event.preventDefault();

      const clickedFeature = event.features?.[0];
      const renderedAssetFeature = clickedFeature ? readAssetFeature(clickedFeature) : null;
      const assetFeature = renderedAssetFeature
        ? (assetsByInfrastructurePointIdRef.current.get(
            renderedAssetFeature.properties.infrastructurePointId,
          ) ?? renderedAssetFeature)
        : null;

      if (!assetFeature) {
        return;
      }

      setSelectedAsset(assetFeature);
      setIsDetailsExpanded(true);
      setIsFormExpanded(false);
      upsertSelectedCoverageLayer(map, assetFeature);
      upsertSelectedAssetLayer(map, assetFeature);
      setSelectedPoint(null);
      upsertSelectedPointLayer(map, null);
      setFormStatus('Entregavel selecionado. Clique em uma area vazia para cadastrar outro ponto.');
      map.easeTo({
        center: assetFeature.geometry.coordinates,
        duration: 500,
      });
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

      const hitbox = 8;
      const features = map.queryRenderedFeatures(
        [
          [event.point.x - hitbox, event.point.y - hitbox],
          [event.point.x + hitbox, event.point.y + hitbox],
        ],
        {
          layers: [METEOROLOGY_ASSETS_LAYER_ID],
        },
      );

      if (features.length > 0) {
        return;
      }

      const coordinates: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      setSelectedAsset(null);
      setIsDetailsExpanded(false);
      setIsFormExpanded(true);
      upsertSelectedCoverageLayer(map, null);
      upsertSelectedAssetLayer(map, null);
      setSelectedPoint(coordinates);
      upsertSelectedPointLayer(map, coordinates);
      setFormStatus('Ponto selecionado. Preencha os dados e salve o ativo.');
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
      abortController.abort();
      map.remove();
      mapRef.current = null;
    };
  }, [tokenMissing, reloadAssets]);

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

    const payload: CreateMeteorologyAssetRequest = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      municipalityId: Number(form.municipalityId),
      geometry: {
        type: 'Point',
        coordinates: selectedPoint,
      },
      coverageArea: createCoverageArea(selectedPoint),
      status: form.status,
    };

    setIsSubmitting(true);
    setFormStatus('Salvando ativo meteorologico...');

    try {
      await createMeteorologyAsset(payload);
      setForm((currentForm) => ({
        ...initialFormState,
        municipalityId: currentForm.municipalityId,
      }));
      setSelectedPoint(null);
      setFormStatus('Ativo salvo. A camada foi atualizada.');

      if (mapRef.current) {
        upsertSelectedPointLayer(mapRef.current, null);
        upsertSelectedCoverageLayer(mapRef.current, null);
        const abortController = new AbortController();
        await reloadAssets(abortController.signal);
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

  return (
    <>
      <MapCanvas containerRef={mapContainerRef} />

      {!tokenMissing && (
        <MapActions
          isFormExpanded={isFormExpanded}
          selectedAsset={selectedAsset}
          isDetailsExpanded={isDetailsExpanded}
          onOpenForm={() => {
            setIsFormExpanded(true);
            setIsDetailsExpanded(false);
          }}
          onToggleForm={() => {
            setIsFormExpanded((currentValue) => !currentValue);
            setIsDetailsExpanded(false);
          }}
          onOpenDetails={() => setIsDetailsExpanded(true)}
        />
      )}

      {!tokenMissing && selectedAsset && isDetailsExpanded && (
        <AssetDetailsPanel
          asset={selectedAsset}
          onClose={() => setIsDetailsExpanded(false)}
          onFocusCoverage={focusSelectedAssetCoverage}
        />
      )}

      {!tokenMissing && isFormExpanded && (
        <AssetCreatePanel
          form={form}
          formStatus={formStatus}
          isSubmitting={isSubmitting}
          municipalities={municipalities}
          selectedPoint={selectedPoint}
          onClose={() => setIsFormExpanded(false)}
          onSubmit={handleSubmit}
          setForm={setForm}
        />
      )}

      {tokenMissing && <TokenWarning />}
    </>
  );
}

export default App;
