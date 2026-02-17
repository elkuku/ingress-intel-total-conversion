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

  // Use lazy getters to avoid referencing L before Leaflet is loaded.
  // Leaflet is included in boot.js which loads after this module in the build.
  Object.defineProperty(IITC.map.layers.leaflet, 'GeodesicPolyline', {
    get: function () { return L.GeodesicPolyline; },
    configurable: true,
  });

  Object.defineProperty(IITC.map.layers.leaflet, 'GeodesicPolygon', {
    get: function () { return L.GeodesicPolygon; },
    configurable: true,
  });

  Object.defineProperty(IITC.map.layers.leaflet, 'GeodesicCircle', {
    get: function () { return L.GeodesicCircle; },
    configurable: true,
  });

  IITC.map.layers.leaflet.createGeodesicPolyline = function (latlngs, options) {
    return new L.GeodesicPolyline(latlngs, options);
  };

  IITC.map.layers.leaflet.createGeodesicPolygon = function (latlngs, options) {
    return new L.GeodesicPolygon(latlngs, options);
  };

  IITC.map.layers.leaflet.createGeodesicCircle = function (latlng, radius, options) {
    return new L.GeodesicCircle(latlng, radius, options);
  };
})();
