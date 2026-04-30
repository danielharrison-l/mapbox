import type { RefObject } from 'react';

type MapCanvasProps = {
  containerRef: RefObject<HTMLDivElement | null>;
};

export function MapCanvas({ containerRef }: MapCanvasProps) {
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 h-screen w-screen bg-slate-200"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
      }}
    />
  );
}
