// @cirrus/cuix/map through its public export paths. The street subpath is left out:
// its types need maplibre-gl, an optional peer this app does not install.
import { createElement as h, type ReactNode } from 'react';
import { LayersPanel, UsMap, albersUsa, groupPoints, type MapPoint } from '@cirrus/cuix/map';
import { US_STATES } from '@cirrus/cuix/map/geo/usStates';
// Type only: a static import would put Florida in the entry chunk.
type Florida = typeof import('@cirrus/cuix/map/geo/US-FL');
const countyCount = (m: Florida) => m.COUNTIES.length;

const noop = () => {};

export function MapPage(): ReactNode {
  const points: MapPoint[] = groupPoints([{ id: '1', name: 'Jacksonville', lat: 30.33, lng: -81.66 }]);
  if (!albersUsa(-81.66, 30.33) || US_STATES.length !== 51 || typeof countyCount !== 'function') throw new Error('map geometry is missing');
  return h(
    'div',
    null,
    h(UsMap, { level: { kind: 'us' }, label: 'States', states: [{ fips: '12', bucket: 'solid', name: 'Florida', label: 'FL 1' }], onSelect: noop, points }),
    h(LayersPanel, { layers: [{ id: 'schools', label: 'Schools', count: 1 }], value: { schools: true }, onChange: noop }),
  );
}
