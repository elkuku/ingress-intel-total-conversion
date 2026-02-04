/* global IITC -- eslint */

/**
 * @file Mapbox GL JS basic shape implementations.
 * Provides Polyline, Polygon, Circle, CircleMarker, and Rectangle.
 * @module map/layers/mapbox/shapes
 */

IITC.map.layers = IITC.map.layers || {};
IITC.map.layers.mapbox = IITC.map.layers.mapbox || {};

(function () {
  'use strict';

  /**
   * Generate a unique ID.
   * @private
   */
  function generateId() {
    return 'iitc-shape-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Normalize a LatLng-like value.
   * @private
   */
  function normalizeLatLng(latlng) {
    if (Array.isArray(latlng)) {
      return { lat: latlng[0], lng: latlng[1] };
    }
    return { lat: latlng.lat, lng: latlng.lng };
  }

  // ==================== Polyline ====================

  /**
   * Mapbox polyline implementation.
   * Creates a simple polyline (non-geodesic).
   *
   * @class MapboxPolyline
   * @memberof IITC.map.layers.mapbox
   * @param {Array} latlngs - Array of LatLng points
   * @param {Object} [options] - Polyline options
   */
  function MapboxPolyline(latlngs, options) {
    this._latlngs = (latlngs || []).map(normalizeLatLng);
    this._map = null;
    this._sourceId = null;
    this._layerId = null;
    this._eventListeners = new Map();

    this.options = Object.assign(
      {
        color: '#3388ff',
        weight: 3,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: null,
        interactive: true,
      },
      options
    );
  }

  MapboxPolyline.prototype.addTo = function (map) {
    var adapter = map.getRendererType ? map : map._adapter;
    if (!adapter || adapter.getRendererType() !== 'mapbox') {
      return this;
    }

    this._map = adapter;
    this._sourceId = generateId() + '-source';
    this._layerId = generateId() + '-layer';

    var self = this;

    adapter.addSource(this._sourceId, {
      type: 'geojson',
      data: this._toGeoJSON(),
    });

    adapter.addMapboxLayer({
      id: this._layerId,
      type: 'line',
      source: this._sourceId,
      paint: {
        'line-color': this.options.color,
        'line-width': this.options.weight,
        'line-opacity': this.options.opacity,
      },
      layout: {
        'line-cap': this.options.lineCap,
        'line-join': this.options.lineJoin,
      },
    });

    if (this.options.interactive) {
      var nativeMap = adapter.getNativeMap();
      nativeMap.on('click', this._layerId, function (e) {
        self._fireEvent('click', e);
      });
    }

    return this;
  };

  MapboxPolyline.prototype.remove = function () {
    if (this._map) {
      this._map.removeMapboxLayer(this._layerId);
      this._map.removeSource(this._sourceId);
      this._map = null;
    }
    return this;
  };

  MapboxPolyline.prototype._toGeoJSON = function () {
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: this._latlngs.map(function (ll) {
          return [ll.lng, ll.lat];
        }),
      },
      properties: {},
    };
  };

  MapboxPolyline.prototype._updateSource = function () {
    if (this._map) {
      var source = this._map.getSource(this._sourceId);
      if (source) {
        source.setData(this._toGeoJSON());
      }
    }
  };

  MapboxPolyline.prototype._fireEvent = function (event, e) {
    if (this._eventListeners.has(event)) {
      var normalized = {
        type: event,
        target: this,
        latlng: e.lngLat ? { lat: e.lngLat.lat, lng: e.lngLat.lng } : null,
        originalEvent: e.originalEvent,
      };
      this._eventListeners.get(event).forEach(function (cb) {
        cb(normalized);
      });
    }
  };

  MapboxPolyline.prototype.getLatLngs = function () {
    return this._latlngs.slice();
  };

  MapboxPolyline.prototype.setLatLngs = function (latlngs) {
    this._latlngs = (latlngs || []).map(normalizeLatLng);
    this._updateSource();
    return this;
  };

  MapboxPolyline.prototype.setStyle = function (style) {
    Object.assign(this.options, style);
    if (this._map) {
      if (style.color !== undefined) {
        this._map.setPaintProperty(this._layerId, 'line-color', this.options.color);
      }
      if (style.weight !== undefined) {
        this._map.setPaintProperty(this._layerId, 'line-width', this.options.weight);
      }
      if (style.opacity !== undefined) {
        this._map.setPaintProperty(this._layerId, 'line-opacity', this.options.opacity);
      }
    }
    return this;
  };

  MapboxPolyline.prototype.getBounds = function () {
    if (this._latlngs.length === 0) return null;

    var minLat = Infinity,
      maxLat = -Infinity;
    var minLng = Infinity,
      maxLng = -Infinity;

    this._latlngs.forEach(function (ll) {
      if (ll.lat < minLat) minLat = ll.lat;
      if (ll.lat > maxLat) maxLat = ll.lat;
      if (ll.lng < minLng) minLng = ll.lng;
      if (ll.lng > maxLng) maxLng = ll.lng;
    });

    return {
      getSouthWest: function () {
        return { lat: minLat, lng: minLng };
      },
      getNorthEast: function () {
        return { lat: maxLat, lng: maxLng };
      },
    };
  };

  MapboxPolyline.prototype.on = function (event, callback) {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event).add(callback);
    return this;
  };

  MapboxPolyline.prototype.off = function (event, callback) {
    if (this._eventListeners.has(event)) {
      if (callback) {
        this._eventListeners.get(event).delete(callback);
      } else {
        this._eventListeners.delete(event);
      }
    }
    return this;
  };

  MapboxPolyline.prototype.bringToFront = function () {
    return this;
  };
  MapboxPolyline.prototype.bringToBack = function () {
    return this;
  };
  MapboxPolyline.prototype.bindPopup = function () {
    return this;
  };
  MapboxPolyline.prototype.bindTooltip = function () {
    return this;
  };

  // ==================== Polygon ====================

  /**
   * Mapbox polygon implementation.
   *
   * @class MapboxPolygon
   * @memberof IITC.map.layers.mapbox
   * @param {Array} latlngs - Array of LatLng points
   * @param {Object} [options] - Polygon options
   */
  function MapboxPolygon(latlngs, options) {
    this._latlngs = (latlngs || []).map(normalizeLatLng);
    this._map = null;
    this._sourceId = null;
    this._fillLayerId = null;
    this._strokeLayerId = null;
    this._eventListeners = new Map();

    this.options = Object.assign(
      {
        color: '#3388ff',
        weight: 3,
        opacity: 1,
        fillColor: '#3388ff',
        fillOpacity: 0.2,
        interactive: true,
      },
      options
    );
  }

  MapboxPolygon.prototype.addTo = function (map) {
    var adapter = map.getRendererType ? map : map._adapter;
    if (!adapter || adapter.getRendererType() !== 'mapbox') {
      return this;
    }

    this._map = adapter;
    this._sourceId = generateId() + '-source';
    this._fillLayerId = generateId() + '-fill';
    this._strokeLayerId = generateId() + '-stroke';

    var self = this;

    adapter.addSource(this._sourceId, {
      type: 'geojson',
      data: this._toGeoJSON(),
    });

    adapter.addMapboxLayer({
      id: this._fillLayerId,
      type: 'fill',
      source: this._sourceId,
      paint: {
        'fill-color': this.options.fillColor,
        'fill-opacity': this.options.fillOpacity,
      },
    });

    adapter.addMapboxLayer({
      id: this._strokeLayerId,
      type: 'line',
      source: this._sourceId,
      paint: {
        'line-color': this.options.color,
        'line-width': this.options.weight,
        'line-opacity': this.options.opacity,
      },
    });

    if (this.options.interactive) {
      var nativeMap = adapter.getNativeMap();
      nativeMap.on('click', this._fillLayerId, function (e) {
        self._fireEvent('click', e);
      });
    }

    return this;
  };

  MapboxPolygon.prototype.remove = function () {
    if (this._map) {
      this._map.removeMapboxLayer(this._fillLayerId);
      this._map.removeMapboxLayer(this._strokeLayerId);
      this._map.removeSource(this._sourceId);
      this._map = null;
    }
    return this;
  };

  MapboxPolygon.prototype._toGeoJSON = function () {
    var coords = this._latlngs.map(function (ll) {
      return [ll.lng, ll.lat];
    });
    if (coords.length > 0) {
      coords.push(coords[0]);
    }
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
      properties: {},
    };
  };

  MapboxPolygon.prototype._updateSource = function () {
    if (this._map) {
      var source = this._map.getSource(this._sourceId);
      if (source) {
        source.setData(this._toGeoJSON());
      }
    }
  };

  MapboxPolygon.prototype._fireEvent = MapboxPolyline.prototype._fireEvent;
  MapboxPolygon.prototype.getLatLngs = MapboxPolyline.prototype.getLatLngs;

  MapboxPolygon.prototype.setLatLngs = function (latlngs) {
    this._latlngs = (latlngs || []).map(normalizeLatLng);
    this._updateSource();
    return this;
  };

  MapboxPolygon.prototype.setStyle = function (style) {
    Object.assign(this.options, style);
    if (this._map) {
      if (style.color !== undefined) {
        this._map.setPaintProperty(this._strokeLayerId, 'line-color', this.options.color);
      }
      if (style.weight !== undefined) {
        this._map.setPaintProperty(this._strokeLayerId, 'line-width', this.options.weight);
      }
      if (style.opacity !== undefined) {
        this._map.setPaintProperty(this._strokeLayerId, 'line-opacity', this.options.opacity);
      }
      if (style.fillColor !== undefined) {
        this._map.setPaintProperty(this._fillLayerId, 'fill-color', this.options.fillColor);
      }
      if (style.fillOpacity !== undefined) {
        this._map.setPaintProperty(this._fillLayerId, 'fill-opacity', this.options.fillOpacity);
      }
    }
    return this;
  };

  MapboxPolygon.prototype.getBounds = MapboxPolyline.prototype.getBounds;
  MapboxPolygon.prototype.on = MapboxPolyline.prototype.on;
  MapboxPolygon.prototype.off = MapboxPolyline.prototype.off;
  MapboxPolygon.prototype.bringToFront = MapboxPolyline.prototype.bringToFront;
  MapboxPolygon.prototype.bringToBack = MapboxPolyline.prototype.bringToBack;
  MapboxPolygon.prototype.bindPopup = MapboxPolyline.prototype.bindPopup;
  MapboxPolygon.prototype.bindTooltip = MapboxPolyline.prototype.bindTooltip;

  // ==================== Circle ====================

  /**
   * Mapbox circle implementation.
   * Creates a circle with radius in meters using geodesic calculations.
   *
   * @class MapboxCircle
   * @memberof IITC.map.layers.mapbox
   * @param {Object} latlng - Center point
   * @param {Object} [options] - Circle options (must include radius)
   */
  function MapboxCircle(latlng, options) {
    this._latlng = normalizeLatLng(latlng);
    this._radius = (options && options.radius) || 10;
    this._map = null;
    this._sourceId = null;
    this._fillLayerId = null;
    this._strokeLayerId = null;
    this._circlePoints = [];
    this._eventListeners = new Map();

    this.options = Object.assign(
      {
        color: '#3388ff',
        weight: 3,
        opacity: 1,
        fillColor: '#3388ff',
        fillOpacity: 0.2,
        interactive: true,
      },
      options
    );

    this._calculateCirclePoints();
  }

  MapboxCircle.prototype._calculateCirclePoints = function () {
    this._circlePoints = IITC.geo.geodesicCirclePoints(this._latlng, this._radius, {
      segmentsMin: IITC.geo.SEGMENTS_MIN,
      segmentsCoeff: IITC.geo.CIRCLE_SEGMENTS_COEFF,
    });
  };

  MapboxCircle.prototype.addTo = function (map) {
    var adapter = map.getRendererType ? map : map._adapter;
    if (!adapter || adapter.getRendererType() !== 'mapbox') {
      return this;
    }

    this._map = adapter;
    this._sourceId = generateId() + '-source';
    this._fillLayerId = generateId() + '-fill';
    this._strokeLayerId = generateId() + '-stroke';

    var self = this;

    adapter.addSource(this._sourceId, {
      type: 'geojson',
      data: this._toGeoJSON(),
    });

    adapter.addMapboxLayer({
      id: this._fillLayerId,
      type: 'fill',
      source: this._sourceId,
      paint: {
        'fill-color': this.options.fillColor,
        'fill-opacity': this.options.fillOpacity,
      },
    });

    adapter.addMapboxLayer({
      id: this._strokeLayerId,
      type: 'line',
      source: this._sourceId,
      paint: {
        'line-color': this.options.color,
        'line-width': this.options.weight,
        'line-opacity': this.options.opacity,
      },
    });

    if (this.options.interactive) {
      var nativeMap = adapter.getNativeMap();
      nativeMap.on('click', this._fillLayerId, function (e) {
        self._fireEvent('click', e);
      });
    }

    return this;
  };

  MapboxCircle.prototype.remove = function () {
    if (this._map) {
      this._map.removeMapboxLayer(this._fillLayerId);
      this._map.removeMapboxLayer(this._strokeLayerId);
      this._map.removeSource(this._sourceId);
      this._map = null;
    }
    return this;
  };

  MapboxCircle.prototype._toGeoJSON = function () {
    var coords = this._circlePoints.map(function (ll) {
      return [ll.lng, ll.lat];
    });
    if (coords.length > 0) {
      coords.push(coords[0]);
    }
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
      properties: {},
    };
  };

  MapboxCircle.prototype._updateSource = function () {
    if (this._map) {
      var source = this._map.getSource(this._sourceId);
      if (source) {
        source.setData(this._toGeoJSON());
      }
    }
  };

  MapboxCircle.prototype._fireEvent = MapboxPolyline.prototype._fireEvent;

  MapboxCircle.prototype.getLatLng = function () {
    return { lat: this._latlng.lat, lng: this._latlng.lng };
  };

  MapboxCircle.prototype.setLatLng = function (latlng) {
    this._latlng = normalizeLatLng(latlng);
    this._calculateCirclePoints();
    this._updateSource();
    return this;
  };

  MapboxCircle.prototype.getRadius = function () {
    return this._radius;
  };

  MapboxCircle.prototype.setRadius = function (radius) {
    this._radius = radius;
    this._calculateCirclePoints();
    this._updateSource();
    return this;
  };

  MapboxCircle.prototype.setStyle = MapboxPolygon.prototype.setStyle;
  MapboxCircle.prototype.on = MapboxPolyline.prototype.on;
  MapboxCircle.prototype.off = MapboxPolyline.prototype.off;
  MapboxCircle.prototype.bringToFront = MapboxPolyline.prototype.bringToFront;
  MapboxCircle.prototype.bringToBack = MapboxPolyline.prototype.bringToBack;
  MapboxCircle.prototype.bindPopup = MapboxPolyline.prototype.bindPopup;
  MapboxCircle.prototype.bindTooltip = MapboxPolyline.prototype.bindTooltip;

  MapboxCircle.prototype.getBounds = function () {
    if (this._circlePoints.length === 0) return null;

    var minLat = Infinity,
      maxLat = -Infinity;
    var minLng = Infinity,
      maxLng = -Infinity;

    this._circlePoints.forEach(function (ll) {
      if (ll.lat < minLat) minLat = ll.lat;
      if (ll.lat > maxLat) maxLat = ll.lat;
      if (ll.lng < minLng) minLng = ll.lng;
      if (ll.lng > maxLng) maxLng = ll.lng;
    });

    return {
      getSouthWest: function () {
        return { lat: minLat, lng: minLng };
      },
      getNorthEast: function () {
        return { lat: maxLat, lng: maxLng };
      },
    };
  };

  // ==================== Circle Marker ====================

  /**
   * Mapbox circle marker implementation.
   * Creates a circle with radius in pixels (constant screen size).
   *
   * @class MapboxCircleMarker
   * @memberof IITC.map.layers.mapbox
   * @param {Object} latlng - Center point
   * @param {Object} [options] - Circle marker options
   */
  function MapboxCircleMarker(latlng, options) {
    this._latlng = normalizeLatLng(latlng);
    this._map = null;
    this._sourceId = null;
    this._layerId = null;
    this._eventListeners = new Map();

    this.options = Object.assign(
      {
        radius: 10,
        color: '#3388ff',
        weight: 3,
        opacity: 1,
        fillColor: '#3388ff',
        fillOpacity: 0.2,
        interactive: true,
      },
      options
    );
  }

  MapboxCircleMarker.prototype.addTo = function (map) {
    var adapter = map.getRendererType ? map : map._adapter;
    if (!adapter || adapter.getRendererType() !== 'mapbox') {
      return this;
    }

    this._map = adapter;
    this._sourceId = generateId() + '-source';
    this._layerId = generateId() + '-layer';

    var self = this;

    adapter.addSource(this._sourceId, {
      type: 'geojson',
      data: this._toGeoJSON(),
    });

    adapter.addMapboxLayer({
      id: this._layerId,
      type: 'circle',
      source: this._sourceId,
      paint: {
        'circle-radius': this.options.radius,
        'circle-color': this.options.fillColor,
        'circle-opacity': this.options.fillOpacity,
        'circle-stroke-width': this.options.weight,
        'circle-stroke-color': this.options.color,
        'circle-stroke-opacity': this.options.opacity,
      },
    });

    if (this.options.interactive) {
      var nativeMap = adapter.getNativeMap();
      nativeMap.on('click', this._layerId, function (e) {
        self._fireEvent('click', e);
      });
    }

    return this;
  };

  MapboxCircleMarker.prototype.remove = function () {
    if (this._map) {
      this._map.removeMapboxLayer(this._layerId);
      this._map.removeSource(this._sourceId);
      this._map = null;
    }
    return this;
  };

  MapboxCircleMarker.prototype._toGeoJSON = function () {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [this._latlng.lng, this._latlng.lat],
      },
      properties: {},
    };
  };

  MapboxCircleMarker.prototype._updateSource = function () {
    if (this._map) {
      var source = this._map.getSource(this._sourceId);
      if (source) {
        source.setData(this._toGeoJSON());
      }
    }
  };

  MapboxCircleMarker.prototype._fireEvent = MapboxPolyline.prototype._fireEvent;

  MapboxCircleMarker.prototype.getLatLng = function () {
    return { lat: this._latlng.lat, lng: this._latlng.lng };
  };

  MapboxCircleMarker.prototype.setLatLng = function (latlng) {
    this._latlng = normalizeLatLng(latlng);
    this._updateSource();
    return this;
  };

  MapboxCircleMarker.prototype.getRadius = function () {
    return this.options.radius;
  };

  MapboxCircleMarker.prototype.setRadius = function (radius) {
    this.options.radius = radius;
    if (this._map) {
      this._map.setPaintProperty(this._layerId, 'circle-radius', radius);
    }
    return this;
  };

  MapboxCircleMarker.prototype.setStyle = function (style) {
    Object.assign(this.options, style);
    if (this._map) {
      if (style.radius !== undefined) {
        this._map.setPaintProperty(this._layerId, 'circle-radius', this.options.radius);
      }
      if (style.color !== undefined) {
        this._map.setPaintProperty(this._layerId, 'circle-stroke-color', this.options.color);
      }
      if (style.weight !== undefined) {
        this._map.setPaintProperty(this._layerId, 'circle-stroke-width', this.options.weight);
      }
      if (style.opacity !== undefined) {
        this._map.setPaintProperty(this._layerId, 'circle-stroke-opacity', this.options.opacity);
      }
      if (style.fillColor !== undefined) {
        this._map.setPaintProperty(this._layerId, 'circle-color', this.options.fillColor);
      }
      if (style.fillOpacity !== undefined) {
        this._map.setPaintProperty(this._layerId, 'circle-opacity', this.options.fillOpacity);
      }
    }
    return this;
  };

  MapboxCircleMarker.prototype.on = MapboxPolyline.prototype.on;
  MapboxCircleMarker.prototype.off = MapboxPolyline.prototype.off;
  MapboxCircleMarker.prototype.bringToFront = MapboxPolyline.prototype.bringToFront;
  MapboxCircleMarker.prototype.bringToBack = MapboxPolyline.prototype.bringToBack;
  MapboxCircleMarker.prototype.bindPopup = MapboxPolyline.prototype.bindPopup;
  MapboxCircleMarker.prototype.bindTooltip = MapboxPolyline.prototype.bindTooltip;

  // ==================== Rectangle ====================

  /**
   * Mapbox rectangle implementation.
   *
   * @class MapboxRectangle
   * @memberof IITC.map.layers.mapbox
   * @param {Array} bounds - [[south, west], [north, east]]
   * @param {Object} [options] - Rectangle options
   */
  function MapboxRectangle(bounds, options) {
    this._bounds = this._normalizeBounds(bounds);
    this._map = null;
    this._sourceId = null;
    this._fillLayerId = null;
    this._strokeLayerId = null;
    this._eventListeners = new Map();

    this.options = Object.assign(
      {
        color: '#3388ff',
        weight: 3,
        opacity: 1,
        fillColor: '#3388ff',
        fillOpacity: 0.2,
        interactive: true,
      },
      options
    );
  }

  MapboxRectangle.prototype._normalizeBounds = function (bounds) {
    if (Array.isArray(bounds)) {
      return {
        south: bounds[0][0],
        west: bounds[0][1],
        north: bounds[1][0],
        east: bounds[1][1],
      };
    }
    if (bounds.getSouthWest) {
      var sw = bounds.getSouthWest();
      var ne = bounds.getNorthEast();
      return {
        south: sw.lat,
        west: sw.lng,
        north: ne.lat,
        east: ne.lng,
      };
    }
    return bounds;
  };

  MapboxRectangle.prototype.addTo = function (map) {
    var adapter = map.getRendererType ? map : map._adapter;
    if (!adapter || adapter.getRendererType() !== 'mapbox') {
      return this;
    }

    this._map = adapter;
    this._sourceId = generateId() + '-source';
    this._fillLayerId = generateId() + '-fill';
    this._strokeLayerId = generateId() + '-stroke';

    var self = this;

    adapter.addSource(this._sourceId, {
      type: 'geojson',
      data: this._toGeoJSON(),
    });

    adapter.addMapboxLayer({
      id: this._fillLayerId,
      type: 'fill',
      source: this._sourceId,
      paint: {
        'fill-color': this.options.fillColor,
        'fill-opacity': this.options.fillOpacity,
      },
    });

    adapter.addMapboxLayer({
      id: this._strokeLayerId,
      type: 'line',
      source: this._sourceId,
      paint: {
        'line-color': this.options.color,
        'line-width': this.options.weight,
        'line-opacity': this.options.opacity,
      },
    });

    if (this.options.interactive) {
      var nativeMap = adapter.getNativeMap();
      nativeMap.on('click', this._fillLayerId, function (e) {
        self._fireEvent('click', e);
      });
    }

    return this;
  };

  MapboxRectangle.prototype.remove = function () {
    if (this._map) {
      this._map.removeMapboxLayer(this._fillLayerId);
      this._map.removeMapboxLayer(this._strokeLayerId);
      this._map.removeSource(this._sourceId);
      this._map = null;
    }
    return this;
  };

  MapboxRectangle.prototype._toGeoJSON = function () {
    var b = this._bounds;
    var coords = [
      [b.west, b.south],
      [b.east, b.south],
      [b.east, b.north],
      [b.west, b.north],
      [b.west, b.south],
    ];
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
      properties: {},
    };
  };

  MapboxRectangle.prototype._updateSource = function () {
    if (this._map) {
      var source = this._map.getSource(this._sourceId);
      if (source) {
        source.setData(this._toGeoJSON());
      }
    }
  };

  MapboxRectangle.prototype._fireEvent = MapboxPolyline.prototype._fireEvent;

  MapboxRectangle.prototype.getBounds = function () {
    var b = this._bounds;
    return {
      getSouthWest: function () {
        return { lat: b.south, lng: b.west };
      },
      getNorthEast: function () {
        return { lat: b.north, lng: b.east };
      },
    };
  };

  MapboxRectangle.prototype.setBounds = function (bounds) {
    this._bounds = this._normalizeBounds(bounds);
    this._updateSource();
    return this;
  };

  MapboxRectangle.prototype.setStyle = MapboxPolygon.prototype.setStyle;
  MapboxRectangle.prototype.on = MapboxPolyline.prototype.on;
  MapboxRectangle.prototype.off = MapboxPolyline.prototype.off;
  MapboxRectangle.prototype.bringToFront = MapboxPolyline.prototype.bringToFront;
  MapboxRectangle.prototype.bringToBack = MapboxPolyline.prototype.bringToBack;
  MapboxRectangle.prototype.bindPopup = MapboxPolyline.prototype.bindPopup;
  MapboxRectangle.prototype.bindTooltip = MapboxPolyline.prototype.bindTooltip;

  // Export
  IITC.map.layers.mapbox.Polyline = MapboxPolyline;
  IITC.map.layers.mapbox.Polygon = MapboxPolygon;
  IITC.map.layers.mapbox.Circle = MapboxCircle;
  IITC.map.layers.mapbox.CircleMarker = MapboxCircleMarker;
  IITC.map.layers.mapbox.Rectangle = MapboxRectangle;
})();
