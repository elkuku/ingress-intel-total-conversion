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
    var rendererType = adapter.getRendererType();

    // Store reference to adapter (use both names for compatibility)
    nativeMap._iitcAdapter = adapter;
    nativeMap._adapter = adapter;

    // Add IITC-specific methods that don't exist on native map
    nativeMap.getRendererType = function () {
      return adapter.getRendererType();
    };

    // For Mapbox, we need to wrap several methods to maintain Leaflet API compatibility
    if (rendererType === 'mapbox') {
      // Add options property for code that expects Leaflet-style options
      if (!nativeMap.options) {
        nativeMap.options = {
          // Mapbox uses WebGL, similar to preferCanvas in terms of performance
          preferCanvas: true,
          // Common options that might be accessed
          minZoom: nativeMap.getMinZoom ? nativeMap.getMinZoom() : 0,
          maxZoom: nativeMap.getMaxZoom ? nativeMap.getMaxZoom() : 22,
          // CRS placeholder for code that checks it
          crs: {
            projection: {
              MAX_LATITUDE: 85.051129
            }
          }
        };
      }

      // Store original Mapbox methods
      var originalOn = nativeMap.on.bind(nativeMap);
      var originalOff = nativeMap.off.bind(nativeMap);
      var originalOnce = nativeMap.once.bind(nativeMap);

      // Wrap 'on' to handle Leaflet-style context binding
      // Leaflet: map.on(event, handler, context)
      // Mapbox: map.on(event, handler) OR map.on(event, layerId, handler)
      nativeMap.on = function (event, callback, context) {
        // If context is provided and is an object (not a string layer ID), bind it
        if (context && typeof context === 'object') {
          var boundCallback = callback.bind(context);
          // Store mapping for potential removal
          if (!nativeMap._contextCallbacks) {
            nativeMap._contextCallbacks = new Map();
          }
          if (!nativeMap._contextCallbacks.has(event)) {
            nativeMap._contextCallbacks.set(event, new Map());
          }
          nativeMap._contextCallbacks.get(event).set(callback, boundCallback);
          originalOn(event, boundCallback);
        } else if (typeof callback === 'function') {
          originalOn(event, callback);
        } else {
          // Might be layer-specific event: on(event, layerId, callback)
          originalOn(event, callback, context);
        }
        return nativeMap;
      };

      // Wrap 'off' to handle context-bound callbacks
      nativeMap.off = function (event, callback, context) {
        if (context && typeof context === 'object' && nativeMap._contextCallbacks) {
          var eventCallbacks = nativeMap._contextCallbacks.get(event);
          if (eventCallbacks && eventCallbacks.has(callback)) {
            var boundCallback = eventCallbacks.get(callback);
            originalOff(event, boundCallback);
            eventCallbacks.delete(callback);
            return nativeMap;
          }
        }
        originalOff(event, callback);
        return nativeMap;
      };

      // Wrap 'once' to handle context binding
      nativeMap.once = function (event, callback, context) {
        if (context && typeof context === 'object') {
          originalOnce(event, callback.bind(context));
        } else {
          originalOnce(event, callback);
        }
        return nativeMap;
      };

      // Add Leaflet-style event aliases
      nativeMap.addEventListener = nativeMap.on;
      nativeMap.removeEventListener = nativeMap.off;

      // Create _controlCorners mapping to Mapbox's native control containers.
      // Add Leaflet CSS classes so that existing IITC/Leaflet styles (z-index, positioning, grid)
      // apply to the Mapbox corners — this keeps the layer chooser visible above the sidebar.
      var controlContainer = nativeMap.getContainer().querySelector('.mapboxgl-control-container');
      if (controlContainer) {
        controlContainer.classList.add('leaflet-control-container');
      }
      nativeMap._controlContainer = nativeMap.getContainer();
      var container = nativeMap.getContainer();
      var cornerMapping = {
        topleft:     { mapbox: '.mapboxgl-ctrl-top-left',     leaflet: 'leaflet-top leaflet-left' },
        topright:    { mapbox: '.mapboxgl-ctrl-top-right',    leaflet: 'leaflet-top leaflet-right' },
        bottomleft:  { mapbox: '.mapboxgl-ctrl-bottom-left',  leaflet: 'leaflet-bottom leaflet-left' },
        bottomright: { mapbox: '.mapboxgl-ctrl-bottom-right', leaflet: 'leaflet-bottom leaflet-right' },
      };
      nativeMap._controlCorners = {};
      for (var pos in cornerMapping) {
        var mapping = cornerMapping[pos];
        var el = container.querySelector(mapping.mapbox);
        if (!el) {
          el = document.createElement('div');
          el.className = mapping.mapbox.slice(1); // remove leading dot
          container.appendChild(el);
        }
        // Add Leaflet classes so IITC styles (z-index, grid layout, etc.) apply
        el.className += ' ' + mapping.leaflet;
        nativeMap._controlCorners[pos] = el;
      }

      // Wrap addControl/removeControl for Leaflet control compatibility
      var originalAddControl = nativeMap.addControl ? nativeMap.addControl.bind(nativeMap) : null;
      var originalRemoveControl = nativeMap.removeControl ? nativeMap.removeControl.bind(nativeMap) : null;

      nativeMap.addControl = function (control, ctrlPosition) {
        // If it's a Leaflet L.Control instance (has getPosition method)
        if (control.getPosition) {
          var ctrlPos = ctrlPosition || control.getPosition() || 'topright';
          var corner = nativeMap._controlCorners[ctrlPos];
          if (!corner) return nativeMap;

          var ctrlContainer = control.onAdd(nativeMap);
          corner.appendChild(ctrlContainer);

          control._map = nativeMap;
          control._container = ctrlContainer;
          return nativeMap;
        }

        // Native Mapbox control — pass through
        if (originalAddControl) {
          return originalAddControl(control, ctrlPosition);
        }
        return nativeMap;
      };

      nativeMap.removeControl = function (control) {
        if (control.getPosition && control._container) {
          if (control.onRemove) {
            control.onRemove(nativeMap);
          }
          if (control._container.parentNode) {
            control._container.parentNode.removeChild(control._container);
          }
          control._map = null;
          return nativeMap;
        }

        // Native Mapbox control
        if (originalRemoveControl) {
          return originalRemoveControl(control);
        }
        return nativeMap;
      };

      // Track layers manually since Mapbox doesn't have hasLayer
      if (!nativeMap._iitcLayers) {
        nativeMap._iitcLayers = new Set();
      }

      // Store original Mapbox addLayer for raw layer definitions
      var originalAddLayer = nativeMap.addLayer.bind(nativeMap);

      // Wrap addLayer to track layers
      // Use a flag to prevent recursion (addLayer -> addTo -> addLayer)
      nativeMap.addLayer = function (layer, beforeId) {
        if (!layer) return nativeMap;

        // Check if this is a raw Mapbox layer definition (has id and type properties)
        if (layer.id && layer.type && layer.source) {
          return originalAddLayer(layer, beforeId);
        }

        if (nativeMap._iitcLayers.has(layer)) {
          return nativeMap; // Already added
        }
        nativeMap._iitcLayers.add(layer);

        // Call onAdd directly to avoid recursion (addTo calls map.addLayer)
        if (typeof layer.onAdd === 'function') {
          layer._map = nativeMap;
          // Call beforeAdd if present (Leaflet uses this to set up renderers for Path objects)
          if (typeof layer.beforeAdd === 'function') {
            layer.beforeAdd(nativeMap);
          }
          layer.onAdd(nativeMap);
        } else if (typeof layer._addToMap === 'function') {
          layer._addToMap(nativeMap);
        } else if (typeof layer.addTo === 'function') {
          layer.addTo(nativeMap);
        }

        // Fire 'add' event so LayerChooser status tracking works
        if (typeof layer.fire === 'function') {
          layer.fire('add', { target: layer });
        }

        return nativeMap;
      };

      // Store original Mapbox removeLayer for layer IDs
      var originalRemoveLayer = nativeMap.removeLayer.bind(nativeMap);

      // Wrap removeLayer to track layers
      nativeMap.removeLayer = function (layer) {
        if (!layer) return nativeMap;

        // Check if this is a layer ID string (for direct Mapbox layer removal)
        if (typeof layer === 'string') {
          return originalRemoveLayer(layer);
        }

        if (!nativeMap._iitcLayers.has(layer)) {
          return nativeMap; // Not on map
        }
        nativeMap._iitcLayers.delete(layer);

        // Call onRemove directly to avoid recursion
        if (typeof layer.onRemove === 'function') {
          layer.onRemove(nativeMap);
          layer._map = null;
        } else if (typeof layer._removeFromMap === 'function') {
          layer._removeFromMap(nativeMap);
        } else if (typeof layer.remove === 'function') {
          layer.remove();
        }

        // Fire 'remove' event so LayerChooser status tracking works
        if (typeof layer.fire === 'function') {
          layer.fire('remove', { target: layer });
        }

        return nativeMap;
      };

      // Implement hasLayer
      nativeMap.hasLayer = function (layer) {
        return nativeMap._iitcLayers.has(layer);
      };

      // Implement eachLayer
      nativeMap.eachLayer = function (fn, context) {
        nativeMap._iitcLayers.forEach(function (layer) {
          fn.call(context || nativeMap, layer);
        });
        return nativeMap;
      };

      // Implement getPane for L.Layer compatibility
      // Leaflet layers call this._map.getPane() in onAdd
      nativeMap.getPane = function () {
        return nativeMap.getContainer();
      };

      // Implement containerPointToLayerPoint for L.Layer._update compatibility
      // In Mapbox there's no separate layer point offset, so identity transform
      nativeMap.containerPointToLayerPoint = function (point) {
        return point;
      };

      // Implement layerPointToContainerPoint (inverse of above)
      nativeMap.layerPointToContainerPoint = function (point) {
        return point;
      };

      // Helper to create Leaflet-compatible Point objects
      function createCompatPoint(x, y) {
        return {
          x: x,
          y: y,
          subtract: function (other) {
            return createCompatPoint(this.x - other.x, this.y - other.y);
          },
          add: function (other) {
            return createCompatPoint(this.x + other.x, this.y + other.y);
          },
          multiplyBy: function (num) {
            return createCompatPoint(this.x * num, this.y * num);
          },
          divideBy: function (num) {
            return createCompatPoint(this.x / num, this.y / num);
          },
          distanceTo: function (other) {
            var dx = this.x - other.x;
            var dy = this.y - other.y;
            return Math.sqrt(dx * dx + dy * dy);
          },
          round: function () {
            return createCompatPoint(Math.round(this.x), Math.round(this.y));
          },
          floor: function () {
            return createCompatPoint(Math.floor(this.x), Math.floor(this.y));
          },
          ceil: function () {
            return createCompatPoint(Math.ceil(this.x), Math.ceil(this.y));
          },
          equals: function (other) {
            return this.x === other.x && this.y === other.y;
          },
          clone: function () {
            return createCompatPoint(this.x, this.y);
          },
          toString: function () {
            return 'Point(' + this.x + ', ' + this.y + ')';
          }
        };
      }

      // Wrap project to return Leaflet-compatible Point
      var originalProject = nativeMap.project.bind(nativeMap);
      nativeMap.project = function (latlng, zoom) {
        // Normalize latlng
        var lat = latlng.lat !== undefined ? latlng.lat : latlng[0];
        var lng = latlng.lng !== undefined ? latlng.lng : latlng[1];

        // Mapbox project returns {x, y} in pixels
        var point = originalProject([lng, lat]);
        return createCompatPoint(point.x, point.y);
      };

      // Wrap unproject to accept Leaflet-style Point and return LatLng
      var originalUnproject = nativeMap.unproject.bind(nativeMap);
      nativeMap.unproject = function (point, zoom) {
        var x = point.x !== undefined ? point.x : point[0];
        var y = point.y !== undefined ? point.y : point[1];

        var lngLat = originalUnproject([x, y]);
        // Return Leaflet-style {lat, lng}
        return {
          lat: lngLat.lat,
          lng: lngLat.lng,
          wrap: function () {
            var wrappedLng = this.lng;
            while (wrappedLng > 180) wrappedLng -= 360;
            while (wrappedLng < -180) wrappedLng += 360;
            return { lat: this.lat, lng: wrappedLng };
          }
        };
      };


      // Wrap getCenter to return Leaflet-compatible LatLng
      var originalGetCenter = nativeMap.getCenter.bind(nativeMap);
      nativeMap.getCenter = function () {
        var center = originalGetCenter();
        return {
          lat: center.lat,
          lng: center.lng,
          wrap: function () {
            var wrappedLng = this.lng;
            while (wrappedLng > 180) wrappedLng -= 360;
            while (wrappedLng < -180) wrappedLng += 360;
            return { lat: this.lat, lng: wrappedLng };
          }
        };
      };

      // Implement getSize (Leaflet API) — returns container dimensions as {x, y}
      nativeMap.getSize = function () {
        var containerEl = nativeMap.getContainer();
        return createCompatPoint(containerEl.offsetWidth, containerEl.offsetHeight);
      };

      // Wrap getBounds to return Leaflet-compatible LatLngBounds
      var originalGetBounds = nativeMap.getBounds.bind(nativeMap);
      nativeMap.getBounds = function () {
        var bounds = originalGetBounds();
        var south = bounds.getSouth();
        var north = bounds.getNorth();
        var west = bounds.getWest();
        var east = bounds.getEast();
        return {
          _southWest: { lat: south, lng: west },
          _northEast: { lat: north, lng: east },
          getSouth: function () { return south; },
          getNorth: function () { return north; },
          getWest: function () { return west; },
          getEast: function () { return east; },
          getSouthWest: function () { return this._southWest; },
          getNorthEast: function () { return this._northEast; },
          getNorthWest: function () { return { lat: this._northEast.lat, lng: this._southWest.lng }; },
          getSouthEast: function () { return { lat: this._southWest.lat, lng: this._northEast.lng }; },
          getCenter: function () {
            return {
              lat: (this._southWest.lat + this._northEast.lat) / 2,
              lng: (this._southWest.lng + this._northEast.lng) / 2
            };
          },
          contains: function (latlng) {
            var lat = latlng.lat !== undefined ? latlng.lat : latlng[0];
            var lng = latlng.lng !== undefined ? latlng.lng : latlng[1];
            return lat >= this._southWest.lat && lat <= this._northEast.lat &&
                   lng >= this._southWest.lng && lng <= this._northEast.lng;
          },
          extend: function (latlng) {
            var lat = latlng.lat !== undefined ? latlng.lat : latlng[0];
            var lng = latlng.lng !== undefined ? latlng.lng : latlng[1];
            this._southWest.lat = Math.min(this._southWest.lat, lat);
            this._southWest.lng = Math.min(this._southWest.lng, lng);
            this._northEast.lat = Math.max(this._northEast.lat, lat);
            this._northEast.lng = Math.max(this._northEast.lng, lng);
            return this;
          },
          pad: function (bufferRatio) {
            var sw = this._southWest;
            var ne = this._northEast;
            var heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio;
            var widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;
            return {
              _southWest: { lat: sw.lat - heightBuffer, lng: sw.lng - widthBuffer },
              _northEast: { lat: ne.lat + heightBuffer, lng: ne.lng + widthBuffer },
              getSouth: function () { return this._southWest.lat; },
              getNorth: function () { return this._northEast.lat; },
              getWest: function () { return this._southWest.lng; },
              getEast: function () { return this._northEast.lng; }
            };
          },
          toBBoxString: function () {
            return this._southWest.lng + ',' + this._southWest.lat + ',' +
                   this._northEast.lng + ',' + this._northEast.lat;
          }
        };
      };
    }

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
