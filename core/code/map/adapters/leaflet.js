/* global IITC, L -- eslint */

/**
 * @file Leaflet adapter implementing the IMapRenderer interface.
 * Wraps L.map to provide the common IITC map interface.
 * @module map/adapters/leaflet
 */

/**
 * @namespace IITC.map.adapters
 * @description Map renderer adapters for different mapping libraries.
 */
IITC.map.adapters = IITC.map.adapters || {};

(function () {
  'use strict';

  /**
   * Leaflet adapter implementing IITC.map.IMapRenderer.
   * Wraps an L.map instance to provide the common interface.
   *
   * @class LeafletAdapter
   * @memberof IITC.map.adapters
   * @implements {IITC.map.IMapRenderer}
   */
  function LeafletAdapter() {
    /**
     * The native Leaflet map instance.
     * @type {L.Map|null}
     * @private
     */
    this._map = null;

    /**
     * The map container element.
     * @type {HTMLElement|null}
     * @private
     */
    this._container = null;
  }

  // ==================== Lifecycle ====================

  /**
   * Initialize the Leaflet map.
   *
   * @param {string|HTMLElement} container - Container element ID or element
   * @param {Object} options - Map options
   * @returns {L.Map} The native Leaflet map
   */
  LeafletAdapter.prototype.initialize = function (container, options) {
    options = options || {};

    // Handle container
    if (typeof container === 'string') {
      this._container = document.getElementById(container);
    } else {
      this._container = container;
    }

    // Create the Leaflet map with provided options
    this._map = L.map(container, options);

    return this._map;
  };

  /**
   * Destroy the map and clean up.
   */
  LeafletAdapter.prototype.destroy = function () {
    if (this._map) {
      this._map.remove();
      this._map = null;
    }
  };

  // ==================== View Control ====================

  /**
   * Get the current map center.
   * @returns {{lat: number, lng: number}}
   */
  LeafletAdapter.prototype.getCenter = function () {
    var center = this._map.getCenter();
    return { lat: center.lat, lng: center.lng };
  };

  /**
   * Set the map center.
   * @param {{lat: number, lng: number}|Array} latlng
   * @returns {this}
   */
  LeafletAdapter.prototype.setCenter = function (latlng) {
    var ll = this._toLeafletLatLng(latlng);
    this._map.setView(ll, this._map.getZoom());
    return this;
  };

  /**
   * Get the current zoom level.
   * @returns {number}
   */
  LeafletAdapter.prototype.getZoom = function () {
    return this._map.getZoom();
  };

  /**
   * Set the zoom level.
   * @param {number} zoom
   * @param {Object} [options]
   * @returns {this}
   */
  LeafletAdapter.prototype.setZoom = function (zoom, options) {
    this._map.setZoom(zoom, options);
    return this;
  };

  /**
   * Set center and zoom.
   * @param {{lat: number, lng: number}|Array} latlng
   * @param {number} zoom
   * @param {Object} [options]
   * @returns {this}
   */
  LeafletAdapter.prototype.setView = function (latlng, zoom, options) {
    var ll = this._toLeafletLatLng(latlng);
    this._map.setView(ll, zoom, options);
    return this;
  };

  /**
   * Get the current map bounds.
   * @returns {L.LatLngBounds}
   */
  LeafletAdapter.prototype.getBounds = function () {
    return this._map.getBounds();
  };

  /**
   * Fit the map to bounds.
   * @param {Object|Array} bounds
   * @param {Object} [options]
   * @returns {this}
   */
  LeafletAdapter.prototype.fitBounds = function (bounds, options) {
    var b = this._toLeafletBounds(bounds);
    this._map.fitBounds(b, options);
    return this;
  };

  /**
   * Set the maximum bounds.
   * @param {Array} bounds
   * @returns {this}
   */
  LeafletAdapter.prototype.setMaxBounds = function (bounds) {
    var b = this._toLeafletBounds(bounds);
    this._map.setMaxBounds(b);
    return this;
  };

  /**
   * Pan the map by pixel offset.
   * @param {Array} offset - [x, y]
   * @param {Object} [options]
   * @returns {this}
   */
  LeafletAdapter.prototype.panBy = function (offset, options) {
    this._map.panBy(offset, options);
    return this;
  };

  /**
   * Invalidate size and recalculate.
   * @param {Object} [options]
   * @returns {this}
   */
  LeafletAdapter.prototype.invalidateSize = function (options) {
    this._map.invalidateSize(options);
    return this;
  };

  // ==================== Coordinate Conversion ====================

  /**
   * Convert lat/lng to container point.
   * @param {{lat: number, lng: number}} latlng
   * @returns {{x: number, y: number}}
   */
  LeafletAdapter.prototype.latLngToContainerPoint = function (latlng) {
    var ll = this._toLeafletLatLng(latlng);
    var point = this._map.latLngToContainerPoint(ll);
    return { x: point.x, y: point.y };
  };

  /**
   * Convert container point to lat/lng.
   * @param {{x: number, y: number}} point
   * @returns {{lat: number, lng: number}}
   */
  LeafletAdapter.prototype.containerPointToLatLng = function (point) {
    var p = L.point(point.x, point.y);
    var ll = this._map.containerPointToLatLng(p);
    return { lat: ll.lat, lng: ll.lng };
  };

  /**
   * Project lat/lng to world coordinates.
   * @param {{lat: number, lng: number}} latlng
   * @param {number} [zoom]
   * @returns {{x: number, y: number}}
   */
  LeafletAdapter.prototype.project = function (latlng, zoom) {
    var ll = this._toLeafletLatLng(latlng);
    var point = this._map.project(ll, zoom);
    return { x: point.x, y: point.y };
  };

  /**
   * Unproject world coordinates to lat/lng.
   * @param {{x: number, y: number}} point
   * @param {number} [zoom]
   * @returns {{lat: number, lng: number}}
   */
  LeafletAdapter.prototype.unproject = function (point, zoom) {
    var p = L.point(point.x, point.y);
    var ll = this._map.unproject(p, zoom);
    return { lat: ll.lat, lng: ll.lng };
  };

  /**
   * Calculate distance between two points.
   * Uses the map's CRS distance calculation (with S2 Earth radius).
   * @param {{lat: number, lng: number}} latlng1
   * @param {{lat: number, lng: number}} latlng2
   * @returns {number} Distance in meters
   */
  LeafletAdapter.prototype.distance = function (latlng1, latlng2) {
    var ll1 = this._toLeafletLatLng(latlng1);
    var ll2 = this._toLeafletLatLng(latlng2);
    return this._map.distance(ll1, ll2);
  };

  // ==================== Layers ====================

  /**
   * Add a layer to the map.
   * @param {Object} layer
   * @returns {this}
   */
  LeafletAdapter.prototype.addLayer = function (layer) {
    this._map.addLayer(layer);
    return this;
  };

  /**
   * Remove a layer from the map.
   * @param {Object} layer
   * @returns {this}
   */
  LeafletAdapter.prototype.removeLayer = function (layer) {
    this._map.removeLayer(layer);
    return this;
  };

  /**
   * Check if map has a layer.
   * @param {Object} layer
   * @returns {boolean}
   */
  LeafletAdapter.prototype.hasLayer = function (layer) {
    return this._map.hasLayer(layer);
  };

  /**
   * Iterate over all layers.
   * @param {Function} fn
   * @param {Object} [context]
   * @returns {this}
   */
  LeafletAdapter.prototype.eachLayer = function (fn, context) {
    this._map.eachLayer(fn, context);
    return this;
  };

  // ==================== Events ====================

  /**
   * Add an event listener.
   * @param {string} event
   * @param {Function} callback
   * @param {Object} [context]
   * @returns {this}
   */
  LeafletAdapter.prototype.on = function (event, callback, context) {
    this._map.on(event, callback, context);
    return this;
  };

  /**
   * Remove an event listener.
   * @param {string} event
   * @param {Function} [callback]
   * @param {Object} [context]
   * @returns {this}
   */
  LeafletAdapter.prototype.off = function (event, callback, context) {
    this._map.off(event, callback, context);
    return this;
  };

  /**
   * Add a one-time event listener.
   * @param {string} event
   * @param {Function} callback
   * @param {Object} [context]
   * @returns {this}
   */
  LeafletAdapter.prototype.once = function (event, callback, context) {
    this._map.once(event, callback, context);
    return this;
  };

  /**
   * Fire an event.
   * @param {string} event
   * @param {Object} [data]
   * @returns {this}
   */
  LeafletAdapter.prototype.fire = function (event, data) {
    this._map.fire(event, data);
    return this;
  };

  // ==================== Native Access ====================

  /**
   * Get the native Leaflet map instance.
   * @returns {L.Map}
   */
  LeafletAdapter.prototype.getNativeMap = function () {
    return this._map;
  };

  /**
   * Get the renderer type.
   * @returns {string}
   */
  LeafletAdapter.prototype.getRendererType = function () {
    return 'leaflet';
  };

  // ==================== Map State ====================

  /**
   * Get the map container element.
   * @returns {HTMLElement}
   */
  LeafletAdapter.prototype.getContainer = function () {
    return this._map.getContainer();
  };

  /**
   * Get the map size.
   * @returns {{x: number, y: number}}
   */
  LeafletAdapter.prototype.getSize = function () {
    var size = this._map.getSize();
    return { x: size.x, y: size.y };
  };

  /**
   * Get pixel bounds.
   * @returns {Object}
   */
  LeafletAdapter.prototype.getPixelBounds = function () {
    return this._map.getPixelBounds();
  };

  /**
   * Locate user position.
   * @param {Object} [options]
   * @returns {this}
   */
  LeafletAdapter.prototype.locate = function (options) {
    this._map.locate(options);
    return this;
  };

  // ==================== Leaflet-specific passthrough ====================

  /**
   * Get the attribution control (Leaflet-specific).
   * @returns {L.Control.Attribution}
   */
  LeafletAdapter.prototype.getAttributionControl = function () {
    return this._map.attributionControl;
  };

  /**
   * Access control corners (Leaflet-specific).
   * @returns {Object}
   */
  LeafletAdapter.prototype.getControlCorners = function () {
    return this._map._controlCorners;
  };

  /**
   * Get map options (Leaflet-specific).
   * @returns {Object}
   */
  LeafletAdapter.prototype.getOptions = function () {
    return this._map.options;
  };

  // ==================== Private Helpers ====================

  /**
   * Convert to Leaflet LatLng.
   * @private
   * @param {Object|Array} latlng
   * @returns {L.LatLng}
   */
  LeafletAdapter.prototype._toLeafletLatLng = function (latlng) {
    if (latlng instanceof L.LatLng) {
      return latlng;
    }
    if (Array.isArray(latlng)) {
      return new L.LatLng(latlng[0], latlng[1]);
    }
    return new L.LatLng(latlng.lat, latlng.lng);
  };

  /**
   * Convert to Leaflet LatLngBounds.
   * @private
   * @param {Object|Array} bounds
   * @returns {L.LatLngBounds}
   */
  LeafletAdapter.prototype._toLeafletBounds = function (bounds) {
    if (bounds instanceof L.LatLngBounds) {
      return bounds;
    }
    if (Array.isArray(bounds)) {
      return new L.LatLngBounds(bounds);
    }
    // Assume {north, south, east, west} format
    return new L.LatLngBounds([
      [bounds.south, bounds.west],
      [bounds.north, bounds.east],
    ]);
  };

  // Export
  IITC.map.adapters.LeafletAdapter = LeafletAdapter;
})();
