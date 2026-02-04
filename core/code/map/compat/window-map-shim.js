/* global IITC -- eslint */

/**
 * @file Compatibility shim for window.map.
 * Creates a proxy that forwards calls to IITC.map while maintaining
 * backward compatibility with plugins that access window.map directly.
 * @module map/compat/window-map-shim
 */

IITC.map.compat = IITC.map.compat || {};

(function () {
  'use strict';

  /**
   * Property mapping from IITC.map interface to Leaflet-specific properties.
   * These properties need special handling because they don't exist on the adapter.
   * @private
   */
  var LEAFLET_PROPERTIES = {
    // Properties that exist directly on L.map
    options: true,
    _controlCorners: true,
    _panes: true,
    _mapPane: true,
    _container: true,
    _layers: true,
    _size: true,
    _zoom: true,
    _zoomAnimated: true,
    attributionControl: true,
    zoomControl: true,
    boxZoom: true,
    doubleClickZoom: true,
    dragging: true,
    keyboard: true,
    scrollWheelZoom: true,
    tap: true,
    touchZoom: true,
  };

  /**
   * Methods that should be called on the native map directly.
   * @private
   */
  var NATIVE_METHODS = {
    // Layer methods
    openPopup: true,
    closePopup: true,
    openTooltip: true,
    closeTooltip: true,

    // Control methods
    addControl: true,
    removeControl: true,

    // Geolocation
    locate: true,
    stopLocate: true,

    // State
    getPane: true,
    createPane: true,
    getRenderer: true,

    // Misc
    whenReady: true,
    wrapLatLng: true,
    wrapLatLngBounds: true,

    // Zoom/pan methods that may have specific Leaflet options
    flyTo: true,
    flyToBounds: true,
    panTo: true,
    panInsideBounds: true,
    panInside: true,
    setMinZoom: true,
    setMaxZoom: true,
    getMinZoom: true,
    getMaxZoom: true,
    getBoundsZoom: true,
    getScaleZoom: true,
    getZoomScale: true,

    // Conversion methods
    latLngToLayerPoint: true,
    layerPointToLatLng: true,
    latLngToContainerPoint: true,
    containerPointToLatLng: true,
    mouseEventToContainerPoint: true,
    mouseEventToLayerPoint: true,
    mouseEventToLatLng: true,
  };

  /**
   * Create a compatibility proxy for window.map.
   * The proxy forwards property access and method calls to either:
   * 1. The IITC.map adapter (for abstracted methods)
   * 2. The native Leaflet map (for Leaflet-specific properties/methods)
   *
   * @function createCompatProxy
   * @memberof IITC.map.compat
   * @param {Object} adapter - The map adapter (e.g., LeafletAdapter)
   * @returns {Proxy} A proxy object that mimics L.map behavior
   */
  IITC.map.compat.createCompatProxy = function (adapter) {
    // If Proxy isn't available, just return the native map
    if (typeof Proxy === 'undefined') {
      return adapter.getNativeMap();
    }

    var nativeMap = adapter.getNativeMap();

    return new Proxy(adapter, {
      get: function (target, prop) {
        // Handle special Leaflet properties that need direct native access
        if (prop in LEAFLET_PROPERTIES) {
          return nativeMap[prop];
        }

        // Handle methods that should go to native map
        if (prop in NATIVE_METHODS) {
          var nativeMethod = nativeMap[prop];
          if (typeof nativeMethod === 'function') {
            return nativeMethod.bind(nativeMap);
          }
          return nativeMethod;
        }

        // Check if adapter has this property/method
        var adapterValue = target[prop];
        if (typeof adapterValue === 'function') {
          return adapterValue.bind(target);
        }
        if (adapterValue !== undefined) {
          return adapterValue;
        }

        // Fall back to native map for anything else
        var nativeValue = nativeMap[prop];
        if (typeof nativeValue === 'function') {
          return nativeValue.bind(nativeMap);
        }
        return nativeValue;
      },

      set: function (target, prop, value) {
        // Properties should be set on native map
        nativeMap[prop] = value;
        return true;
      },

      has: function (target, prop) {
        return prop in target || prop in nativeMap;
      },

      ownKeys: function (target) {
        // Combine keys from both adapter and native map
        var adapterKeys = Object.keys(target);
        var nativeKeys = Object.keys(nativeMap);
        var allKeys = new Set([...adapterKeys, ...nativeKeys]);
        return Array.from(allKeys);
      },

      getOwnPropertyDescriptor: function (target, prop) {
        // Try adapter first, then native map
        var desc = Object.getOwnPropertyDescriptor(target, prop);
        if (desc) return desc;
        return Object.getOwnPropertyDescriptor(nativeMap, prop);
      },
    });
  };

  /**
   * Create a simple wrapper that exposes native map with adapter methods mixed in.
   * Use this when Proxy is not available or for simpler debugging.
   *
   * @function createSimpleWrapper
   * @memberof IITC.map.compat
   * @param {Object} adapter - The map adapter
   * @returns {Object} The native map with adapter methods added
   */
  IITC.map.compat.createSimpleWrapper = function (adapter) {
    var nativeMap = adapter.getNativeMap();

    // Store reference to adapter
    nativeMap._iitcAdapter = adapter;

    // Add IITC-specific methods that don't exist on native map
    nativeMap.getRendererType = function () {
      return adapter.getRendererType();
    };

    return nativeMap;
  };

  /**
   * Utility to check if an object is the compatibility proxy.
   *
   * @function isCompatProxy
   * @memberof IITC.map.compat
   * @param {Object} obj - Object to check
   * @returns {boolean} True if obj is a compatibility proxy
   */
  IITC.map.compat.isCompatProxy = function (obj) {
    return obj && obj._iitcAdapter !== undefined;
  };

  /**
   * Get the adapter from a map object (native or proxy).
   *
   * @function getAdapter
   * @memberof IITC.map.compat
   * @param {Object} map - Map object
   * @returns {Object|null} The adapter if available
   */
  IITC.map.compat.getAdapter = function (map) {
    if (map && map._iitcAdapter) {
      return map._iitcAdapter;
    }
    // If it's a Proxy wrapping an adapter, try to get adapter via getNativeMap check
    if (map && typeof map.getRendererType === 'function') {
      return map; // It's likely the adapter itself or has adapter methods
    }
    return null;
  };
})();
