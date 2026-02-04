/* global IITC, L -- eslint */

/**
 * @file Leaflet layer factory implementing the ILayerFactory interface.
 * Creates Leaflet-specific layer types for use with the map abstraction.
 * @module map/layers/leaflet/factory
 */

IITC.map.layers = IITC.map.layers || {};
IITC.map.layers.leaflet = IITC.map.layers.leaflet || {};

(function () {
  'use strict';

  /**
   * Leaflet layer factory implementing IITC.map.ILayerFactory.
   * Creates native Leaflet layers for all shape and layer types.
   *
   * @class LeafletLayerFactory
   * @memberof IITC.map.layers.leaflet
   * @implements {IITC.map.ILayerFactory}
   */
  function LeafletLayerFactory() {}

  // ==================== Markers ====================

  /**
   * Create a portal marker.
   * Uses window.createMarker for compatibility, which delegates to L.PortalMarker.
   * @param {L.LatLng|Object} latlng - Portal location
   * @param {Object} data - Portal data
   * @returns {L.PortalMarker}
   */
  LeafletLayerFactory.prototype.createPortalMarker = function (latlng, data) {
    // Use window.createMarker if available (defined in portal_marker.js)
    // This ensures compatibility and allows plugins to override marker creation
    if (typeof window.createMarker === 'function') {
      return window.createMarker(latlng, data);
    }
    // Fallback to direct L.PortalMarker construction
    return new L.PortalMarker(latlng, data);
  };

  /**
   * Create a generic marker.
   * @param {L.LatLng|Object} latlng - Marker location
   * @param {Object} [options] - Marker options
   * @returns {L.Marker}
   */
  LeafletLayerFactory.prototype.createMarker = function (latlng, options) {
    return new L.Marker(latlng, options);
  };

  /**
   * Create a circle marker.
   * @param {L.LatLng|Object} latlng - Marker location
   * @param {Object} [options] - Circle marker options
   * @returns {L.CircleMarker}
   */
  LeafletLayerFactory.prototype.createCircleMarker = function (latlng, options) {
    return new L.CircleMarker(latlng, options);
  };

  // ==================== Shapes ====================

  /**
   * Create a polyline.
   * @param {Array} latlngs - Array of points
   * @param {Object} [options] - Polyline options
   * @returns {L.Polyline}
   */
  LeafletLayerFactory.prototype.createPolyline = function (latlngs, options) {
    return new L.Polyline(latlngs, options);
  };

  /**
   * Create a polygon.
   * @param {Array} latlngs - Array of points
   * @param {Object} [options] - Polygon options
   * @returns {L.Polygon}
   */
  LeafletLayerFactory.prototype.createPolygon = function (latlngs, options) {
    return new L.Polygon(latlngs, options);
  };

  /**
   * Create a circle.
   * @param {L.LatLng|Object} latlng - Center location
   * @param {Object} [options] - Circle options (must include radius)
   * @returns {L.Circle}
   */
  LeafletLayerFactory.prototype.createCircle = function (latlng, options) {
    return new L.Circle(latlng, options);
  };

  /**
   * Create a rectangle.
   * @param {Array} bounds - [[south, west], [north, east]]
   * @param {Object} [options] - Rectangle options
   * @returns {L.Rectangle}
   */
  LeafletLayerFactory.prototype.createRectangle = function (bounds, options) {
    return new L.Rectangle(bounds, options);
  };

  // ==================== Geodesic Shapes ====================

  /**
   * Create a geodesic polyline.
   * @param {Array} latlngs - Array of points
   * @param {Object} [options] - Polyline options
   * @returns {L.GeodesicPolyline}
   */
  LeafletLayerFactory.prototype.createGeodesicPolyline = function (latlngs, options) {
    return L.geodesicPolyline(latlngs, options);
  };

  /**
   * Create a geodesic polygon.
   * @param {Array} latlngs - Array of points
   * @param {Object} [options] - Polygon options
   * @returns {L.GeodesicPolygon}
   */
  LeafletLayerFactory.prototype.createGeodesicPolygon = function (latlngs, options) {
    return L.geodesicPolygon(latlngs, options);
  };

  /**
   * Create a geodesic circle.
   * @param {L.LatLng|Object} latlng - Center location
   * @param {number|Object} radius - Radius in meters or options with radius
   * @param {Object} [options] - Circle options
   * @returns {L.GeodesicCircle}
   */
  LeafletLayerFactory.prototype.createGeodesicCircle = function (latlng, radius, options) {
    return L.geodesicCircle(latlng, radius, options);
  };

  // ==================== Layer Groups ====================

  /**
   * Create a layer group.
   * @param {Array} [layers] - Initial layers
   * @param {Object} [options] - Layer group options
   * @returns {L.LayerGroup}
   */
  LeafletLayerFactory.prototype.createLayerGroup = function (layers, options) {
    return new L.LayerGroup(layers, options);
  };

  /**
   * Create a feature group.
   * @param {Array} [layers] - Initial layers
   * @param {Object} [options] - Feature group options
   * @returns {L.FeatureGroup}
   */
  LeafletLayerFactory.prototype.createFeatureGroup = function (layers, options) {
    return new L.FeatureGroup(layers, options);
  };

  /**
   * Create a GeoJSON layer.
   * @param {Object} [geojson] - GeoJSON data
   * @param {Object} [options] - GeoJSON layer options
   * @returns {L.GeoJSON}
   */
  LeafletLayerFactory.prototype.createGeoJSON = function (geojson, options) {
    return new L.GeoJSON(geojson, options);
  };

  // ==================== Tile Layers ====================

  /**
   * Create a tile layer.
   * @param {string} url - Tile URL template
   * @param {Object} [options] - Tile layer options
   * @returns {L.TileLayer}
   */
  LeafletLayerFactory.prototype.createTileLayer = function (url, options) {
    return new L.TileLayer(url, options);
  };

  // ==================== Popups and Tooltips ====================

  /**
   * Create a popup.
   * @param {Object} [options] - Popup options
   * @param {Object} [source] - Source layer
   * @returns {L.Popup}
   */
  LeafletLayerFactory.prototype.createPopup = function (options, source) {
    return new L.Popup(options, source);
  };

  /**
   * Create a tooltip.
   * @param {Object} [options] - Tooltip options
   * @param {Object} [source] - Source layer
   * @returns {L.Tooltip}
   */
  LeafletLayerFactory.prototype.createTooltip = function (options, source) {
    return new L.Tooltip(options, source);
  };

  // ==================== Utility Methods ====================

  /**
   * Create a LatLng object.
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {L.LatLng}
   */
  LeafletLayerFactory.prototype.createLatLng = function (lat, lng) {
    return new L.LatLng(lat, lng);
  };

  /**
   * Create a LatLngBounds object.
   * @param {Array} corner1 - First corner
   * @param {Array} [corner2] - Second corner
   * @returns {L.LatLngBounds}
   */
  LeafletLayerFactory.prototype.createLatLngBounds = function (corner1, corner2) {
    return new L.LatLngBounds(corner1, corner2);
  };

  /**
   * Create a point.
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {L.Point}
   */
  LeafletLayerFactory.prototype.createPoint = function (x, y) {
    return new L.Point(x, y);
  };

  /**
   * Create a bounds object.
   * @param {Array} corner1 - First corner
   * @param {Array} [corner2] - Second corner
   * @returns {L.Bounds}
   */
  LeafletLayerFactory.prototype.createBounds = function (corner1, corner2) {
    return new L.Bounds(corner1, corner2);
  };

  /**
   * Create a divIcon.
   * @param {Object} options - Icon options
   * @returns {L.DivIcon}
   */
  LeafletLayerFactory.prototype.createDivIcon = function (options) {
    return new L.DivIcon(options);
  };

  /**
   * Create an icon.
   * @param {Object} options - Icon options
   * @returns {L.Icon}
   */
  LeafletLayerFactory.prototype.createIcon = function (options) {
    return new L.Icon(options);
  };

  // Export
  IITC.map.layers.leaflet.LayerFactory = LeafletLayerFactory;

  // Create singleton instance
  IITC.map.layers.leaflet.factory = new LeafletLayerFactory();
})();
