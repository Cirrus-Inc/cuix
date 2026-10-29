// @cirrus/cuix/map: the US → state → county map, its maths and the Layers panel.
// No import from @cirrus/cuix/react or the theme: it renders in an app with
// neither (colours through CSS custom properties, see style.tsx).
export { UsMap, type UsMapProps, type CountyLoader, type ZoomLabels } from './UsMap.tsx';
export { LayersPanel, type LayersPanelProps } from './LayersPanel.tsx';
export { MapSwatch, MarkerSwatch } from './Marker.tsx';
export { albersUsa } from './albersUsa.ts';
export {
  COUNTY_PAD,
  IDENTITY,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  cameraFor,
  cameraTransform,
  clampZoom,
  intersects,
  pathBBox,
  shapePoints,
  stepZoom,
  visibleRect,
  zoomCamera,
  type BBox,
  type Camera,
} from './mapMath.ts';
export { groupPoints, type GeoItem, type GroupPointsOptions, type PointGroup } from './groupPoints.ts';
export { colorVars, mapColor, type MapColors } from './style.tsx';
export type { MapBucket, MapLayer, MapLevel, MapPoint, MapRegion, MarkerShape } from './types.ts';
export type { CountyShape, StateShape } from './geo/usStates.ts';
