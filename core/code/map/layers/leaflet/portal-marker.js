/* global IITC, L -- eslint */

/**
 * @file Leaflet portal marker re-export for the map abstraction layer.
 *
 * This module re-exports L.PortalMarker (defined in core/code/portal_marker.js)
 * for use with the IITC.map abstraction layer. It provides a reference to the
 * existing implementation while allowing future renderer-specific implementations.
 *
 * The actual L.PortalMarker implementation remains in portal_marker.js for
 * backward compatibility with existing plugins that reference it directly.
 *
 * @module map/layers/leaflet/portal-marker
 */

/**
 * @namespace IITC.map.layers
 * @description Layer implementations for different map renderers.
 */
IITC.map.layers = IITC.map.layers || {};
IITC.map.layers.leaflet = IITC.map.layers.leaflet || {};

(function () {
  'use strict';

  /**
   * Reference to L.PortalMarker for the abstraction layer.
   * The actual class is defined in core/code/portal_marker.js and loaded later.
   *
   * This getter ensures we always get the current L.PortalMarker even if it's
   * defined after this module loads.
   *
   * @memberof IITC.map.layers.leaflet
   * @type {Function}
   */
  Object.defineProperty(IITC.map.layers.leaflet, 'PortalMarker', {
    get: function () {
      return L.PortalMarker;
    },
    configurable: true,
  });

  /**
   * Portal marker constants - these are available immediately.
   * Mirrors L.PortalMarker.portalBaseStyle, L.PortalMarker.placeholderStyle, etc.
   *
   * @memberof IITC.map.layers.leaflet
   */
  IITC.map.layers.leaflet.PortalMarkerConstants = {
    /**
     * Base style for all portal markers.
     */
    portalBaseStyle: {
      stroke: true,
      opacity: 1,
      fill: true,
      fillOpacity: 0.5,
      interactive: true,
    },

    /**
     * Style modifications for placeholder portals.
     */
    placeholderStyle: {
      dashArray: '1,2',
      weight: 1,
    },

    /**
     * Stroke weight by portal level (0-8).
     */
    LEVEL_TO_WEIGHT: [2, 2, 2, 2, 2, 3, 3, 4, 4],

    /**
     * Radius in pixels by portal level (0-8).
     */
    LEVEL_TO_RADIUS: [7, 7, 7, 7, 8, 8, 9, 10, 11],
  };
})();
