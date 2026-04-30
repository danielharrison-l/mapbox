import mapboxgl from 'mapbox-gl';
import { useEffect, useRef } from 'react';

import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';

const BRAZIL_BOUNDS: mapboxgl.LngLatBoundsLike = [
  [-74.0, -34.0],
  [-28.0, 6.0],
];

function App() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const tokenMissing = !accessToken || accessToken === 'your_mapbox_access_token_here';

  useEffect(() => {
    if (tokenMissing) {
      return;
    }

    if (!mapContainerRef.current || mapRef.current) {
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

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [tokenMissing]);

  return (
    <>
      <div id="map-container" ref={mapContainerRef} />
      {tokenMissing && (
        <section className="map-token-warning" aria-live="polite">
          <h1>Mapbox token ausente</h1>
          <p>Configure VITE_MAPBOX_ACCESS_TOKEN no ambiente do frontend.</p>
        </section>
      )}
    </>
  );
}

export default App;
