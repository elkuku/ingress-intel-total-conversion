/* global IITC -- eslint */

/**
 * @file Mapbox layer factory implementing the ILayerFactory interface.
 * Creates Mapbox-specific layer types for use with the map abstraction.
 * @module map/layers/mapbox/factory
 */

IITC.map.layers = IITC.map.layers || {};
IITC.map.layers.mapbox = IITC.map.layers.mapbox || {};

(function () {
  'use strict';

  /**
   * Mapbox layer factory implementing IITC.map.ILayerFactory.
   * Creates Mapbox GL JS layers for all shape and layer types.
   *
   * @class MapboxLayerFactory
   * @memberof IITC.map.layers.mapbox
   * @implements {IITC.map.ILayerFactory}
   */
  function MapboxLayerFactory() {}

  // ==================== Markers ====================

  /**
   * Create a portal marker.
   * Uses the Mapbox portal manager for efficient batch rendering.
   * @param {Object} latlng - Portal location
   * @param {Object} data - Portal data
   * @returns {IITC.map.layers.mapbox.PortalMarker}
   */
  MapboxLayerFactory.prototype.createPortalMarker = function (latlng, data) {
    return new IITC.map.layers.mapbox.PortalMarker(latlng, data);
  };

  /**
   * Create a generic marker.
   * @param {Object} latlng - Marker location
   * @param {Object} [options] - Marker options
   * @returns {IITC.map.layers.mapbox.Marker}
   */
  MapboxLayerFactory.prototype.createMarker = function (latlng, options) {
    return new IITC.map.layers.mapbox.Marker(latlng, options);
  };

  /**
   * Create a circle marker.
   * @param {Object} latlng - Marker location
   * @param {Object} [options] - Circle marker options
   * @returns {IITC.map.layers.mapbox.CircleMarker}
   */
  MapboxLayerFactory.prototype.createCircleMarker = function (latlng, options) {
    return new IITC.map.layers.mapbox.CircleMarker(latlng, options);
  };

  // ==================== Shapes ====================

  /**
   * Create a polyline.
   * @param {Array} latlngs - Array of points
   * @param {Object} [options] - Polyline options
   * @returns {IITC.map.layers.mapbox.Polyline}
   */
  MapboxLayerFactory.prototype.createPolyline = function (latlngs, options) {
    return new IITC.map.layers.mapbox.Polyline(latlngs, options);
  };

  /**
   * Create a polygon.
   * @param {Array} latlngs - Array of points
   * @param {Object} [options] - Polygon options
   * @returns {IITC.map.layers.mapbox.Polygon}
   */
  MapboxLayerFactory.prototype.createPolygon = function (latlngs, options) {
    return new IITC.map.layers.mapbox.Polygon(latlngs, options);
  };

  /**
   * Create a circle.
   * @param {Object} latlng - Center location
   * @param {Object} [options] - Circle options (must include radius)
   * @returns {IITC.map.layers.mapbox.Circle}
   */
  MapboxLayerFactory.prototype.createCircle = function (latlng, options) {
    return new IITC.map.layers.mapbox.Circle(latlng, options);
  };

  /**
   * Create a rectangle.
   * @param {Array} bounds - [[south, west], [north, east]]
   * @param {Object} [options] - Rectangle options
   * @returns {IITC.map.layers.mapbox.Rectangle}
   */
  MapboxLayerFactory.prototype.createRectangle = function (bounds, options) {
    return new IITC.map.layers.mapbox.Rectangle(bounds, options);
  };

  // ==================== Geodesic Shapes ====================

  /**
   * Create a geodesic polyline.
   * Uses IITC.geo for accurate great circle calculations.
   * @param {Array} latlngs - Array of points
   * @param {Object} [options] - Polyline options
   * @returns {IITC.map.layers.mapbox.GeodesicPolyline}
   */
  MapboxLayerFactory.prototype.createGeodesicPolyline = function (latlngs, options) {
    return new IITC.map.layers.mapbox.GeodesicPolyline(latlngs, options);
  };

  /**
   * Create a geodesic polygon.
   * @param {Array} latlngs - Array of points
   * @param {Object} [options] - Polygon options
   * @returns {IITC.map.layers.mapbox.GeodesicPolygon}
   */
  MapboxLayerFactory.prototype.createGeodesicPolygon = function (latlngs, options) {
    return new IITC.map.layers.mapbox.GeodesicPolygon(latlngs, options);
  };

  /**
   * Create a geodesic circle.
   * @param {Object} latlng - Center location
   * @param {number|Object} radius - Radius in meters or options with radius
   * @param {Object} [options] - Circle options
   * @returns {IITC.map.layers.mapbox.GeodesicCircle}
   */
  MapboxLayerFactory.prototype.createGeodesicCircle = function (latlng, radius, options) {
    return new IITC.map.layers.mapbox.GeodesicCircle(latlng, radius, options);
  };

  // ==================== Layer Groups ====================

  /**
   * Create a layer group.
   * @param {Array} [layers] - Initial layers
   * @param {Object} [options] - Layer group options
   * @returns {IITC.map.layers.mapbox.LayerGroup}
   */
  MapboxLayerFactory.prototype.createLayerGroup = function (layers, options) {
    return new IITC.map.layers.mapbox.LayerGroup(layers, options);
  };

  /**
   * Create a feature group.
   * @param {Array} [layers] - Initial layers
   * @param {Object} [options] - Feature group options
   * @returns {IITC.map.layers.mapbox.FeatureGroup}
   */
  MapboxLayerFactory.prototype.createFeatureGroup = function (layers, options) {
    return new IITC.map.layers.mapbox.FeatureGroup(layers, options);
  };

  /**
   * Create a GeoJSON layer.
   * @param {Object} [geojson] - GeoJSON data
   * @param {Object} [options] - GeoJSON layer options
   * @returns {IITC.map.layers.mapbox.GeoJSON}
   */
  MapboxLayerFactory.prototype.createGeoJSON = function (geojson, options) {
    return new IITC.map.layers.mapbox.GeoJSON(geojson, options);
  };

  // ==================== Tile Layers ====================

  /**
   * Create a tile layer.
   * Converts Leaflet tile URL templates to Mapbox raster sources.
   * @param {string} url - Tile URL template
   * @param {Object} [options] - Tile layer options
   * @returns {IITC.map.layers.mapbox.TileLayer}
   */
  MapboxLayerFactory.prototype.createTileLayer = function (url, options) {
    return new IITC.map.layers.mapbox.TileLayer(url, options);
  };

  // ==================== Popups and Tooltips ====================

  /**
   * Create a popup.
   * @param {Object} [options] - Popup options
   * @param {Object} [source] - Source layer
   * @returns {IITC.map.layers.mapbox.Popup}
   */
  MapboxLayerFactory.prototype.createPopup = function (options, source) {
    return new IITC.map.layers.mapbox.Popup(options, source);
  };

  /**
   * Create a tooltip.
   * @param {Object} [options] - Tooltip options
   * @param {Object} [source] - Source layer
   * @returns {IITC.map.layers.mapbox.Tooltip}
   */
  MapboxLayerFactory.prototype.createTooltip = function (options, source) {
    return new IITC.map.layers.mapbox.Tooltip(options, source);
  };

  // ==================== Utility Methods ====================

  /**
   * Create a LatLng object.
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {IITC.map.layers.mapbox.LatLng}
   */
  MapboxLayerFactory.prototype.createLatLng = function (lat, lng) {
    return new IITC.map.layers.mapbox.LatLng(lat, lng);
  };

  /**
   * Create a LatLngBounds object.
   * @param {Array} corner1 - First corner
   * @param {Array} [corner2] - Second corner
   * @returns {IITC.map.layers.mapbox.LatLngBounds}
   */
  MapboxLayerFactory.prototype.createLatLngBounds = function (corner1, corner2) {
    return new IITC.map.layers.mapbox.LatLngBounds(corner1, corner2);
  };

  /**
   * Create a point.
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {IITC.map.layers.mapbox.Point}
   */
  MapboxLayerFactory.prototype.createPoint = function (x, y) {
    return new IITC.map.layers.mapbox.Point(x, y);
  };

  /**
   * Create a bounds object.
   * @param {Array} corner1 - First corner
   * @param {Array} [corner2] - Second corner
   * @returns {IITC.map.layers.mapbox.Bounds}
   */
  MapboxLayerFactory.prototype.createBounds = function (corner1, corner2) {
    return new IITC.map.layers.mapbox.Bounds(corner1, corner2);
  };

  /**
   * Create a divIcon.
   * @param {Object} options - Icon options
   * @returns {IITC.map.layers.mapbox.DivIcon}
   */
  MapboxLayerFactory.prototype.createDivIcon = function (options) {
    return new IITC.map.layers.mapbox.DivIcon(options);
  };

  /**
   * Create an icon.
   * @param {Object} options - Icon options
   * @returns {IITC.map.layers.mapbox.Icon}
   */
  MapboxLayerFactory.prototype.createIcon = function (options) {
    return new IITC.map.layers.mapbox.Icon(options);
  };

  // Export
  IITC.map.layers.mapbox.LayerFactory = MapboxLayerFactory;

  // Create singleton instance
  IITC.map.layers.mapbox.factory = new MapboxLayerFactory();
})();
