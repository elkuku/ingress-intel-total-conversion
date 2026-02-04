/* global IITC -- eslint */

/**
 * @file Mapbox GL JS tile layer implementation.
 * Provides raster tile layer support for compatibility with Leaflet tile URLs.
 * @module map/layers/mapbox/tile-layer
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
    return 'iitc-tile-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Convert Leaflet tile URL template to Mapbox format.
   * Leaflet: {s}.tile.openstreetmap.org/{z}/{x}/{y}.png
   * Mapbox: {s}.tile.openstreetmap.org/{z}/{x}/{y}.png (same, but subdomains handled differently)
   * @private
   */
  function convertTileUrl(url, subdomains) {
    // Handle {s} subdomain placeholder
    if (url.includes('{s}')) {
      // Mapbox expects array of URLs for subdomains
      if (!subdomains) {
        subdomains = ['a', 'b', 'c'];
      }
      return subdomains.map(function (s) {
        return url.replace('{s}', s);
      });
    }
    return [url];
  }

  /**
   * Mapbox raster tile layer implementation.
   * Wraps Mapbox raster source for compatibility with Leaflet tile URLs.
   *
   * @class MapboxTileLayer
   * @memberof IITC.map.layers.mapbox
   * @param {string} url - Tile URL template
   * @param {Object} [options] - Tile layer options
   */
  function MapboxTileLayer(url, options) {
    this._url = url;
    this._map = null;
    this._sourceId = null;
    this._layerId = null;

    this.options = Object.assign(
      {
        minZoom: 0,
        maxZoom: 22,
        tileSize: 256,
        attribution: null,
        opacity: 1,
        subdomains: ['a', 'b', 'c'],
        bounds: null,
      },
      options
    );
  }

  /**
   * Add the tile layer to a map.
   * @param {Object} map - Map adapter
   * @returns {this}
   */
  MapboxTileLayer.prototype.addTo = function (map) {
    var adapter = map.getRendererType ? map : map._adapter;
    if (!adapter || adapter.getRendererType() !== 'mapbox') {
      return this;
    }

    this._map = adapter;
    this._sourceId = generateId() + '-source';
    this._layerId = generateId() + '-layer';

    var tiles = convertTileUrl(this._url, this.options.subdomains);

    adapter.addSource(this._sourceId, {
      type: 'raster',
      tiles: tiles,
      tileSize: this.options.tileSize,
      minzoom: this.options.minZoom,
      maxzoom: this.options.maxZoom,
      attribution: this.options.attribution,
      bounds: this.options.bounds,
    });

    adapter.addMapboxLayer({
      id: this._layerId,
      type: 'raster',
      source: this._sourceId,
      paint: {
        'raster-opacity': this.options.opacity,
      },
    });

    return this;
  };

  /**
   * Remove the tile layer from the map.
   * @returns {this}
   */
  MapboxTileLayer.prototype.remove = function () {
    if (this._map) {
      this._map.removeMapboxLayer(this._layerId);
      this._map.removeSource(this._sourceId);
      this._map = null;
    }
    return this;
  };

  /**
   * Set the opacity of the tile layer.
   * @param {number} opacity - Opacity value (0-1)
   * @returns {this}
   */
  MapboxTileLayer.prototype.setOpacity = function (opacity) {
    this.options.opacity = opacity;
    if (this._map) {
      this._map.setPaintProperty(this._layerId, 'raster-opacity', opacity);
    }
    return this;
  };

  /**
   * Get the opacity of the tile layer.
   * @returns {number}
   */
  MapboxTileLayer.prototype.getOpacity = function () {
    return this.options.opacity;
  };

  /**
   * Set the URL of the tile layer.
   * @param {string} url - New tile URL template
   * @returns {this}
   */
  MapboxTileLayer.prototype.setUrl = function (url) {
    this._url = url;

    if (this._map) {
      // Need to remove and re-add source to change URL
      var opacity = this.options.opacity;
      this.remove();
      this._url = url;
      this.addTo(this._map);
      this.setOpacity(opacity);
    }

    return this;
  };

  /**
   * Bring layer to front.
   * @returns {this}
   */
  MapboxTileLayer.prototype.bringToFront = function () {
    // Would need to remove and re-add to change order
    return this;
  };

  /**
   * Bring layer to back.
   * @returns {this}
   */
  MapboxTileLayer.prototype.bringToBack = function () {
    return this;
  };

  /**
   * Get the tile URL.
   * @returns {string}
   */
  MapboxTileLayer.prototype.getUrl = function () {
    return this._url;
  };

  /**
   * Event stubs for compatibility.
   */
  MapboxTileLayer.prototype.on = function () {
    return this;
  };
  MapboxTileLayer.prototype.off = function () {
    return this;
  };

  // Export
  IITC.map.layers.mapbox.TileLayer = MapboxTileLayer;
})();
