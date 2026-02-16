# IITC Map Renderer Migration Guide

This guide helps plugin authors migrate from direct Leaflet (`L.*`) calls to the renderer-agnostic `IITC.map` API. The new API allows plugins to work with both Leaflet and Mapbox GL JS renderers without code changes.

## Architecture Overview

```
IITC.map (Facade)
    ├── IITC.map.factory      → Layer creation (renderer-specific)
    ├── IITC.map.getAdapter()  → Map adapter (view, events, layers)
    └── IITC.geo              → Geodesic calculations (shared math)

window.map                    → Backward-compatible proxy (still works)
```

**Key principle**: Use `IITC.map.*` for new code. `window.map` and `L.*` still work with Leaflet but won't work with Mapbox.

---

## Quick Reference

### Detecting the Renderer

```javascript
var renderer = IITC.map.getRendererType(); // 'leaflet' or 'mapbox'

if (renderer === 'mapbox') {
  // Mapbox-specific code (rarely needed)
}
```

### Map Operations

| Old (Leaflet-specific) | New (Renderer-agnostic) |
|------------------------|------------------------|
| `map.getCenter()` | `IITC.map.getCenter()` |
| `map.getZoom()` | `IITC.map.getZoom()` |
| `map.getBounds()` | `IITC.map.getBounds()` |
| `map.setView(latlng, zoom)` | `IITC.map.setView(latlng, zoom)` |
| `latlng1.distanceTo(latlng2)` | `IITC.map.distance(latlng1, latlng2)` |

> **Note**: `window.map` still works — it proxies to the active renderer. But `IITC.map.*` is preferred for clarity and future-proofing.

---

## Creating Layers

The layer factory (`IITC.map.factory`) creates renderer-appropriate layers. Access it via `IITC.map.factory` or `IITC.map.getFactory()`.

### Geodesic Shapes

```javascript
// OLD
var line = L.geodesicPolyline(latlngs, { color: '#FF0000' });
var poly = L.geodesicPolygon(latlngs, { color: '#00FF00' });
var circle = L.geodesicCircle(center, radius, { color: '#0000FF' });

// NEW
var line = IITC.map.factory.createGeodesicPolyline(latlngs, { color: '#FF0000' });
var poly = IITC.map.factory.createGeodesicPolygon(latlngs, { color: '#00FF00' });
var circle = IITC.map.factory.createGeodesicCircle(center, radius, { color: '#0000FF' });
```

### Basic Shapes

```javascript
// OLD
var marker = L.circleMarker(latlng, options);
var line = L.polyline(latlngs, options);
var poly = L.polygon(latlngs, options);

// NEW
var marker = IITC.map.factory.createCircleMarker(latlng, options);
var line = IITC.map.factory.createPolyline(latlngs, options);
var poly = IITC.map.factory.createPolygon(latlngs, options);
```

### Layer Groups

```javascript
// OLD
var group = L.layerGroup();
var fGroup = L.featureGroup();

// NEW
var group = IITC.map.factory.createLayerGroup();
var fGroup = IITC.map.factory.createFeatureGroup();
```

### Portal Markers

```javascript
// OLD
var marker = L.marker(latlng);  // not a portal marker

// NEW — portal markers specifically
var marker = IITC.map.factory.createPortalMarker(latlng, portalData);
// Or use the shortcut:
var marker = IITC.map.createPortalMarker(latlng, portalData);
```

---

## Geodesic Calculations (`IITC.geo`)

The `IITC.geo` namespace provides renderer-agnostic geodesic math using the S2 Earth radius (6,367,000m) that Ingress uses.

### Distance

```javascript
// OLD
var dist = latlng1.distanceTo(latlng2);

// NEW
var dist = IITC.geo.distance(latlng1, latlng2);
// Also available as: IITC.map.distance(latlng1, latlng2)
```

### Bearing & Destination

```javascript
var bearing = IITC.geo.bearing(pointA, pointB);          // degrees 0-360
var dest = IITC.geo.destination(start, bearing, distance); // {lat, lng}
var mid = IITC.geo.midpoint(pointA, pointB);              // {lat, lng}
```

### Geodesic Paths

```javascript
// Get intermediate points along a great circle
var points = IITC.geo.geodesicIntermediatePoints(start, end);

// Full geodesic path (for rendering)
var path = IITC.geo.geodesicPath(latlngs, { closed: false });

// Circle points
var circlePoints = IITC.geo.geodesicCirclePoints(center, radiusMeters);
```

### Polygon Utilities

```javascript
var inside = IITC.geo.pointInPolygon(point, polygonVertices);
var area = IITC.geo.polygonArea(polygonVertices);  // square meters
```

### GeoJSON Conversion

```javascript
var latlng = IITC.geo.geoJSONToLatLng([lng, lat]);  // {lat, lng}
var coords = IITC.geo.latLngToGeoJSON(latlng);       // [lng, lat]
```

---

## Full Factory API

All methods available on `IITC.map.factory`:

| Method | Description |
|--------|-------------|
| `createPortalMarker(latlng, data)` | Portal marker with level-based styling |
| `createMarker(latlng, options)` | Generic map marker |
| `createCircleMarker(latlng, options)` | Circle marker |
| `createPolyline(latlngs, options)` | Polyline |
| `createPolygon(latlngs, options)` | Polygon |
| `createCircle(latlng, options)` | Circle (options must include radius) |
| `createRectangle(bounds, options)` | Rectangle |
| `createGeodesicPolyline(latlngs, options)` | Geodesic polyline (great circle) |
| `createGeodesicPolygon(latlngs, options)` | Geodesic polygon |
| `createGeodesicCircle(latlng, radius, options)` | Geodesic circle |
| `createLayerGroup(layers, options)` | Layer group |
| `createFeatureGroup(layers, options)` | Feature group with events |
| `createGeoJSON(geojson, options)` | GeoJSON layer |
| `createTileLayer(url, options)` | Tile layer |
| `createPopup(options, source)` | Popup |
| `createTooltip(options, source)` | Tooltip |
| `createLatLng(lat, lng)` | LatLng coordinate |
| `createLatLngBounds(corner1, corner2)` | Bounds object |
| `createPoint(x, y)` | Screen point |
| `createDivIcon(options)` | HTML-based icon |
| `createIcon(options)` | Image-based icon |

---

## Controls (Buttons & UI Widgets)

Controls are UI elements positioned in map corners — zoom buttons, scale bars, custom toolbars, etc. The `IITC.map` facade and `window.map` both support adding and removing controls across renderers.

### Adding a Control

```javascript
// Via IITC.map facade (preferred)
IITC.map.addControl(control);
IITC.map.removeControl(control);

// Via window.map (backward-compatible, works with both renderers)
window.map.addControl(control);
window.map.removeControl(control);
```

### Using Leaflet Controls (L.Control)

Leaflet-style controls work with both renderers. When using Mapbox, the compatibility shim automatically positions the control's DOM element in the correct Mapbox corner container.

```javascript
// Create a custom Leaflet control
var MyControl = L.Control.extend({
  options: { position: 'topleft' },

  onAdd: function (map) {
    var container = L.DomUtil.create('div', 'my-plugin-control');
    var button = L.DomUtil.create('button', '', container);
    button.textContent = 'My Action';
    button.addEventListener('click', function () {
      // handle click
    });
    L.DomEvent.disableClickPropagation(container);
    return container;
  },

  onRemove: function (map) {
    // cleanup if needed
  }
});

// Add it — works with both Leaflet and Mapbox renderers
window.map.addControl(new MyControl());
```

### Control Positions

Four corner positions are available (same names for both renderers):

| Position | Location |
|----------|----------|
| `'topleft'` | Top-left corner |
| `'topright'` | Top-right corner (default) |
| `'bottomleft'` | Bottom-left corner |
| `'bottomright'` | Bottom-right corner |

```javascript
// Specify position via control options
var control = new MyControl({ position: 'bottomright' });
window.map.addControl(control);

// Or override position when adding
window.map.addControl(control, 'bottomleft');
```

### How It Works Across Renderers

- **Leaflet**: Controls use Leaflet's native `map.addControl()` which places them in `map._controlCorners`.
- **Mapbox**: The compatibility shim creates `_controlCorners` mapped to Mapbox's built-in `.mapboxgl-ctrl-*` containers. When a Leaflet `L.Control` is added, its `onAdd()` is called and the returned DOM element is appended to the appropriate corner. Native Mapbox `IControl` objects are passed through to the Mapbox API directly.

### What to Avoid

- Don't access `map._controlCorners` directly for positioning — use `addControl` with a position instead.
- Don't assume control containers have Leaflet-specific CSS classes when running on Mapbox.

---

## Common Plugin Patterns

### Draw-Tools Style (overlay shapes)

```javascript
// Plugin that draws custom shapes on the map
var setup = function () {
  var overlayGroup = IITC.map.factory.createFeatureGroup();
  window.map.addLayer(overlayGroup);

  window.addHook('mapDataRefreshEnd', function () {
    overlayGroup.clearLayers();

    myData.forEach(function (item) {
      var line = IITC.map.factory.createGeodesicPolyline(
        [item.start, item.end],
        { color: '#FF0000', weight: 2 }
      );
      overlayGroup.addLayer(line);
    });
  });
};
```

### Region / Coverage Style (polygons)

```javascript
// Plugin that highlights regions
var setup = function () {
  var regionLayer = IITC.map.factory.createLayerGroup();
  window.map.addLayer(regionLayer);

  function drawRegions(regions) {
    regionLayer.clearLayers();
    regions.forEach(function (region) {
      var poly = IITC.map.factory.createGeodesicPolygon(
        region.vertices,
        { color: region.color, fillOpacity: 0.2, weight: 1 }
      );
      regionLayer.addLayer(poly);
    });
  }
};
```

### Portal Marker Overlay Style

```javascript
// Plugin that adds extra markers near portals
var setup = function () {
  var markers = IITC.map.factory.createLayerGroup();
  window.map.addLayer(markers);

  window.addHook('portalAdded', function (data) {
    var latlng = data.portal.getLatLng();
    var radius = 40; // hack range in meters

    var circle = IITC.map.factory.createGeodesicCircle(
      latlng, radius,
      { color: '#FFA500', fill: true, fillOpacity: 0.1 }
    );
    markers.addLayer(circle);
  });
};
```

### Distance Calculations

```javascript
// Calculate distance between two portals
var p1 = window.portals[guid1].getLatLng();
var p2 = window.portals[guid2].getLatLng();
var dist = IITC.geo.distance(p1, p2);

// Check if portal is within link range
var maxRange = LINK_RANGE_MAC[portalLevel];
if (IITC.geo.distance(portalA, portalB) <= maxRange) {
  // Can link
}
```

---

## Backward Compatibility

- **`window.map`** continues to work — it's a proxy to the active renderer
- **`L.*` constructors** continue to work with the Leaflet renderer
- **Direct `L.*` calls** will emit deprecation warnings in debug mode when the deprecation module is loaded
- **Events on `window.map`** (`map.on('moveend', ...)`) continue to work

### What Won't Work with Mapbox

If you want your plugin to support both renderers, avoid:
- `instanceof L.SomeClass` checks (use duck typing instead)
- Direct access to Leaflet internals (`layer._latlngs`, `map._layers`)
- Leaflet-specific options that have no Mapbox equivalent
- Creating Leaflet layers with `new L.Polyline()` directly (use the factory)

### Checking Renderer Support

```javascript
if (IITC.map.getRendererType() === 'leaflet') {
  // Safe to use Leaflet-specific features
  var nativeMap = IITC.map.getNativeMap(); // L.map instance
}
```

---

## Migration Checklist

1. Replace `L.geodesicPolyline()` → `IITC.map.factory.createGeodesicPolyline()`
2. Replace `L.geodesicPolygon()` → `IITC.map.factory.createGeodesicPolygon()`
3. Replace `L.geodesicCircle()` → `IITC.map.factory.createGeodesicCircle()`
4. Replace `L.circleMarker()` → `IITC.map.factory.createCircleMarker()`
5. Replace `L.polyline()` → `IITC.map.factory.createPolyline()`
6. Replace `L.polygon()` → `IITC.map.factory.createPolygon()`
7. Replace `L.layerGroup()` → `IITC.map.factory.createLayerGroup()`
8. Replace `L.featureGroup()` → `IITC.map.factory.createFeatureGroup()`
9. Replace `latlng.distanceTo()` → `IITC.geo.distance()`
10. Controls: Use `window.map.addControl()` or `IITC.map.addControl()` — both work across renderers
11. Test with both renderers if possible
