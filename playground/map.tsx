import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { UsMap, albersUsa, type MapPoint, type MapRegion } from '../src/map/index.ts';
import { Button, Checkbox, NativeSelect } from '../src/react/index.ts';
import './app.css';

// UsMap at the state level, for Playwright: the zoom controls and the county outline.
// Its own page: counties and points are under 44px by design (the 2.5.5 equivalent
// exception, see docs/map.md), so the main page's every-target-44px audit does not apply.

const COUNTIES: MapRegion[] = [
  { fips: '12031', bucket: 'solid', name: 'Duval: 4 schools', label: '4' },
  { fips: '12095', bucket: 'tint', name: 'Orange: 1 school', label: '1' },
  { fips: '12086', bucket: 'tint', name: 'Miami-Dade: 2 schools', label: '2' },
  { fips: '12033', bucket: 'none', name: 'Escambia: no schools' },
  { fips: '12073', bucket: 'none', name: 'Leon: no schools' },
  { fips: '12001', bucket: 'solid', name: 'Alachua: 40 students', label: '40', shade: '#fcd34d', detail: 'Alachua: 40 Deaf and hard of hearing students' },
  { fips: '12057', bucket: 'solid', name: 'Hillsborough: 3 schools', label: '3' },
];

const at = (id: string, name: string, lng: number, lat: number): MapPoint[] => {
  const p = albersUsa(lng, lat);
  return p ? [{ id, name, x: p[0], y: p[1] }] : [];
};
// ?controlled=1: the app owns the zoom and drives it from its own toolbar.
const controlled = new URLSearchParams(location.search).get('controlled') === '1';

// ?highlight=<fips> draws the strong outline too, for the spec that checks both together.
const highlighted = new URLSearchParams(location.search).get('highlight');

const POINTS = [...at('jax', 'Jacksonville interpreter', -81.66, 30.33), ...at('pns', 'Pensacola interpreter', -87.22, 30.42)];

function MapPage() {
  const [bold, setBold] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [picked, setPicked] = useState('');
  const [selected, setSelected] = useState('');
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 bg-background p-4 font-sans text-body text-foreground">
      <h1 className="text-title">Map</h1>
      <Checkbox label="Bold county outline" checked={bold} onChange={(e) => setBold(e.target.checked)} data-testid="bold" />
      <div className="flex items-center gap-2">
        <span aria-hidden>Selected county</span>
        <NativeSelect aria-label="Selected county" value={selected} onChange={(e) => setSelected(e.target.value)} data-testid="selected">
          <option value="">None</option>
          <option value="12031">Duval</option>
          <option value="12095">Orange</option>
          <option value="99999">Unknown FIPS</option>
        </NativeSelect>
      </div>
      {controlled && (
        <Button variant="secondary" className="self-start" onClick={() => setZoom(4)}>
          Toolbar zoom 4×
        </Button>
      )}
      <p data-testid="zoom">Zoom {zoom}</p>
      <p data-testid="picked">{picked}</p>
      <UsMap
        level={{ kind: 'state', iso: 'US-FL' }}
        label="Schools in Florida"
        states={[]}
        counties={COUNTIES}
        onSelect={(_, id) => setPicked(id)}
        points={POINTS}
        onSelectPoint={setPicked}
        zoom={controlled ? zoom : undefined}
        onZoomChange={setZoom}
        zoomControls={!controlled}
        selected={selected || null}
        highlight={highlighted}
        countyOutline={bold ? 'bold' : 'hairline'}
      />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MapPage />
  </StrictMode>,
);
