/* global IITC, log -- eslint */

/**
 * @file Mapbox GL JS adapter implementing the IMapRenderer interface.
 * Wraps mapboxgl.Map to provide the common IITC map interface.
 * @module map/adapters/mapbox
 */

// Ensure mapboxgl reference works even if not in global scope
var mapboxgl = window.mapboxgl;

console.log('[IITC Debug] Mapbox adapter file starting execution');
console.log('[IITC Debug] IITC.map.adapters exists:', !!IITC.map.adapters);
console.log('[IITC Debug] mapboxgl defined:', typeof mapboxgl !== 'undefined');
console.log('[IITC Debug] window.mapboxgl:', typeof window.mapboxgl);

IITC.map.adapters = IITC.map.adapters || {};

(function () {
  'use strict';

  /**
   * Event name mapping from IITC/Leaflet style to Mapbox GL JS.
   * @private
   */
  var EVENT_MAP = {
    // View events - same names
    movestart: 'movestart',
    move: 'move',
    moveend: 'moveend',
    zoomstart: 'zoomstart',
    zoom: 'zoom',
    zoomend: 'zoomend',
    resize: 'resize',

    // Interaction events - same names
    click: 'click',
    dblclick: 'dblclick',
    contextmenu: 'contextmenu',
    mousedown: 'mousedown',
    mouseup: 'mouseup',
    mouseover: 'mouseover',
    mouseout: 'mouseout',
    mousemove: 'mousemove',

    // Touch events
    touchstart: 'touchstart',
    touchend: 'touchend',
    touchcancel: 'touchcancel',

    // Mapbox-specific that we map to Leaflet equivalents
    load: 'load',
    idle: 'idle',
    render: 'render',
    error: 'error',
  };

  /**
   * Mapbox GL JS adapter implementing IITC.map.IMapRenderer.
   * Wraps a mapboxgl.Map instance to provide the common interface.
   *
   * @class MapboxAdapter
   * @memberof IITC.map.adapters
   * @implements {IITC.map.IMapRenderer}
   */
  function MapboxAdapter() {
    /**
     * The native Mapbox GL JS map instance.
     * @type {mapboxgl.Map|null}
     * @private
     */
    this._map = null;

    /**
     * The map container element.
     * @type {HTMLElement|null}
     * @private
     */
    this._container = null;

    /**
     * Custom layers managed by IITC (portals, links, fields).
     * Maps layer ID to layer wrapper object.
     * @type {Map<string, Object>}
     * @private
     */
    this._layers = new Map();

    /**
     * Event listeners registered through the adapter.
     * @type {Map<string, Set<Function>>}
     * @private
     */
    this._eventListeners = new Map();

    /**
     * Counter for generating unique layer IDs.
     * @type {number}
     * @private
     */
    this._layerIdCounter = 0;

    /**
     * Whether the map style has loaded.
     * @type {boolean}
     * @private
     */
    this._styleLoaded = false;

    /**
     * Pending operations to execute after style loads.
     * @type {Array<Function>}
     * @private
     */
    this._pendingOperations = [];
  }

  // ==================== Lifecycle ====================

  /**
   * Initialize the Mapbox GL JS map.
   *
   * @param {string|HTMLElement} container - Container element ID or element
   * @param {Object} options - Map options
   * @returns {mapboxgl.Map} The native Mapbox map
   */
  MapboxAdapter.prototype.initialize = function (container, options) {
    options = options || {};

    // Handle container
    if (typeof container === 'string') {
      this._container = document.getElementById(container);
    } else {
      this._container = container;
    }

    // Set access token
    if (options.accessToken) {
      mapboxgl.accessToken = options.accessToken;
    }

    // Convert Leaflet-style options to Mapbox options
    var mapboxOptions = this._convertOptions(container, options);

    // Create the Mapbox map
    this._map = new mapboxgl.Map(mapboxOptions);

    // Set up style load handler
    var self = this;
    this._map.on('style.load', function () {
      self._styleLoaded = true;
      self._processPendingOperations();
    });

    // Also handle 'load' event for full map load
    this._map.on('load', function () {
      self._styleLoaded = true;
      self._processPendingOperations();
    });

    // Snap to integer zoom levels after zooming to match Leaflet behavior
    this._snappingZoom = false;
    this._map.on('zoomend', function () {
      if (self._snappingZoom) return;
      var currentZoom = self._map.getZoom();
      var targetZoom = Math.round(currentZoom);
      if (Math.abs(currentZoom - targetZoom) > 0.01) {
        self._snappingZoom = true;
        self._map.zoomTo(targetZoom, { duration: 0 });
        self._snappingZoom = false;
      }
    });

    return this._map;
  };

  /**
   * Convert Leaflet/IITC options to Mapbox options.
   * @private
   */
  MapboxAdapter.prototype._convertOptions = function (container, options) {
    // Set access token globally (required by Mapbox GL JS)
    if (options.accessToken) {
      mapboxgl.accessToken = options.accessToken;
    }

    var mapboxOptions = {
      container: container,
      style: options.style || 'mapbox://styles/mapbox/dark-v11',
      center: [0, 0],
      zoom: 1,
      minZoom: options.minZoom || 0,
      maxZoom: options.maxZoom || 22,
      attributionControl: true,
      // Prevent world copies to avoid panning issues
      renderWorldCopies: false,
      // Use integer zoom levels like Leaflet
      scrollZoom: true,
    };

    // Convert center from [lat, lng] to [lng, lat]
    if (options.center) {
      if (Array.isArray(options.center)) {
        mapboxOptions.center = [options.center[1], options.center[0]];
      } else {
        mapboxOptions.center = [options.center.lng, options.center.lat];
      }
    }

    if (options.zoom !== undefined) {
      mapboxOptions.zoom = options.zoom;
    }

    // Mapbox doesn't have bounceAtZoomLimits, worldCopyJump directly
    // but we can configure similar behavior
    if (options.maxBounds) {
      mapboxOptions.maxBounds = this._convertBoundsToMapbox(options.maxBounds);
    }

    return mapboxOptions;
  };

  /**
   * Process pending operations after style loads.
   * @private
   */
  MapboxAdapter.prototype._processPendingOperations = function () {
    var operations = this._pendingOperations;
    this._pendingOperations = [];
    for (var i = 0; i < operations.length; i++) {
      operations[i]();
    }
  };

  /**
   * Execute operation immediately or queue for after style load.
   * @private
   */
  MapboxAdapter.prototype._whenStyleLoaded = function (operation) {
    // Check if style is loaded - use multiple conditions for reliability
    var styleLoaded = this._styleLoaded || (this._map && this._map.isStyleLoaded && this._map.isStyleLoaded());

    if (styleLoaded) {
      operation();
    } else {
      this._pendingOperations.push(operation);
    }
  };

  /**
   * Destroy the map and clean up.
   */
  MapboxAdapter.prototype.destroy = function () {
    if (this._map) {
      this._map.remove();
      this._map = null;
    }
    this._layers.clear();
    this._eventListeners.clear();
  };

  // ==================== View Control ====================

  /**
   * Get the current map center.
   * @returns {{lat: number, lng: number}}
   */
  MapboxAdapter.prototype.getCenter = function () {
    var center = this._map.getCenter();
    return { lat: center.lat, lng: center.lng };
  };

  /**
   * Set the map center.
   * @param {{lat: number, lng: number}|Array} latlng
   * @returns {this}
   */
  MapboxAdapter.prototype.setCenter = function (latlng) {
    var ll = this._toMapboxLngLat(latlng);
    this._map.setCenter(ll);
    return this;
  };

  /**
   * Get the current zoom level.
   * @returns {number}
   */
  MapboxAdapter.prototype.getZoom = function () {
    return this._map.getZoom();
  };

  /**
   * Set the zoom level.
   * @param {number} zoom
   * @param {Object} [options]
   * @returns {this}
   */
  MapboxAdapter.prototype.setZoom = function (zoom, options) {
    if (options && options.animate === false) {
      this._map.jumpTo({ zoom: zoom });
    } else {
      this._map.setZoom(zoom);
    }
    return this;
  };

  /**
   * Set center and zoom.
   * @param {{lat: number, lng: number}|Array} latlng
   * @param {number} zoom
   * @param {Object} [options]
   * @returns {this}
   */
  MapboxAdapter.prototype.setView = function (latlng, zoom, options) {
    var ll = this._toMapboxLngLat(latlng);
    options = options || {};

    if (options.animate === false || options.reset) {
      this._map.jumpTo({
        center: ll,
        zoom: zoom,
      });
    } else {
      this._map.easeTo({
        center: ll,
        zoom: zoom,
        duration: options.duration || 250,
      });
    }
    return this;
  };

  /**
   * Get the current map bounds.
   * Returns a Leaflet-compatible LatLngBounds-like object.
   * @returns {Object}
   */
  MapboxAdapter.prototype.getBounds = function () {
    var bounds = this._map.getBounds();
    // Return an object with methods similar to L.LatLngBounds
    return new MapboxBounds(bounds);
  };

  /**
   * Fit the map to bounds.
   * @param {Object|Array} bounds
   * @param {Object} [options]
   * @returns {this}
   */
  MapboxAdapter.prototype.fitBounds = function (bounds, options) {
    var b = this._convertBoundsToMapbox(bounds);
    options = options || {};

    this._map.fitBounds(b, {
      padding: options.padding || 0,
      duration: options.animate === false ? 0 : options.duration || 500,
      maxZoom: options.maxZoom,
    });
    return this;
  };

  /**
   * Set the maximum bounds.
   * @param {Array} bounds
   * @returns {this}
   */
  MapboxAdapter.prototype.setMaxBounds = function (bounds) {
    var b = this._convertBoundsToMapbox(bounds);
    this._map.setMaxBounds(b);
    return this;
  };

  /**
   * Pan the map by pixel offset.
   * @param {Array} offset - [x, y]
   * @param {Object} [options]
   * @returns {this}
   */
  MapboxAdapter.prototype.panBy = function (offset, options) {
    options = options || {};
    this._map.panBy(offset, {
      duration: options.animate === false ? 0 : options.duration || 250,
    });
    return this;
  };

  /**
   * Invalidate size and recalculate.
   * @param {Object} [options]
   * @returns {this}
   */
  MapboxAdapter.prototype.invalidateSize = function () {
    this._map.resize();
    return this;
  };

  // ==================== Coordinate Conversion ====================

  /**
   * Convert lat/lng to container point.
   * @param {{lat: number, lng: number}} latlng
   * @returns {{x: number, y: number}}
   */
  MapboxAdapter.prototype.latLngToContainerPoint = function (latlng) {
    var ll = this._toMapboxLngLat(latlng);
    var point = this._map.project(ll);
    return { x: point.x, y: point.y };
  };

  /**
   * Convert container point to lat/lng.
   * @param {{x: number, y: number}} point
   * @returns {{lat: number, lng: number}}
   */
  MapboxAdapter.prototype.containerPointToLatLng = function (point) {
    var ll = this._map.unproject([point.x, point.y]);
    return { lat: ll.lat, lng: ll.lng };
  };

  /**
   * Project lat/lng to world coordinates.
   * @param {{lat: number, lng: number}} latlng
   * @param {number} [zoom]
   * @returns {{x: number, y: number}}
   */
  MapboxAdapter.prototype.project = function (latlng) {
    var ll = this._toMapboxLngLat(latlng);
    var point = this._map.project(ll);
    return { x: point.x, y: point.y };
  };

  /**
   * Unproject world coordinates to lat/lng.
   * @param {{x: number, y: number}} point
   * @param {number} [zoom]
   * @returns {{lat: number, lng: number}}
   */
  MapboxAdapter.prototype.unproject = function (point) {
    var ll = this._map.unproject([point.x, point.y]);
    return { lat: ll.lat, lng: ll.lng };
  };

  /**
   * Calculate distance between two points.
   * Uses IITC.geo.distance for S2-accurate calculations.
   * @param {{lat: number, lng: number}} latlng1
   * @param {{lat: number, lng: number}} latlng2
   * @returns {number} Distance in meters
   */
  MapboxAdapter.prototype.distance = function (latlng1, latlng2) {
    return IITC.geo.distance(latlng1, latlng2);
  };

  // ==================== Layers ====================

  /**
   * Add a layer to the map.
   * Handles both Mapbox native layers and IITC layer wrappers.
   * @param {Object} layer
   * @returns {this}
   */
  MapboxAdapter.prototype.addLayer = function (layer) {
    var self = this;

    if (!layer) return this;

    // If layer has an addTo method (IITC layer wrapper), use it
    if (typeof layer.addTo === 'function') {
      layer.addTo(this);
      return this;
    }

    // If it's a raw Mapbox layer definition
    if (layer.id && layer.type) {
      this._whenStyleLoaded(function () {
        if (!self._map.getLayer(layer.id)) {
          self._map.addLayer(layer);
        }
      });
    }

    return this;
  };

  /**
   * Remove a layer from the map.
   * @param {Object} layer
   * @returns {this}
   */
  MapboxAdapter.prototype.removeLayer = function (layer) {
    var self = this;

    if (!layer) return this;

    // If layer has a remove method, use it
    if (typeof layer.remove === 'function') {
      layer.remove();
      return this;
    }

    // If it's a layer ID or has an id property
    var layerId = typeof layer === 'string' ? layer : layer.id;
    if (layerId) {
      this._whenStyleLoaded(function () {
        if (self._map.getLayer(layerId)) {
          self._map.removeLayer(layerId);
        }
      });
    }

    return this;
  };

  /**
   * Check if map has a layer.
   * @param {Object} layer
   * @returns {boolean}
   */
  MapboxAdapter.prototype.hasLayer = function (layer) {
    if (!layer) return false;

    // If layer has _map property set to this adapter
    if (layer._map === this) return true;

    // Check by layer ID
    var layerId = typeof layer === 'string' ? layer : layer.id;
    if (layerId && this._map.getLayer(layerId)) {
      return true;
    }

    return false;
  };

  /**
   * Iterate over all layers.
   * Note: This only iterates IITC-managed layers, not all Mapbox layers.
   * @param {Function} fn
   * @param {Object} [context]
   * @returns {this}
   */
  MapboxAdapter.prototype.eachLayer = function (fn, context) {
    this._layers.forEach(function (layer) {
      fn.call(context, layer);
    });
    return this;
  };

  /**
   * Register a layer with the adapter.
   * @param {string} id - Unique layer ID
   * @param {Object} layer - Layer wrapper object
   */
  MapboxAdapter.prototype.registerLayer = function (id, layer) {
    this._layers.set(id, layer);
  };

  /**
   * Unregister a layer from the adapter.
   * @param {string} id - Layer ID
   */
  MapboxAdapter.prototype.unregisterLayer = function (id) {
    this._layers.delete(id);
  };

  /**
   * Generate a unique layer ID.
   * @returns {string}
   */
  MapboxAdapter.prototype.generateLayerId = function () {
    return 'iitc-layer-' + ++this._layerIdCounter;
  };

  // ==================== Events ====================

  /**
   * Add an event listener.
   * @param {string} event
   * @param {Function} callback
   * @param {Object} [context]
   * @returns {this}
   */
  MapboxAdapter.prototype.on = function (event, callback, context) {
    var mapboxEvent = EVENT_MAP[event] || event;
    var wrappedCallback = this._wrapEventCallback(event, callback, context);

    // Store the mapping for later removal
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Map());
    }
    this._eventListeners.get(event).set(callback, wrappedCallback);

    this._map.on(mapboxEvent, wrappedCallback);
    return this;
  };

  /**
   * Remove an event listener.
   * @param {string} event
   * @param {Function} [callback]
   * @param {Object} [context]
   * @returns {this}
   */
  MapboxAdapter.prototype.off = function (event, callback) {
    var mapboxEvent = EVENT_MAP[event] || event;

    if (callback && this._eventListeners.has(event)) {
      var wrappedCallback = this._eventListeners.get(event).get(callback);
      if (wrappedCallback) {
        this._map.off(mapboxEvent, wrappedCallback);
        this._eventListeners.get(event).delete(callback);
      }
    } else {
      // Remove all listeners for this event
      this._map.off(mapboxEvent);
      this._eventListeners.delete(event);
    }

    return this;
  };

  /**
   * Add a one-time event listener.
   * @param {string} event
   * @param {Function} callback
   * @param {Object} [context]
   * @returns {this}
   */
  MapboxAdapter.prototype.once = function (event, callback, context) {
    var mapboxEvent = EVENT_MAP[event] || event;
    var wrappedCallback = this._wrapEventCallback(event, callback, context);

    this._map.once(mapboxEvent, wrappedCallback);
    return this;
  };

  /**
   * Fire an event.
   * @param {string} event
   * @param {Object} [data]
   * @returns {this}
   */
  MapboxAdapter.prototype.fire = function (event, data) {
    this._map.fire(event, data);
    return this;
  };

  /**
   * Wrap event callback to normalize event object format.
   * @private
   */
  MapboxAdapter.prototype._wrapEventCallback = function (event, callback, context) {
    var self = this;
    return function (e) {
      // Normalize the event object to match Leaflet format
      var normalizedEvent = self._normalizeEvent(e, event);
      callback.call(context || self, normalizedEvent);
    };
  };

  /**
   * Normalize Mapbox event to Leaflet-like format.
   * @private
   */
  MapboxAdapter.prototype._normalizeEvent = function (e, eventType) {
    var normalized = {
      type: eventType,
      target: this,
      originalEvent: e.originalEvent,
    };

    // Add latlng for mouse/touch events
    if (e.lngLat) {
      normalized.latlng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
    }

    // Add point for mouse events
    if (e.point) {
      normalized.containerPoint = { x: e.point.x, y: e.point.y };
      normalized.layerPoint = normalized.containerPoint; // Mapbox doesn't distinguish
    }

    return normalized;
  };

  // ==================== Native Access ====================

  /**
   * Get the native Mapbox GL JS map instance.
   * @returns {mapboxgl.Map}
   */
  MapboxAdapter.prototype.getNativeMap = function () {
    return this._map;
  };

  /**
   * Get the renderer type.
   * @returns {string}
   */
  MapboxAdapter.prototype.getRendererType = function () {
    return 'mapbox';
  };

  // ==================== Map State ====================

  /**
   * Get the map container element.
   * @returns {HTMLElement}
   */
  MapboxAdapter.prototype.getContainer = function () {
    return this._map.getContainer();
  };

  /**
   * Get the map size.
   * @returns {{x: number, y: number}}
   */
  MapboxAdapter.prototype.getSize = function () {
    var container = this._map.getContainer();
    return {
      x: container.clientWidth,
      y: container.clientHeight,
    };
  };

  /**
   * Get pixel bounds.
   * @returns {Object}
   */
  MapboxAdapter.prototype.getPixelBounds = function () {
    var size = this.getSize();
    return {
      min: { x: 0, y: 0 },
      max: { x: size.x, y: size.y },
    };
  };

  /**
   * Locate user position.
   * @param {Object} [options]
   * @returns {this}
   */
  MapboxAdapter.prototype.locate = function (options) {
    options = options || {};
    var self = this;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          var latlng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          if (options.setView) {
            self.setView(latlng, options.maxZoom || 16);
          }

          self.fire('locationfound', {
            latlng: latlng,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          });
        },
        function (error) {
          self.fire('locationerror', {
            code: error.code,
            message: error.message,
          });
        },
        {
          enableHighAccuracy: options.enableHighAccuracy !== false,
          timeout: options.timeout || 10000,
          maximumAge: options.maximumAge || 0,
        }
      );
    } else {
      this.fire('locationerror', {
        code: 0,
        message: 'Geolocation not supported',
      });
    }

    return this;
  };

  // ==================== Mapbox-specific Methods ====================

  /**
   * Get a Mapbox source by ID.
   * @param {string} sourceId
   * @returns {Object|undefined}
   */
  MapboxAdapter.prototype.getSource = function (sourceId) {
    return this._map.getSource(sourceId);
  };

  /**
   * Add a Mapbox source.
   * @param {string} sourceId
   * @param {Object} sourceData
   */
  MapboxAdapter.prototype.addSource = function (sourceId, sourceData) {
    var self = this;
    this._whenStyleLoaded(function () {
      if (!self._map.getSource(sourceId)) {
        self._map.addSource(sourceId, sourceData);
      }
    });
  };

  /**
   * Remove a Mapbox source.
   * @param {string} sourceId
   */
  MapboxAdapter.prototype.removeSource = function (sourceId) {
    var self = this;
    this._whenStyleLoaded(function () {
      if (self._map.getSource(sourceId)) {
        self._map.removeSource(sourceId);
      }
    });
  };

  /**
   * Add a Mapbox layer.
   * @param {Object} layerDef
   * @param {string} [beforeId]
   */
  MapboxAdapter.prototype.addMapboxLayer = function (layerDef, beforeId) {
    var self = this;
    var styleLoaded = this._styleLoaded || (this._map && this._map.isStyleLoaded && this._map.isStyleLoaded());
    console.log('[Mapbox] addMapboxLayer:', layerDef.id, 'styleLoaded:', styleLoaded);
    this._whenStyleLoaded(function () {
      if (!self._map.getLayer(layerDef.id)) {
        try {
          self._map.addLayer(layerDef, beforeId);
          console.log('[Mapbox] Layer added:', layerDef.id);
        } catch (e) {
          console.error('[Mapbox] Error adding layer:', layerDef.id, e.message);
        }
      }
    });
  };

  /**
   * Remove a Mapbox layer.
   * @param {string} layerId
   */
  MapboxAdapter.prototype.removeMapboxLayer = function (layerId) {
    var self = this;
    this._whenStyleLoaded(function () {
      if (self._map.getLayer(layerId)) {
        self._map.removeLayer(layerId);
      }
    });
  };

  /**
   * Set paint property on a layer.
   * @param {string} layerId
   * @param {string} property
   * @param {*} value
   */
  MapboxAdapter.prototype.setPaintProperty = function (layerId, property, value) {
    if (this._map.getLayer(layerId)) {
      this._map.setPaintProperty(layerId, property, value);
    }
  };

  /**
   * Set layout property on a layer.
   * @param {string} layerId
   * @param {string} property
   * @param {*} value
   */
  MapboxAdapter.prototype.setLayoutProperty = function (layerId, property, value) {
    if (this._map.getLayer(layerId)) {
      this._map.setLayoutProperty(layerId, property, value);
    }
  };

  // ==================== Private Helpers ====================

  /**
   * Convert to Mapbox [lng, lat] format.
   * @private
   */
  MapboxAdapter.prototype._toMapboxLngLat = function (latlng) {
    if (Array.isArray(latlng)) {
      // Assume [lat, lng] input (Leaflet format)
      return [latlng[1], latlng[0]];
    }
    return [latlng.lng, latlng.lat];
  };

  /**
   * Convert bounds to Mapbox format.
   * @private
   */
  MapboxAdapter.prototype._convertBoundsToMapbox = function (bounds) {
    if (Array.isArray(bounds)) {
      // [[south, west], [north, east]] -> [[west, south], [east, north]]
      if (Array.isArray(bounds[0])) {
        return [
          [bounds[0][1], bounds[0][0]],
          [bounds[1][1], bounds[1][0]],
        ];
      }
    }
    // {north, south, east, west} format
    if (bounds.north !== undefined) {
      return [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ];
    }
    // Assume already in Mapbox format
    return bounds;
  };

  // ==================== MapboxBounds Helper Class ====================

  /**
   * Wrapper for Mapbox bounds to provide Leaflet-compatible interface.
   * @private
   */
  function MapboxBounds(mapboxBounds) {
    this._bounds = mapboxBounds;
  }

  MapboxBounds.prototype.getNorth = function () {
    return this._bounds.getNorth();
  };

  MapboxBounds.prototype.getSouth = function () {
    return this._bounds.getSouth();
  };

  MapboxBounds.prototype.getEast = function () {
    return this._bounds.getEast();
  };

  MapboxBounds.prototype.getWest = function () {
    return this._bounds.getWest();
  };

  MapboxBounds.prototype.getNorthEast = function () {
    var ne = this._bounds.getNorthEast();
    return { lat: ne.lat, lng: ne.lng };
  };

  MapboxBounds.prototype.getSouthWest = function () {
    var sw = this._bounds.getSouthWest();
    return { lat: sw.lat, lng: sw.lng };
  };

  MapboxBounds.prototype.getNorthWest = function () {
    return { lat: this.getNorth(), lng: this.getWest() };
  };

  MapboxBounds.prototype.getSouthEast = function () {
    return { lat: this.getSouth(), lng: this.getEast() };
  };

  MapboxBounds.prototype.getCenter = function () {
    var center = this._bounds.getCenter();
    return { lat: center.lat, lng: center.lng };
  };

  MapboxBounds.prototype.contains = function (latlng) {
    var ll = Array.isArray(latlng) ? { lat: latlng[0], lng: latlng[1] } : latlng;
    return this._bounds.contains([ll.lng, ll.lat]);
  };

  MapboxBounds.prototype.intersects = function (otherBounds) {
    // Check if bounds intersect
    var other = otherBounds._bounds || otherBounds;
    var n1 = this.getNorth(),
      s1 = this.getSouth(),
      e1 = this.getEast(),
      w1 = this.getWest();
    var n2, s2, e2, w2;

    if (other.getNorth) {
      n2 = other.getNorth();
      s2 = other.getSouth();
      e2 = other.getEast();
      w2 = other.getWest();
    } else {
      // Assume {north, south, east, west} object
      n2 = other.north;
      s2 = other.south;
      e2 = other.east;
      w2 = other.west;
    }

    return !(s1 > n2 || n1 < s2 || w1 > e2 || e1 < w2);
  };

  MapboxBounds.prototype.extend = function (latlng) {
    var ll = Array.isArray(latlng) ? [latlng[1], latlng[0]] : [latlng.lng, latlng.lat];
    this._bounds.extend(ll);
    return this;
  };

  MapboxBounds.prototype.pad = function (ratio) {
    // Mapbox doesn't have built-in pad, calculate manually
    var sw = this.getSouthWest();
    var ne = this.getNorthEast();

    var latPad = (ne.lat - sw.lat) * ratio;
    var lngPad = (ne.lng - sw.lng) * ratio;

    var paddedBounds = new mapboxgl.LngLatBounds(
      [sw.lng - lngPad, sw.lat - latPad],
      [ne.lng + lngPad, ne.lat + latPad]
    );

    return new MapboxBounds(paddedBounds);
  };

  MapboxBounds.prototype.toBBoxString = function () {
    return this.getWest() + ',' + this.getSouth() + ',' + this.getEast() + ',' + this.getNorth();
  };

  // Export
  IITC.map.adapters.MapboxAdapter = MapboxAdapter;
  console.log('[IITC Debug] MapboxAdapter exported successfully');
  console.log('[IITC Debug] IITC.map.adapters.MapboxAdapter:', !!IITC.map.adapters.MapboxAdapter);
})();
