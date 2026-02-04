/* global IITC -- eslint */

/**
 * @file Mapbox GL JS layer group implementation.
 * Provides LayerGroup and FeatureGroup for organizing layers.
 * @module map/layers/mapbox/layer-group
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
    return 'iitc-group-' + Math.random().toString(36).substr(2, 9);
  }

  // ==================== LayerGroup ====================

  /**
   * Mapbox layer group implementation.
   * Groups multiple layers for collective management.
   *
   * @class MapboxLayerGroup
   * @memberof IITC.map.layers.mapbox
   * @param {Array} [layers] - Initial layers
   * @param {Object} [options] - Group options
   */
  function MapboxLayerGroup(layers, options) {
    this._id = generateId();
    this._layers = new Map();
    this._map = null;
    this._eventListeners = new Map();
    this._layerIdCounter = 0;

    this.options = Object.assign({}, options);

    // Add initial layers
    if (layers && Array.isArray(layers)) {
      var self = this;
      layers.forEach(function (layer) {
        self.addLayer(layer);
      });
    }
  }

  /**
   * Add the group to a map.
   * @param {Object} map - Map adapter
   * @returns {this}
   */
  MapboxLayerGroup.prototype.addTo = function (map) {
    var adapter = map.getRendererType ? map : map._adapter;
    if (!adapter || adapter.getRendererType() !== 'mapbox') {
      return this;
    }

    this._map = adapter;

    // Add all existing layers to the map
    var self = this;
    this._layers.forEach(function (layer) {
      if (typeof layer.addTo === 'function') {
        layer.addTo(self._map);
      }
    });

    return this;
  };

  /**
   * Remove the group from the map.
   * @returns {this}
   */
  MapboxLayerGroup.prototype.remove = function () {
    if (this._map) {
      // Remove all layers from the map
      this._layers.forEach(function (layer) {
        if (typeof layer.remove === 'function') {
          layer.remove();
        }
      });
      this._map = null;
    }
    return this;
  };

  /**
   * Add a layer to the group.
   * @param {Object} layer - Layer to add
   * @returns {this}
   */
  MapboxLayerGroup.prototype.addLayer = function (layer) {
    var id = layer._iitcGroupId || ++this._layerIdCounter;
    layer._iitcGroupId = id;

    this._layers.set(id, layer);

    // If already on map, add the layer
    if (this._map && typeof layer.addTo === 'function') {
      layer.addTo(this._map);
    }

    this._fireEvent('layeradd', { layer: layer });
    return this;
  };

  /**
   * Remove a layer from the group.
   * @param {Object} layer - Layer to remove
   * @returns {this}
   */
  MapboxLayerGroup.prototype.removeLayer = function (layer) {
    var id;
    if (typeof layer === 'number' || typeof layer === 'string') {
      id = layer;
    } else {
      id = layer._iitcGroupId;
    }

    if (this._layers.has(id)) {
      var removedLayer = this._layers.get(id);
      this._layers.delete(id);

      if (typeof removedLayer.remove === 'function') {
        removedLayer.remove();
      }

      this._fireEvent('layerremove', { layer: removedLayer });
    }

    return this;
  };

  /**
   * Check if the group has a specific layer.
   * @param {Object} layer - Layer to check
   * @returns {boolean}
   */
  MapboxLayerGroup.prototype.hasLayer = function (layer) {
    var id = typeof layer === 'number' || typeof layer === 'string' ? layer : layer._iitcGroupId;
    return this._layers.has(id);
  };

  /**
   * Clear all layers from the group.
   * @returns {this}
   */
  MapboxLayerGroup.prototype.clearLayers = function () {
    var self = this;
    this._layers.forEach(function (layer, id) {
      if (typeof layer.remove === 'function') {
        layer.remove();
      }
      self._fireEvent('layerremove', { layer: layer });
    });
    this._layers.clear();
    return this;
  };

  /**
   * Get all layers in the group.
   * @returns {Array}
   */
  MapboxLayerGroup.prototype.getLayers = function () {
    return Array.from(this._layers.values());
  };

  /**
   * Invoke a method on each layer.
   * @param {string} methodName - Method name to invoke
   * @returns {this}
   */
  MapboxLayerGroup.prototype.invoke = function (methodName) {
    var args = Array.prototype.slice.call(arguments, 1);
    this._layers.forEach(function (layer) {
      if (typeof layer[methodName] === 'function') {
        layer[methodName].apply(layer, args);
      }
    });
    return this;
  };

  /**
   * Iterate over all layers.
   * @param {Function} fn - Callback function(layer)
   * @param {Object} [context] - Callback context
   * @returns {this}
   */
  MapboxLayerGroup.prototype.eachLayer = function (fn, context) {
    this._layers.forEach(function (layer) {
      fn.call(context, layer);
    });
    return this;
  };

  /**
   * Get a layer by ID.
   * @param {number|string} id - Layer ID
   * @returns {Object|undefined}
   */
  MapboxLayerGroup.prototype.getLayer = function (id) {
    return this._layers.get(id);
  };

  /**
   * Get the layer ID.
   * @param {Object} layer - Layer
   * @returns {number|undefined}
   */
  MapboxLayerGroup.prototype.getLayerId = function (layer) {
    return layer._iitcGroupId;
  };

  /**
   * Set style on all layers.
   * @param {Object} style - Style options
   * @returns {this}
   */
  MapboxLayerGroup.prototype.setStyle = function (style) {
    return this.invoke('setStyle', style);
  };

  /**
   * Fire an event to listeners.
   * @private
   */
  MapboxLayerGroup.prototype._fireEvent = function (event, data) {
    if (this._eventListeners.has(event)) {
      var self = this;
      this._eventListeners.get(event).forEach(function (cb) {
        cb.call(self, Object.assign({ type: event, target: self }, data));
      });
    }
  };

  /**
   * Add event listener.
   * @param {string} event - Event name
   * @param {Function} callback - Handler
   * @returns {this}
   */
  MapboxLayerGroup.prototype.on = function (event, callback) {
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
  MapboxLayerGroup.prototype.off = function (event, callback) {
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
   * Bring to front (invoke on all layers).
   * @returns {this}
   */
  MapboxLayerGroup.prototype.bringToFront = function () {
    return this.invoke('bringToFront');
  };

  /**
   * Bring to back (invoke on all layers).
   * @returns {this}
   */
  MapboxLayerGroup.prototype.bringToBack = function () {
    return this.invoke('bringToBack');
  };

  /**
   * Get the bounds of all layers.
   * @returns {Object|null}
   */
  MapboxLayerGroup.prototype.getBounds = function () {
    var minLat = Infinity,
      maxLat = -Infinity;
    var minLng = Infinity,
      maxLng = -Infinity;
    var hasData = false;

    this._layers.forEach(function (layer) {
      var bounds;
      if (typeof layer.getBounds === 'function') {
        bounds = layer.getBounds();
      } else if (typeof layer.getLatLng === 'function') {
        var ll = layer.getLatLng();
        bounds = {
          getSouthWest: function () {
            return ll;
          },
          getNorthEast: function () {
            return ll;
          },
        };
      }

      if (bounds) {
        hasData = true;
        var sw = bounds.getSouthWest();
        var ne = bounds.getNorthEast();
        if (sw.lat < minLat) minLat = sw.lat;
        if (ne.lat > maxLat) maxLat = ne.lat;
        if (sw.lng < minLng) minLng = sw.lng;
        if (ne.lng > maxLng) maxLng = ne.lng;
      }
    });

    if (!hasData) return null;

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

  // ==================== FeatureGroup ====================

  /**
   * Mapbox feature group implementation.
   * Like LayerGroup but with events and getBounds.
   *
   * @class MapboxFeatureGroup
   * @memberof IITC.map.layers.mapbox
   * @extends MapboxLayerGroup
   * @param {Array} [layers] - Initial layers
   * @param {Object} [options] - Group options
   */
  function MapboxFeatureGroup(layers, options) {
    MapboxLayerGroup.call(this, layers, options);
  }

  MapboxFeatureGroup.prototype = Object.create(MapboxLayerGroup.prototype);
  MapboxFeatureGroup.prototype.constructor = MapboxFeatureGroup;

  /**
   * Bind a popup to all layers in the group.
   * @param {string|HTMLElement|Function} content - Popup content
   * @param {Object} [options] - Popup options
   * @returns {this}
   */
  MapboxFeatureGroup.prototype.bindPopup = function (content, options) {
    return this.invoke('bindPopup', content, options);
  };

  /**
   * Unbind popup from all layers.
   * @returns {this}
   */
  MapboxFeatureGroup.prototype.unbindPopup = function () {
    return this.invoke('unbindPopup');
  };

  /**
   * Open popup at a specific location.
   * @param {Object} latlng - Location to open popup
   * @returns {this}
   */
  MapboxFeatureGroup.prototype.openPopup = function () {
    return this.invoke('openPopup');
  };

  /**
   * Close popup.
   * @returns {this}
   */
  MapboxFeatureGroup.prototype.closePopup = function () {
    return this.invoke('closePopup');
  };

  /**
   * Bind a tooltip to all layers in the group.
   * @param {string|HTMLElement|Function} content - Tooltip content
   * @param {Object} [options] - Tooltip options
   * @returns {this}
   */
  MapboxFeatureGroup.prototype.bindTooltip = function (content, options) {
    return this.invoke('bindTooltip', content, options);
  };

  /**
   * Unbind tooltip from all layers.
   * @returns {this}
   */
  MapboxFeatureGroup.prototype.unbindTooltip = function () {
    return this.invoke('unbindTooltip');
  };

  // ==================== GeoJSON Layer ====================

  /**
   * Mapbox GeoJSON layer implementation.
   * Renders GeoJSON data on the map.
   *
   * @class MapboxGeoJSON
   * @memberof IITC.map.layers.mapbox
   * @extends MapboxFeatureGroup
   * @param {Object} [geojson] - GeoJSON data
   * @param {Object} [options] - Layer options
   */
  function MapboxGeoJSON(geojson, options) {
    MapboxFeatureGroup.call(this, [], options);

    this._geojson = geojson;
    this._sourceId = null;
    this._fillLayerId = null;
    this._strokeLayerId = null;
    this._pointLayerId = null;

    this.options = Object.assign(
      {
        style: null,
        pointToLayer: null,
        onEachFeature: null,
        filter: null,
        color: '#3388ff',
        weight: 3,
        opacity: 1,
        fillColor: '#3388ff',
        fillOpacity: 0.2,
      },
      options
    );

    if (geojson) {
      this.addData(geojson);
    }
  }

  MapboxGeoJSON.prototype = Object.create(MapboxFeatureGroup.prototype);
  MapboxGeoJSON.prototype.constructor = MapboxGeoJSON;

  /**
   * Add GeoJSON data to the layer.
   * @param {Object} geojson - GeoJSON data
   * @returns {this}
   */
  MapboxGeoJSON.prototype.addData = function (geojson) {
    this._geojson = geojson;
    this._updateSource();
    return this;
  };

  /**
   * Add to map using a single GeoJSON source.
   * @param {Object} map - Map adapter
   * @returns {this}
   */
  MapboxGeoJSON.prototype.addTo = function (map) {
    var adapter = map.getRendererType ? map : map._adapter;
    if (!adapter || adapter.getRendererType() !== 'mapbox') {
      return this;
    }

    this._map = adapter;
    this._sourceId = generateId() + '-source';
    this._fillLayerId = generateId() + '-fill';
    this._strokeLayerId = generateId() + '-stroke';
    this._pointLayerId = generateId() + '-point';

    adapter.addSource(this._sourceId, {
      type: 'geojson',
      data: this._geojson || { type: 'FeatureCollection', features: [] },
    });

    // Add fill layer for polygons
    adapter.addMapboxLayer({
      id: this._fillLayerId,
      type: 'fill',
      source: this._sourceId,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'fill-color': this.options.fillColor,
        'fill-opacity': this.options.fillOpacity,
      },
    });

    // Add stroke layer for lines and polygon outlines
    adapter.addMapboxLayer({
      id: this._strokeLayerId,
      type: 'line',
      source: this._sourceId,
      filter: ['any', ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'Polygon']],
      paint: {
        'line-color': this.options.color,
        'line-width': this.options.weight,
        'line-opacity': this.options.opacity,
      },
    });

    // Add circle layer for points
    adapter.addMapboxLayer({
      id: this._pointLayerId,
      type: 'circle',
      source: this._sourceId,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 6,
        'circle-color': this.options.fillColor,
        'circle-stroke-color': this.options.color,
        'circle-stroke-width': this.options.weight,
      },
    });

    return this;
  };

  /**
   * Remove from map.
   * @returns {this}
   */
  MapboxGeoJSON.prototype.remove = function () {
    if (this._map) {
      this._map.removeMapboxLayer(this._fillLayerId);
      this._map.removeMapboxLayer(this._strokeLayerId);
      this._map.removeMapboxLayer(this._pointLayerId);
      this._map.removeSource(this._sourceId);
      this._map = null;
    }
    return this;
  };

  /**
   * Update the GeoJSON source.
   * @private
   */
  MapboxGeoJSON.prototype._updateSource = function () {
    if (this._map && this._sourceId) {
      var source = this._map.getSource(this._sourceId);
      if (source) {
        source.setData(this._geojson || { type: 'FeatureCollection', features: [] });
      }
    }
  };

  /**
   * Set the style of the GeoJSON layer.
   * @param {Object|Function} style - Style options or function
   * @returns {this}
   */
  MapboxGeoJSON.prototype.setStyle = function (style) {
    if (typeof style === 'function') {
      // Function style not fully supported, use static options
      return this;
    }

    Object.assign(this.options, style);

    if (this._map) {
      if (style.color !== undefined) {
        this._map.setPaintProperty(this._strokeLayerId, 'line-color', this.options.color);
        this._map.setPaintProperty(this._pointLayerId, 'circle-stroke-color', this.options.color);
      }
      if (style.weight !== undefined) {
        this._map.setPaintProperty(this._strokeLayerId, 'line-width', this.options.weight);
        this._map.setPaintProperty(this._pointLayerId, 'circle-stroke-width', this.options.weight);
      }
      if (style.opacity !== undefined) {
        this._map.setPaintProperty(this._strokeLayerId, 'line-opacity', this.options.opacity);
      }
      if (style.fillColor !== undefined) {
        this._map.setPaintProperty(this._fillLayerId, 'fill-color', this.options.fillColor);
        this._map.setPaintProperty(this._pointLayerId, 'circle-color', this.options.fillColor);
      }
      if (style.fillOpacity !== undefined) {
        this._map.setPaintProperty(this._fillLayerId, 'fill-opacity', this.options.fillOpacity);
      }
    }

    return this;
  };

  /**
   * Clear all GeoJSON data.
   * @returns {this}
   */
  MapboxGeoJSON.prototype.clearLayers = function () {
    this._geojson = { type: 'FeatureCollection', features: [] };
    this._updateSource();
    return this;
  };

  // Export
  IITC.map.layers.mapbox.LayerGroup = MapboxLayerGroup;
  IITC.map.layers.mapbox.FeatureGroup = MapboxFeatureGroup;
  IITC.map.layers.mapbox.GeoJSON = MapboxGeoJSON;
})();
