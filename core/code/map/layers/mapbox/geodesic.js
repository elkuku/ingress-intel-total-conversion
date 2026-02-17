/* global IITC -- eslint */

/**
 * @file Mapbox GL JS geodesic shapes implementation.
 * Uses IITC.geo calculations to create geodesic paths rendered via GeoJSON.
 * @module map/layers/mapbox/geodesic
 */

IITC.map.layers = IITC.map.layers || {};
IITC.map.layers.mapbox = IITC.map.layers.mapbox || {};

(function () {
  'use strict';

  /**
   * Base class for Mapbox GeoJSON-based layers.
   * Provides common functionality for managing GeoJSON sources and layers.
   *
   * @class MapboxGeoJSONLayer
   * @memberof IITC.map.layers.mapbox
   * @private
   */
  function MapboxGeoJSONLayer() {
    this._map = null;
    this._visible = true;
    this._eventListeners = new Map();
    this.options = {};

    // Generate stable IDs once — reused across remove/addTo cycles
    var baseId = 'iitc-layer-' + Math.random().toString(36).substr(2, 9);
    this._sourceId = baseId + '-source';
    this._layerId = baseId + '-layer';
  }

  /**
   * Add this layer to a map. Idempotent — calling multiple times without
   * remove() in between is a no-op. Uses stable IDs so remove/addTo cycles
   * properly clean up and recreate the same Mapbox sources and layers.
   *
   * @param {Object} map - Map adapter or native map
   * @returns {this}
   */
  MapboxGeoJSONLayer.prototype.addTo = function (map) {
    // Already on a map — don't create duplicate Mapbox layers
    if (this._map) return this;

    // Get the adapter - check multiple ways it might be available
    var adapter = null;

    // If map has _adapter property (wrapped native map from shim)
    if (map._adapter) {
      adapter = map._adapter;
    }
    // If map has _iitcAdapter property
    else if (map._iitcAdapter) {
      adapter = map._iitcAdapter;
    }
    // If map itself is an adapter (has addMapboxLayer method)
    else if (map.addMapboxLayer) {
      adapter = map;
    }
    // Try getting from IITC.map
    else if (IITC.map.getAdapter) {
      adapter = IITC.map.getAdapter();
    }

    if (!adapter || !adapter.addMapboxLayer) {
      console.warn('[Mapbox] Could not find adapter for geodesic layer');
      return this;
    }

    // Check if this is mapbox renderer
    if (adapter.getRendererType && adapter.getRendererType() !== 'mapbox') {
      return this;
    }

    this._map = adapter;
    this._addToMap();
    return this;
  };

  /**
   * Internal method to add source and layer to the map.
   * Override in subclasses.
   * @private
   */
  MapboxGeoJSONLayer.prototype._addToMap = function () {
    // Override in subclasses
  };

  /**
   * Remove this layer from the map.
   * Uses adapter's deferred methods to ensure removal happens after any
   * pending addSource/addMapboxLayer operations have completed.
   * @returns {this}
   */
  MapboxGeoJSONLayer.prototype.remove = function () {
    if (this._map) {
      this._map.removeMapboxLayer(this._layerId);
      this._map.removeSource(this._sourceId);
      this._map = null;
    }
    return this;
  };

  /**
   * Update the GeoJSON source data.
   * @private
   */
  MapboxGeoJSONLayer.prototype._updateSource = function () {
    if (this._map) {
      var source = this._map.getSource(this._sourceId);
      if (source) {
        source.setData(this._toGeoJSON());
      }
    }
  };

  /**
   * Convert to GeoJSON. Override in subclasses.
   * @returns {Object} GeoJSON object
   * @private
   */
  MapboxGeoJSONLayer.prototype._toGeoJSON = function () {
    return { type: 'Feature', geometry: null, properties: {} };
  };

  /**
   * Set style options.
   * @param {Object} style - Style options
   * @returns {this}
   */
  MapboxGeoJSONLayer.prototype.setStyle = function (style) {
    Object.assign(this.options, style);
    this._updateLayerStyle();
    return this;
  };

  /**
   * Update the Mapbox layer style.
   * @private
   */
  MapboxGeoJSONLayer.prototype._updateLayerStyle = function () {
    // Override in subclasses
  };

  /**
   * Bring layer to front.
   * @returns {this}
   */
  MapboxGeoJSONLayer.prototype.bringToFront = function () {
    // Mapbox layers are ordered by add order; moving requires remove/re-add
    return this;
  };

  /**
   * Bring layer to back.
   * @returns {this}
   */
  MapboxGeoJSONLayer.prototype.bringToBack = function () {
    return this;
  };

  /**
   * Add event listener.
   * @param {string} event - Event name
   * @param {Function} callback - Handler
   * @returns {this}
   */
  MapboxGeoJSONLayer.prototype.on = function (event, callback) {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event).add(callback);
    return this;
  };

  /**
   * Remove event listener.
   * @param {string} event - Event name
   * @param {Function} callback - Handler
   * @returns {this}
   */
  MapboxGeoJSONLayer.prototype.off = function (event, callback) {
    if (this._eventListeners.has(event)) {
      if (callback) {
        this._eventListeners.get(event).delete(callback);
      } else {
        this._eventListeners.delete(event);
      }
    }
    return this;
  };

  /**
   * Bind a popup (stub for compatibility).
   * @returns {this}
   */
  MapboxGeoJSONLayer.prototype.bindPopup = function () {
    return this;
  };

  /**
   * Bind a tooltip (stub for compatibility).
   * @returns {this}
   */
  MapboxGeoJSONLayer.prototype.bindTooltip = function () {
    return this;
  };

  // ==================== Geodesic Polyline ====================

  /**
   * Mapbox geodesic polyline implementation.
   * Creates a great circle path between points using IITC.geo calculations.
   *
   * @class MapboxGeodesicPolyline
   * @memberof IITC.map.layers.mapbox
   * @extends MapboxGeoJSONLayer
   * @param {Array} latlngs - Array of LatLng points
   * @param {Object} [options] - Polyline options
   */
  function MapboxGeodesicPolyline(latlngs, options) {
    MapboxGeoJSONLayer.call(this);

    this._latlngs = (latlngs || []).map(IITC.geo.normalizeLatLng);
    this._geodesicPath = [];

    this.options = Object.assign(
      {
        color: '#3388ff',
        weight: 3,
        opacity: 1,
        dashArray: null,
        lineCap: 'round',
        lineJoin: 'round',
      },
      options
    );

    this._calculateGeodesicPath();
  }

  MapboxGeodesicPolyline.prototype = Object.create(MapboxGeoJSONLayer.prototype);
  MapboxGeodesicPolyline.prototype.constructor = MapboxGeodesicPolyline;

  /**
   * Calculate the geodesic path with intermediate points.
   * @private
   */
  MapboxGeodesicPolyline.prototype._calculateGeodesicPath = function () {
    if (this._latlngs.length < 2) {
      this._geodesicPath = this._latlngs.slice();
      return;
    }

    this._geodesicPath = IITC.geo.geodesicPath(this._latlngs, {
      segmentsCoeff: IITC.geo.SEGMENTS_COEFF,
      closed: false,
    });
  };

  /**
   * Add to map.
   * @private
   */
  MapboxGeodesicPolyline.prototype._addToMap = function () {
    var self = this;

    this._map.addSource(this._sourceId, {
      type: 'geojson',
      data: this._toGeoJSON(),
    });

    this._map.addMapboxLayer({
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

    // Set up click handlers
    var nativeMap = this._map.getNativeMap();
    nativeMap.on('click', this._layerId, function (e) {
      self._fireEvent('click', e);
    });
  };

  /**
   * Fire an event to listeners.
   * @private
   */
  MapboxGeodesicPolyline.prototype._fireEvent = function (event, e) {
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

  /**
   * Convert to GeoJSON.
   * @private
   */
  MapboxGeodesicPolyline.prototype._toGeoJSON = function () {
    var coords = this._geodesicPath.map(function (ll) {
      return [ll.lng, ll.lat];
    });

    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
      properties: {},
    };
  };

  /**
   * Update layer style.
   * @private
   */
  MapboxGeodesicPolyline.prototype._updateLayerStyle = function () {
    if (this._map) {
      this._map.setPaintProperty(this._layerId, 'line-color', this.options.color);
      this._map.setPaintProperty(this._layerId, 'line-width', this.options.weight);
      this._map.setPaintProperty(this._layerId, 'line-opacity', this.options.opacity);
    }
  };

  /**
   * Get the LatLngs.
   * @returns {Array}
   */
  MapboxGeodesicPolyline.prototype.getLatLngs = function () {
    return this._latlngs.slice();
  };

  /**
   * Set the LatLngs.
   * @param {Array} latlngs
   * @returns {this}
   */
  MapboxGeodesicPolyline.prototype.setLatLngs = function (latlngs) {
    this._latlngs = (latlngs || []).map(IITC.geo.normalizeLatLng);
    this._calculateGeodesicPath();
    this._updateSource();
    return this;
  };

  /**
   * Get the bounds of the polyline.
   * @returns {Object}
   */
  MapboxGeodesicPolyline.prototype.getBounds = function () {
    if (this._latlngs.length === 0) {
      return null;
    }

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
      getCenter: function () {
        return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
      },
    };
  };

  // ==================== Geodesic Polygon ====================

  /**
   * Mapbox geodesic polygon implementation.
   * Creates a polygon with geodesic edges using IITC.geo calculations.
   *
   * @class MapboxGeodesicPolygon
   * @memberof IITC.map.layers.mapbox
   * @extends MapboxGeoJSONLayer
   * @param {Array} latlngs - Array of LatLng points
   * @param {Object} [options] - Polygon options
   */
  function MapboxGeodesicPolygon(latlngs, options) {
    MapboxGeoJSONLayer.call(this);

    // Derive stable sub-layer IDs from the base _layerId
    this._fillLayerId = this._layerId + '-fill';
    this._strokeLayerId = this._layerId + '-stroke';

    this._latlngs = (latlngs || []).map(IITC.geo.normalizeLatLng);
    this._geodesicPath = [];

    this.options = Object.assign(
      {
        color: '#3388ff',
        weight: 3,
        opacity: 1,
        fillColor: '#3388ff',
        fillOpacity: 0.2,
        dashArray: null,
      },
      options
    );

    this._calculateGeodesicPath();
  }

  MapboxGeodesicPolygon.prototype = Object.create(MapboxGeoJSONLayer.prototype);
  MapboxGeodesicPolygon.prototype.constructor = MapboxGeodesicPolygon;

  /**
   * Calculate the geodesic path with intermediate points.
   * @private
   */
  MapboxGeodesicPolygon.prototype._calculateGeodesicPath = function () {
    if (this._latlngs.length < 3) {
      this._geodesicPath = this._latlngs.slice();
      return;
    }

    this._geodesicPath = IITC.geo.geodesicPath(this._latlngs, {
      segmentsCoeff: IITC.geo.SEGMENTS_COEFF,
      closed: true,
    });
  };

  /**
   * Add to map.
   * @private
   */
  MapboxGeodesicPolygon.prototype._addToMap = function () {
    var self = this;
    var fillLayerId = this._fillLayerId;
    var strokeLayerId = this._strokeLayerId;

    this._map.addSource(this._sourceId, {
      type: 'geojson',
      data: this._toGeoJSON(),
    });

    // Add fill layer
    this._map.addMapboxLayer({
      id: fillLayerId,
      type: 'fill',
      source: this._sourceId,
      paint: {
        'fill-color': this.options.fillColor,
        'fill-opacity': this.options.fillOpacity,
      },
    });

    // Add stroke layer (unless stroke is disabled, e.g. for fields)
    if (this.options.stroke !== false) {
      this._map.addMapboxLayer({
        id: strokeLayerId,
        type: 'line',
        source: this._sourceId,
        paint: {
          'line-color': this.options.color,
          'line-width': this.options.weight,
          'line-opacity': this.options.opacity,
        },
      });
    }

    // Set up click handlers
    var nativeMap = this._map.getNativeMap();
    nativeMap.on('click', fillLayerId, function (e) {
      self._fireEvent('click', e);
    });
  };

  /**
   * Fire an event to listeners.
   * @private
   */
  MapboxGeodesicPolygon.prototype._fireEvent = MapboxGeodesicPolyline.prototype._fireEvent;

  /**
   * Remove from map.
   */
  MapboxGeodesicPolygon.prototype.remove = function () {
    if (this._map) {
      this._map.removeMapboxLayer(this._fillLayerId);
      this._map.removeMapboxLayer(this._strokeLayerId);
      this._map.removeSource(this._sourceId);
      this._map = null;
    }
    return this;
  };

  /**
   * Convert to GeoJSON.
   * @private
   */
  MapboxGeodesicPolygon.prototype._toGeoJSON = function () {
    var coords = this._geodesicPath.map(function (ll) {
      return [ll.lng, ll.lat];
    });

    // Close the polygon
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

  /**
   * Update layer style.
   * @private
   */
  MapboxGeodesicPolygon.prototype._updateLayerStyle = function () {
    if (this._map) {
      this._map.setPaintProperty(this._fillLayerId, 'fill-color', this.options.fillColor);
      this._map.setPaintProperty(this._fillLayerId, 'fill-opacity', this.options.fillOpacity);
      this._map.setPaintProperty(this._strokeLayerId, 'line-color', this.options.color);
      this._map.setPaintProperty(this._strokeLayerId, 'line-width', this.options.weight);
      this._map.setPaintProperty(this._strokeLayerId, 'line-opacity', this.options.opacity);
    }
  };

  /**
   * Get the LatLngs.
   * @returns {Array}
   */
  MapboxGeodesicPolygon.prototype.getLatLngs = function () {
    return this._latlngs.slice();
  };

  /**
   * Set the LatLngs.
   * @param {Array} latlngs
   * @returns {this}
   */
  MapboxGeodesicPolygon.prototype.setLatLngs = function (latlngs) {
    this._latlngs = (latlngs || []).map(IITC.geo.normalizeLatLng);
    this._calculateGeodesicPath();
    this._updateSource();
    return this;
  };

  /**
   * Get the bounds of the polygon.
   * @returns {Object}
   */
  MapboxGeodesicPolygon.prototype.getBounds = MapboxGeodesicPolyline.prototype.getBounds;

  // ==================== Geodesic Circle ====================

  /**
   * Mapbox geodesic circle implementation.
   * Creates a circle using geodesic calculations for accurate radius.
   *
   * @class MapboxGeodesicCircle
   * @memberof IITC.map.layers.mapbox
   * @extends MapboxGeoJSONLayer
   * @param {Object} latlng - Center point
   * @param {number|Object} radius - Radius in meters or options with radius
   * @param {Object} [options] - Circle options
   */
  function MapboxGeodesicCircle(latlng, radius, options) {
    MapboxGeoJSONLayer.call(this);

    // Derive stable sub-layer IDs from the base _layerId
    this._fillLayerId = this._layerId + '-fill';
    this._strokeLayerId = this._layerId + '-stroke';

    this._latlng = IITC.geo.normalizeLatLng(latlng);

    // Handle radius as second argument or in options
    if (typeof radius === 'object') {
      options = radius;
      this._radius = options.radius || 10;
    } else {
      this._radius = radius || 10;
    }

    this._circlePoints = [];

    this.options = Object.assign(
      {
        color: '#3388ff',
        weight: 3,
        opacity: 1,
        fillColor: '#3388ff',
        fillOpacity: 0.2,
      },
      options
    );

    this._calculateCirclePoints();
  }

  MapboxGeodesicCircle.prototype = Object.create(MapboxGeoJSONLayer.prototype);
  MapboxGeodesicCircle.prototype.constructor = MapboxGeodesicCircle;

  /**
   * Calculate circle points using geodesic calculations.
   * @private
   */
  MapboxGeodesicCircle.prototype._calculateCirclePoints = function () {
    this._circlePoints = IITC.geo.geodesicCirclePoints(this._latlng, this._radius, {
      segmentsMin: IITC.geo.SEGMENTS_MIN,
      segmentsCoeff: IITC.geo.CIRCLE_SEGMENTS_COEFF,
    });
  };

  /**
   * Add to map.
   * @private
   */
  MapboxGeodesicCircle.prototype._addToMap = function () {
    var self = this;
    var fillLayerId = this._fillLayerId;
    var strokeLayerId = this._strokeLayerId;

    this._map.addSource(this._sourceId, {
      type: 'geojson',
      data: this._toGeoJSON(),
    });

    // Add fill layer
    this._map.addMapboxLayer({
      id: fillLayerId,
      type: 'fill',
      source: this._sourceId,
      paint: {
        'fill-color': this.options.fillColor,
        'fill-opacity': this.options.fillOpacity,
      },
    });

    // Add stroke layer
    this._map.addMapboxLayer({
      id: strokeLayerId,
      type: 'line',
      source: this._sourceId,
      paint: {
        'line-color': this.options.color,
        'line-width': this.options.weight,
        'line-opacity': this.options.opacity,
      },
    });

    // Set up click handlers
    var nativeMap = this._map.getNativeMap();
    nativeMap.on('click', fillLayerId, function (e) {
      self._fireEvent('click', e);
    });
  };

  /**
   * Fire an event to listeners.
   * @private
   */
  MapboxGeodesicCircle.prototype._fireEvent = MapboxGeodesicPolyline.prototype._fireEvent;

  /**
   * Remove from map.
   */
  MapboxGeodesicCircle.prototype.remove = function () {
    if (this._map) {
      this._map.removeMapboxLayer(this._fillLayerId);
      this._map.removeMapboxLayer(this._strokeLayerId);
      this._map.removeSource(this._sourceId);
      this._map = null;
    }
    return this;
  };

  /**
   * Convert to GeoJSON.
   * @private
   */
  MapboxGeodesicCircle.prototype._toGeoJSON = function () {
    var coords = this._circlePoints.map(function (ll) {
      return [ll.lng, ll.lat];
    });

    // Close the polygon
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

  /**
   * Update layer style.
   * @private
   */
  MapboxGeodesicCircle.prototype._updateLayerStyle = function () {
    if (this._map) {
      this._map.setPaintProperty(this._fillLayerId, 'fill-color', this.options.fillColor);
      this._map.setPaintProperty(this._fillLayerId, 'fill-opacity', this.options.fillOpacity);
      this._map.setPaintProperty(this._strokeLayerId, 'line-color', this.options.color);
      this._map.setPaintProperty(this._strokeLayerId, 'line-width', this.options.weight);
      this._map.setPaintProperty(this._strokeLayerId, 'line-opacity', this.options.opacity);
    }
  };

  /**
   * Get the center LatLng.
   * @returns {Object}
   */
  MapboxGeodesicCircle.prototype.getLatLng = function () {
    return { lat: this._latlng.lat, lng: this._latlng.lng };
  };

  /**
   * Set the center LatLng.
   * @param {Object} latlng
   * @returns {this}
   */
  MapboxGeodesicCircle.prototype.setLatLng = function (latlng) {
    this._latlng = IITC.geo.normalizeLatLng(latlng);
    this._calculateCirclePoints();
    this._updateSource();
    return this;
  };

  /**
   * Get the radius.
   * @returns {number}
   */
  MapboxGeodesicCircle.prototype.getRadius = function () {
    return this._radius;
  };

  /**
   * Set the radius.
   * @param {number} radius
   * @returns {this}
   */
  MapboxGeodesicCircle.prototype.setRadius = function (radius) {
    this._radius = radius;
    this._calculateCirclePoints();
    this._updateSource();
    return this;
  };

  /**
   * Get the bounds of the circle.
   * @returns {Object}
   */
  MapboxGeodesicCircle.prototype.getBounds = function () {
    // Calculate bounding box from circle points
    if (this._circlePoints.length === 0) {
      return null;
    }

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
      getCenter: function () {
        return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
      },
    };
  };

  // Export
  IITC.map.layers.mapbox.GeodesicPolyline = MapboxGeodesicPolyline;
  IITC.map.layers.mapbox.GeodesicPolygon = MapboxGeodesicPolygon;
  IITC.map.layers.mapbox.GeodesicCircle = MapboxGeodesicCircle;

  // Factory functions
  IITC.map.layers.mapbox.createGeodesicPolyline = function (latlngs, options) {
    return new MapboxGeodesicPolyline(latlngs, options);
  };

  IITC.map.layers.mapbox.createGeodesicPolygon = function (latlngs, options) {
    return new MapboxGeodesicPolygon(latlngs, options);
  };

  IITC.map.layers.mapbox.createGeodesicCircle = function (latlng, radius, options) {
    return new MapboxGeodesicCircle(latlng, radius, options);
  };
})();
