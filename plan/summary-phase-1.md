Summary

I have successfully implemented Phase 1 of the Common Map Renderer Interface for IITC-CE. Here's what was created:

New Files Created

Directory: core/code/map/

1. interfaces.js - Defines the IMapRenderer, ILayerFactory, and ILayer interfaces that all renderer adapters must implement. Also defines standard event names and constants.
2. geo/geodesic-calc.js - Renderer-agnostic geodesic calculations (distance, bearing, intermediate points, circle points) using the S2 Earth radius (6,367,000m).
3. adapters/leaflet.js - LeafletAdapter class implementing IMapRenderer, wrapping L.map to provide the common interface.
4. layers/leaflet/portal-marker.js - Re-exports L.PortalMarker for the abstraction layer (actual implementation remains in portal_marker.js).
5. layers/leaflet/geodesic.js - Wrappers for L.GeodesicPolyline, L.GeodesicPolygon, and L.GeodesicCircle.
6. layers/leaflet/factory.js - LeafletLayerFactory implementing ILayerFactory for creating all Leaflet layer types.
7. compat/window-map-shim.js - Compatibility layer that creates a wrapper allowing window.map to work with both the new facade and native Leaflet methods.
8. index.js - Main IITC.map facade that ties everything together, manages initialization, and provides convenience methods.

Modified Files

1. core/code/map.js - Updated setupMap() to use IITC.map.initialize() and set window.map via the compatibility wrapper.
2. build_plugin.py - Updated bundle_code() to recursively process the map/ subdirectory in the correct dependency order.

Architecture

IITC.map (Facade)                                                                                                                                                                                                                         
│                                                                                                                                                                                                                                     
├── IITC.map.IMapRenderer (interface)                                                                                                                                                                                                 
│       └── IITC.map.adapters.LeafletAdapter                                                                                                                                                                                          
│                                                                                                                                                                                                                                     
├── IITC.map.ILayerFactory (interface)                                                                                                                                                                                                
│       └── IITC.map.layers.leaflet.factory                                                                                                                                                                                           
│                                                                                                                                                                                                                                     
├── IITC.geo (geodesic calculations)                                                                                                                                                                                                  
│                                                                                                                                                                                                                                     
└── IITC.map.compat (window.map compatibility)

Backward Compatibility

- window.map continues to work as expected for all existing plugins
- All existing Leaflet methods and properties remain accessible
- L.PortalMarker, L.geodesicPolyline, etc. work unchanged
- No breaking changes to the existing codebase

Configuration

To switch renderers (when implemented), set before calling `setupMap()`:             
```js
window.mapRendererConfig = {                                                                                                                                                                                                              
  renderer: 'mapbox',                                                                                                                                                                                                                     
  mapboxToken: 'pk.xxx...'                                                                                                                                                                                                                
};
```

Next Steps (Phase 2+)

1. ~~Implement MapboxAdapter in adapters/mapbox.js~~ (Completed)
2. ~~Implement Mapbox layer factory in layers/mapbox/~~ (Completed)
3. Add renderer selection UI
4. Create plugin migration guide

---

## Phase 2: Mapbox Layer Factory Implementation

### New Files Created

Directory: `core/code/map/layers/mapbox/`

1. **utils.js** - Utility classes (LatLng, LatLngBounds, Point, Bounds) providing Leaflet-compatible interfaces for Mapbox
2. **geodesic.js** - Geodesic polyline, polygon, and circle using IITC.geo calculations for accurate great circle rendering
3. **shapes.js** - Basic shapes (Polyline, Polygon, Circle, CircleMarker, Rectangle) using GeoJSON sources
4. **marker.js** - Generic marker implementation wrapping mapboxgl.Marker, plus DivIcon and Icon classes
5. **layer-group.js** - LayerGroup, FeatureGroup, and GeoJSON layer implementations
6. **tile-layer.js** - Raster tile layer converting Leaflet URL templates to Mapbox raster sources
7. **popup.js** - Popup and Tooltip implementations wrapping mapboxgl.Popup
8. **factory.js** - MapboxLayerFactory implementing ILayerFactory interface

### Modified Files

1. **build_plugin.py** - Updated bundle_code() to include Mapbox layer files in correct dependency order

### Architecture

```
IITC.map.layers.mapbox
├── LayerFactory         (implements ILayerFactory)
├── PortalMarker        (batch-rendered via GeoJSON)
├── Marker              (wraps mapboxgl.Marker)
├── CircleMarker        (circle layer, pixel radius)
├── Polyline            (line layer)
├── Polygon             (fill + line layers)
├── Circle              (geodesic polygon, meter radius)
├── Rectangle           (fill + line layers)
├── GeodesicPolyline    (IITC.geo great circle path)
├── GeodesicPolygon     (IITC.geo geodesic edges)
├── GeodesicCircle      (IITC.geo circle points)
├── LayerGroup          (collective layer management)
├── FeatureGroup        (LayerGroup with events)
├── GeoJSON             (GeoJSON source rendering)
├── TileLayer           (raster tile sources)
├── Popup               (wraps mapboxgl.Popup)
├── Tooltip             (Popup with tooltip styling)
├── LatLng              (Leaflet-compatible)
├── LatLngBounds        (Leaflet-compatible)
├── Point               (Leaflet-compatible)
├── Bounds              (Leaflet-compatible)
├── DivIcon             (custom HTML markers)
└── Icon                (image-based markers)
```

### Key Implementation Details

1. **GeoJSON-based rendering**: All shapes use Mapbox GeoJSON sources for efficient batch rendering
2. **Geodesic accuracy**: Uses IITC.geo calculations with S2 Earth radius (6,367,000m) for Ingress-accurate distances
3. **Leaflet API compatibility**: All layer classes provide addTo(), remove(), setStyle(), on(), off(), getBounds() methods
4. **Style updates**: Paint properties updated via adapter's setPaintProperty() method
5. **Event handling**: Click/contextmenu events normalized to Leaflet-like format   
