import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { UsMap, albersUsa, albersUsaInvert, type MapPoint, type MapRegion } from '../src/map/index.ts';
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

// ?modifier=1: the wheel zooms only with ctrl or cmd.
const modifier = new URLSearchParams(location.search).get('modifier') === '1';

const POINTS = [...at('jax', 'Jacksonville interpreter', -81.66, 30.33), ...at('pns', 'Pensacola interpreter', -87.22, 30.42)];

const RADIUS_MILES = 30;
const EARTH_MILES = 3958.8;

const circle = (lng: number, lat: number) => {
  const d = RADIUS_MILES / EARTH_MILES;
  const [lng1, lat1] = [lng * (Math.PI / 180), lat * (Math.PI / 180)];
  const ring: string[] = [];
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * 2 * Math.PI;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(t));
    const lng2 = lng1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    const p = albersUsa(lng2 * (180 / Math.PI), lat2 * (180 / Math.PI));
    if (p) ring.push(`${String(p[0])},${String(p[1])}`);
  }
  return ring.join(' ');
};

function MapPage() {
  const [dropPin, setDropPin] = useState(false);
  const [pin, setPin] = useState<{ x: number; y: number; lng: number; lat: number } | null>(null);
  const [bold, setBold] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [picked, setPicked] = useState('');
  const [selected, setSelected] = useState('');
  const [selects, setSelects] = useState(0);
  const [bounds, setBounds] = useState('none');
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 bg-background p-4 font-sans text-body text-foreground">
      <h1 className="text-title">Map</h1>
      {/* One row each for the toggles and the readouts: the e2e drags and wheels at the map's centre, which must stay in the viewport. */}
      <div className="flex items-center gap-4">
        <Checkbox label="Bold county outline" checked={bold} onChange={(e) => setBold(e.target.checked)} data-testid="bold" />
        <Checkbox label="Drop pin" checked={dropPin} onChange={(e) => setDropPin(e.target.checked)} data-testid="drop-pin" />
      </div>
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
      <p data-testid="selects">Selects {selects}</p>
      <div className="flex gap-4">
        <p data-testid="bounds">{bounds}</p>
        <p data-testid="pin">{pin ? `${String(pin.x)},${String(pin.y)}` : 'none'}</p>
      </div>
      <UsMap
        level={{ kind: 'state', iso: 'US-FL' }}
        label="Schools in Florida"
        states={[]}
        counties={COUNTIES}
        onSelect={(_, id) => {
          setPicked(id);
          setSelects((n) => n + 1);
        }}
        points={pin ? [...POINTS, { id: 'pin', name: 'Dropped pin', x: pin.x, y: pin.y, shape: 'cross' }] : POINTS}
        onMapClick={
          dropPin
            ? (p) => {
                const ll = albersUsaInvert(p.x, p.y);
                setPin(ll ? { ...p, lng: ll[0], lat: ll[1] } : null);
              }
            : undefined
        }
        overlay={
          pin && (
            <polygon
              points={circle(pin.lng, pin.lat)}
              fill="var(--cuix-focus-ring)"
              fillOpacity={0.15}
              stroke="var(--cuix-focus-ring)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )
        }
        onSelectPoint={setPicked}
        zoom={controlled ? zoom : undefined}
        onZoomChange={setZoom}
        zoomControls={!controlled}
        selected={selected || null}
        highlight={highlighted}
        wheelZoom={modifier ? 'modifier' : 'plain'}
        onSelectedBounds={(r) => setBounds(r ? `${String(Math.round(r.x))},${String(Math.round(r.y))},${String(Math.round(r.width))},${String(Math.round(r.height))}` : 'none')}
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
