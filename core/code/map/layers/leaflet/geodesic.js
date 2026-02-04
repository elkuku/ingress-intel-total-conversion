/* global IITC, L -- eslint */

/**
 * @file Leaflet geodesic shapes implementation.
 * Wraps the existing L.Geodesic* classes for the map abstraction layer.
 * @module map/layers/leaflet/geodesic
 */

IITC.map.layers = IITC.map.layers || {};
IITC.map.layers.leaflet = IITC.map.layers.leaflet || {};

(function () {
  'use strict';

  /**
   * Wrapper for L.GeodesicPolyline that integrates with IITC.geo calculations.
   * Uses the existing L.GeodesicPolyline implementation from L.Geodesic.js.
   *
   * @class GeodesicPolyline
   * @memberof IITC.map.layers.leaflet
   */
  IITC.map.layers.leaflet.GeodesicPolyline = L.GeodesicPolyline;

  /**
   * Wrapper for L.GeodesicPolygon.
   *
   * @class GeodesicPolygon
   * @memberof IITC.map.layers.leaflet
   */
  IITC.map.layers.leaflet.GeodesicPolygon = L.GeodesicPolygon;

  /**
   * Wrapper for L.GeodesicCircle.
   *
   * @class GeodesicCircle
   * @memberof IITC.map.layers.leaflet
   */
  IITC.map.layers.leaflet.GeodesicCircle = L.GeodesicCircle;

  /**
   * Factory functions for creating geodesic shapes.
   * These mirror the L.geodesic* functions but are namespaced under IITC.
   *
   * @memberof IITC.map.layers.leaflet
   */

  /**
   * Create a geodesic polyline.
   *
   * @function createGeodesicPolyline
   * @memberof IITC.map.layers.leaflet
   * @param {Array} latlngs - Array of LatLng points
   * @param {Object} [options] - Polyline options
   * @returns {L.GeodesicPolyline}
   */
  IITC.map.layers.leaflet.createGeodesicPolyline = function (latlngs, options) {
    return new L.GeodesicPolyline(latlngs, options);
  };

  /**
   * Create a geodesic polygon.
   *
   * @function createGeodesicPolygon
   * @memberof IITC.map.layers.leaflet
   * @param {Array} latlngs - Array of LatLng points
   * @param {Object} [options] - Polygon options
   * @returns {L.GeodesicPolygon}
   */
  IITC.map.layers.leaflet.createGeodesicPolygon = function (latlngs, options) {
    return new L.GeodesicPolygon(latlngs, options);
  };

  /**
   * Create a geodesic circle.
   *
   * @function createGeodesicCircle
   * @memberof IITC.map.layers.leaflet
   * @param {L.LatLng} latlng - Center point
   * @param {number|Object} radius - Radius in meters or options object with radius
   * @param {Object} [options] - Circle options
   * @returns {L.GeodesicCircle}
   */
  IITC.map.layers.leaflet.createGeodesicCircle = function (latlng, radius, options) {
    return new L.GeodesicCircle(latlng, radius, options);
  };
})();
