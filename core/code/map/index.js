/* global IITC, log -- eslint */

/**
 * @file IITC.map facade - main entry point for the map abstraction layer.
 * Provides a unified interface for map operations across different renderers.
 * @module map/index
 */

/**
 * @namespace IITC.map
 * @description
 * The IITC.map namespace provides a common interface for map operations.
 * It abstracts away the underlying map library (Leaflet, Mapbox GL JS, etc.)
 * allowing IITC and plugins to work with any supported renderer.
 *
 * The facade maintains backward compatibility through window.map proxy.
 */

(function () {
  'use strict';

  // Ensure namespace exists (may have been created by interfaces.js)
  IITC.map = IITC.map || {};

  /**
   * The current map adapter instance.
   * @type {Object|null}
   * @private
   */
  var _adapter = null;

  /**
   * The layer factory for the current renderer.
   * @type {Object|null}
   * @private
   */
  var _factory = null;

  /**
   * Whether the map has been initialized.
   * @type {boolean}
   * @private
   */
  var _initialized = false;

  /**
   * Configuration for the map renderer.
   * @type {Object}
   * @private
   */
  var _config = {
    renderer: 'leaflet',
    mapboxToken: null,
  };

  /**
   * Initialize the map with the specified renderer.
   *
   * @function initialize
   * @memberof IITC.map
   * @param {string|HTMLElement} container - Container element ID or element
   * @param {Object} [options] - Map options
   * @param {string} [options.renderer='leaflet'] - Renderer to use ('leaflet' or 'mapbox')
   * @param {string} [options.mapboxToken] - Mapbox access token (required for mapbox renderer)
   * @returns {Object} The map adapter
   */
  IITC.map.initialize = function (container, options) {
    if (_initialized) {
      log.warn('IITC.map.initialize called when map is already initialized');
      return _adapter;
    }

    options = options || {};

    // Merge config with options
    _config.renderer = options.renderer || window.mapRendererConfig?.renderer || 'leaflet';
    _config.mapboxToken = options.mapboxToken || window.mapRendererConfig?.mapboxToken;
    _config.mapboxStyle = options.style || window.mapRendererConfig?.style;

    // Remove renderer-specific options from map options
    var mapOptions = Object.assign({}, options);
    delete mapOptions.renderer;
    delete mapOptions.mapboxToken;

    // Create adapter based on renderer type
    log.log('[IITC Debug] Creating adapter for renderer:', _config.renderer);
    log.log('[IITC Debug] IITC.map.adapters:', IITC.map.adapters);
    log.log('[IITC Debug] IITC.map.adapters keys:', Object.keys(IITC.map.adapters || {}));
    log.log('[IITC Debug] MapboxAdapter:', IITC.map.adapters?.MapboxAdapter);
    log.log('[IITC Debug] mapboxgl defined:', typeof window.mapboxgl !== 'undefined');

    switch (_config.renderer) {
      case 'mapbox':
        // Check if Mapbox GL JS library is loaded (use window.mapboxgl for explicit global reference)
        if (typeof window.mapboxgl === 'undefined') {
          log.error('Mapbox GL JS library not loaded, falling back to Leaflet');
          _config.renderer = 'leaflet';
        } else if (!IITC.map.adapters || !IITC.map.adapters.MapboxAdapter) {
          log.error('Mapbox adapter not loaded, falling back to Leaflet');
          log.error('[IITC Debug] adapters namespace exists:', !!IITC.map.adapters);
          log.error('[IITC Debug] MapboxAdapter exists:', !!(IITC.map.adapters && IITC.map.adapters.MapboxAdapter));
          _config.renderer = 'leaflet';
        } else if (!_config.mapboxToken) {
          log.error('Mapbox token not provided, falling back to Leaflet');
          _config.renderer = 'leaflet';
        } else {
          _adapter = new IITC.map.adapters.MapboxAdapter();
          mapOptions.accessToken = _config.mapboxToken;
          if (_config.mapboxStyle) {
            mapOptions.style = _config.mapboxStyle;
          }
          break;
        }
      // Falls through to leaflet
      case 'leaflet':
      default:
        _adapter = new IITC.map.adapters.LeafletAdapter();
        _config.renderer = 'leaflet';
        break;
    }

    // Initialize the adapter
    _adapter.initialize(container, mapOptions);

    // Set up factory
    _factory = _getFactory(_config.renderer);

    _initialized = true;

    log.log('IITC.map initialized with renderer: ' + _config.renderer);

    return _adapter;
  };

  /**
   * Get the layer factory for the specified renderer.
   *
   * @private
   * @param {string} renderer - Renderer type
   * @returns {Object} Layer factory
   */
  function _getFactory(renderer) {
    switch (renderer) {
      case 'mapbox':
        return IITC.map.layers.mapbox?.factory || null;
      case 'leaflet':
      default:
        return IITC.map.layers.leaflet.factory;
    }
  }

  /**
   * Get the current map adapter.
   *
   * @function getAdapter
   * @memberof IITC.map
   * @returns {Object|null} The current adapter
   */
  IITC.map.getAdapter = function () {
    return _adapter;
  };

  /**
   * Get the native map instance (L.map or mapboxgl.Map).
   *
   * @function getNativeMap
   * @memberof IITC.map
   * @returns {Object|null} The native map instance
   */
  IITC.map.getNativeMap = function () {
    return _adapter ? _adapter.getNativeMap() : null;
  };

  /**
   * Get the layer factory for the current renderer.
   *
   * @function getFactory
   * @memberof IITC.map
   * @returns {Object|null} The layer factory
   */
  IITC.map.getFactory = function () {
    return _factory;
  };

  /**
   * Alias for getFactory for convenience.
   *
   * @type {Object|null}
   * @memberof IITC.map
   */
  Object.defineProperty(IITC.map, 'factory', {
    get: function () {
      return _factory;
    },
  });

  /**
   * Get the current renderer type.
   *
   * @function getRendererType
   * @memberof IITC.map
   * @returns {string} 'leaflet' or 'mapbox'
   */
  IITC.map.getRendererType = function () {
    return _config.renderer;
  };

  /**
   * Check if the map is initialized.
   *
   * @function isInitialized
   * @memberof IITC.map
   * @returns {boolean}
   */
  IITC.map.isInitialized = function () {
    return _initialized;
  };

  /**
   * Get a compatibility proxy for window.map.
   * This allows plugins to continue using window.map with full backward compatibility.
   *
   * @function getCompatProxy
   * @memberof IITC.map
   * @returns {Object} Proxy that forwards to adapter/native map
   */
  IITC.map.getCompatProxy = function () {
    if (!_adapter) {
      return null;
    }
    // Use simple wrapper for better debugging and compatibility
    return IITC.map.compat.createSimpleWrapper(_adapter);
  };

  /**
   * Destroy the map and clean up resources.
   *
   * @function destroy
   * @memberof IITC.map
   */
  IITC.map.destroy = function () {
    if (_adapter) {
      _adapter.destroy();
      _adapter = null;
    }
    _factory = null;
    _initialized = false;
  };

  // ==================== Convenience Methods ====================
  // These proxy to the adapter for direct access

  /**
   * Get the current map center.
   *
   * @function getCenter
   * @memberof IITC.map
   * @returns {{lat: number, lng: number}|null}
   */
  IITC.map.getCenter = function () {
    return _adapter ? _adapter.getCenter() : null;
  };

  /**
   * Get the current zoom level.
   *
   * @function getZoom
   * @memberof IITC.map
   * @returns {number|null}
   */
  IITC.map.getZoom = function () {
    return _adapter ? _adapter.getZoom() : null;
  };

  /**
   * Get the current bounds.
   *
   * @function getBounds
   * @memberof IITC.map
   * @returns {Object|null}
   */
  IITC.map.getBounds = function () {
    return _adapter ? _adapter.getBounds() : null;
  };

  /**
   * Set the map view.
   *
   * @function setView
   * @memberof IITC.map
   * @param {{lat: number, lng: number}|Array} latlng - New center
   * @param {number} zoom - New zoom level
   * @param {Object} [options] - View options
   * @returns {Object|null} The adapter for chaining
   */
  IITC.map.setView = function (latlng, zoom, options) {
    return _adapter ? _adapter.setView(latlng, zoom, options) : null;
  };

  /**
   * Calculate distance between two points using S2 Earth radius.
   *
   * @function distance
   * @memberof IITC.map
   * @param {{lat: number, lng: number}} latlng1 - First point
   * @param {{lat: number, lng: number}} latlng2 - Second point
   * @returns {number} Distance in meters
   */
  IITC.map.distance = function (latlng1, latlng2) {
    // Use IITC.geo if adapter not available
    if (_adapter) {
      return _adapter.distance(latlng1, latlng2);
    }
    return IITC.geo.distance(latlng1, latlng2);
  };

  // ==================== Control Methods ====================

  /**
   * Add a control to the map.
   *
   * @function addControl
   * @memberof IITC.map
   * @param {Object} control - Control to add
   * @param {string} [position] - Position override
   * @returns {Object} IITC.map for chaining
   */
  IITC.map.addControl = function (control, position) {
    if (_adapter) _adapter.addControl(control, position);
    return IITC.map;
  };

  /**
   * Remove a control from the map.
   *
   * @function removeControl
   * @memberof IITC.map
   * @param {Object} control - Control to remove
   * @returns {Object} IITC.map for chaining
   */
  IITC.map.removeControl = function (control) {
    if (_adapter) _adapter.removeControl(control);
    return IITC.map;
  };

  // ==================== Layer Factory Shortcuts ====================
  // Convenience methods that delegate to the current factory

  /**
   * Create a portal marker using the current factory.
   *
   * @function createPortalMarker
   * @memberof IITC.map
   * @param {{lat: number, lng: number}} latlng - Portal location
   * @param {Object} data - Portal data
   * @returns {Object} Portal marker
   */
  IITC.map.createPortalMarker = function (latlng, data) {
    if (!_factory) {
      throw new Error('IITC.map not initialized');
    }
    return _factory.createPortalMarker(latlng, data);
  };

  /**
   * Create a geodesic polyline using the current factory.
   *
   * @function createGeodesicPolyline
   * @memberof IITC.map
   * @param {Array} latlngs - Array of points
   * @param {Object} [options] - Polyline options
   * @returns {Object} Geodesic polyline
   */
  IITC.map.createGeodesicPolyline = function (latlngs, options) {
    if (!_factory) {
      throw new Error('IITC.map not initialized');
    }
    return _factory.createGeodesicPolyline(latlngs, options);
  };

  /**
   * Create a geodesic polygon using the current factory.
   *
   * @function createGeodesicPolygon
   * @memberof IITC.map
   * @param {Array} latlngs - Array of points
   * @param {Object} [options] - Polygon options
   * @returns {Object} Geodesic polygon
   */
  IITC.map.createGeodesicPolygon = function (latlngs, options) {
    if (!_factory) {
      throw new Error('IITC.map not initialized');
    }
    return _factory.createGeodesicPolygon(latlngs, options);
  };

  /**
   * Create a geodesic circle using the current factory.
   *
   * @function createGeodesicCircle
   * @memberof IITC.map
   * @param {{lat: number, lng: number}} latlng - Center location
   * @param {number|Object} radius - Radius in meters or options with radius
   * @param {Object} [options] - Circle options
   * @returns {Object} Geodesic circle
   */
  IITC.map.createGeodesicCircle = function (latlng, radius, options) {
    if (!_factory) {
      throw new Error('IITC.map not initialized');
    }
    return _factory.createGeodesicCircle(latlng, radius, options);
  };

  /**
   * Create a layer group using the current factory.
   *
   * @function createLayerGroup
   * @memberof IITC.map
   * @param {Array} [layers] - Initial layers
   * @param {Object} [options] - Layer group options
   * @returns {Object} Layer group
   */
  IITC.map.createLayerGroup = function (layers, options) {
    if (!_factory) {
      throw new Error('IITC.map not initialized');
    }
    return _factory.createLayerGroup(layers, options);
  };

  /**
   * Create a feature group using the current factory.
   *
   * @function createFeatureGroup
   * @memberof IITC.map
   * @param {Array} [layers] - Initial layers
   * @param {Object} [options] - Feature group options
   * @returns {Object} Feature group
   */
  IITC.map.createFeatureGroup = function (layers, options) {
    if (!_factory) {
      throw new Error('IITC.map not initialized');
    }
    return _factory.createFeatureGroup(layers, options);
  };
})();
