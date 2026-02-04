/* global IITC -- eslint */
/* eslint-disable no-unused-vars */

/**
 * @file Map renderer interface definitions for IITC-CE.
 * Defines the contracts that all map renderer adapters must implement.
 * Parameters in interface method stubs are intentionally unused - they document
 * the expected function signatures for implementations.
 * @module map/interfaces
 */

/**
 * @namespace IITC.map
 * @description Map abstraction layer providing a common interface for different map renderers.
 */
IITC.map = IITC.map || {};

/**
 * @namespace IITC.map.adapters
 * @description Map renderer adapters for different mapping libraries.
 */
IITC.map.adapters = IITC.map.adapters || {};

/**
 * @namespace IITC.map.layers
 * @description Layer implementations for different renderers.
 */
IITC.map.layers = IITC.map.layers || {};

/**
 * Interface definition for map renderers.
 * All map adapters (Leaflet, Mapbox, etc.) must implement these methods.
 *
 * @interface IMapRenderer
 * @memberof IITC.map
 *
 * @description
 * The IMapRenderer interface defines the contract for map rendering implementations.
 * Adapters wrap native map libraries (Leaflet, Mapbox GL JS) and expose a unified API.
 *
 * Methods are documented with their expected signatures and return types.
 * Implementations should handle library-specific details internally.
 */
IITC.map.IMapRenderer = {
  // ==================== Lifecycle ====================

  /**
   * Initialize the map in the given container.
   * @function initialize
   * @memberof IITC.map.IMapRenderer
   * @param {string|HTMLElement} container - Container element ID or element
   * @param {Object} options - Map initialization options
   * @param {Array<number>} [options.center=[0,0]] - Initial center [lat, lng]
   * @param {number} [options.zoom=1] - Initial zoom level
   * @param {number} [options.minZoom] - Minimum zoom level
   * @param {number} [options.maxZoom] - Maximum zoom level
   * @returns {void}
   */
  initialize: function (container, options) {},

  /**
   * Destroy the map and clean up resources.
   * @function destroy
   * @memberof IITC.map.IMapRenderer
   * @returns {void}
   */
  destroy: function () {},

  // ==================== View Control ====================

  /**
   * Get the current map center.
   * @function getCenter
   * @memberof IITC.map.IMapRenderer
   * @returns {{lat: number, lng: number}} Center coordinates
   */
  getCenter: function () {},

  /**
   * Set the map center.
   * @function setCenter
   * @memberof IITC.map.IMapRenderer
   * @param {{lat: number, lng: number}|Array<number>} latlng - New center
   * @returns {this}
   */
  setCenter: function (latlng) {},

  /**
   * Get the current zoom level.
   * @function getZoom
   * @memberof IITC.map.IMapRenderer
   * @returns {number} Current zoom level
   */
  getZoom: function () {},

  /**
   * Set the zoom level.
   * @function setZoom
   * @memberof IITC.map.IMapRenderer
   * @param {number} zoom - New zoom level
   * @param {Object} [options] - Zoom options
   * @returns {this}
   */
  setZoom: function (zoom, options) {},

  /**
   * Set both center and zoom level.
   * @function setView
   * @memberof IITC.map.IMapRenderer
   * @param {{lat: number, lng: number}|Array<number>} latlng - New center
   * @param {number} zoom - New zoom level
   * @param {Object} [options] - View options
   * @param {boolean} [options.animate=true] - Whether to animate the transition
   * @param {boolean} [options.reset=false] - Whether to reset the view
   * @returns {this}
   */
  setView: function (latlng, zoom, options) {},

  /**
   * Get the current map bounds.
   * @function getBounds
   * @memberof IITC.map.IMapRenderer
   * @returns {{north: number, south: number, east: number, west: number}} Bounds object
   */
  getBounds: function () {},

  /**
   * Fit the map view to the given bounds.
   * @function fitBounds
   * @memberof IITC.map.IMapRenderer
   * @param {{north: number, south: number, east: number, west: number}|Array} bounds - Bounds to fit
   * @param {Object} [options] - Fit options
   * @returns {this}
   */
  fitBounds: function (bounds, options) {},

  /**
   * Set the maximum bounds for the map.
   * @function setMaxBounds
   * @memberof IITC.map.IMapRenderer
   * @param {Array} bounds - Maximum bounds [[south, west], [north, east]]
   * @returns {this}
   */
  setMaxBounds: function (bounds) {},

  /**
   * Pan the map by a given offset.
   * @function panBy
   * @memberof IITC.map.IMapRenderer
   * @param {Array<number>} offset - [x, y] offset in pixels
   * @param {Object} [options] - Pan options
   * @returns {this}
   */
  panBy: function (offset, options) {},

  /**
   * Invalidate the map size and recalculate dimensions.
   * @function invalidateSize
   * @memberof IITC.map.IMapRenderer
   * @param {Object} [options] - Options
   * @returns {this}
   */
  invalidateSize: function (options) {},

  // ==================== Coordinate Conversion ====================

  /**
   * Convert a lat/lng to a container point.
   * @function latLngToContainerPoint
   * @memberof IITC.map.IMapRenderer
   * @param {{lat: number, lng: number}} latlng - Coordinates to convert
   * @returns {{x: number, y: number}} Container point
   */
  latLngToContainerPoint: function (latlng) {},

  /**
   * Convert a container point to lat/lng.
   * @function containerPointToLatLng
   * @memberof IITC.map.IMapRenderer
   * @param {{x: number, y: number}} point - Point to convert
   * @returns {{lat: number, lng: number}} Coordinates
   */
  containerPointToLatLng: function (point) {},

  /**
   * Project lat/lng to world coordinates.
   * @function project
   * @memberof IITC.map.IMapRenderer
   * @param {{lat: number, lng: number}} latlng - Coordinates to project
   * @param {number} [zoom] - Zoom level for projection
   * @returns {{x: number, y: number}} Projected point
   */
  project: function (latlng, zoom) {},

  /**
   * Unproject world coordinates to lat/lng.
   * @function unproject
   * @memberof IITC.map.IMapRenderer
   * @param {{x: number, y: number}} point - Point to unproject
   * @param {number} [zoom] - Zoom level for unprojection
   * @returns {{lat: number, lng: number}} Coordinates
   */
  unproject: function (point, zoom) {},

  /**
   * Calculate distance between two points using S2 Earth radius.
   * @function distance
   * @memberof IITC.map.IMapRenderer
   * @param {{lat: number, lng: number}} latlng1 - First point
   * @param {{lat: number, lng: number}} latlng2 - Second point
   * @returns {number} Distance in meters
   */
  distance: function (latlng1, latlng2) {},

  // ==================== Layers ====================

  /**
   * Add a layer to the map.
   * @function addLayer
   * @memberof IITC.map.IMapRenderer
   * @param {Object} layer - Layer to add
   * @returns {this}
   */
  addLayer: function (layer) {},

  /**
   * Remove a layer from the map.
   * @function removeLayer
   * @memberof IITC.map.IMapRenderer
   * @param {Object} layer - Layer to remove
   * @returns {this}
   */
  removeLayer: function (layer) {},

  /**
   * Check if a layer is on the map.
   * @function hasLayer
   * @memberof IITC.map.IMapRenderer
   * @param {Object} layer - Layer to check
   * @returns {boolean} True if layer is on the map
   */
  hasLayer: function (layer) {},

  /**
   * Iterate over all layers.
   * @function eachLayer
   * @memberof IITC.map.IMapRenderer
   * @param {Function} fn - Callback function(layer)
   * @param {Object} [context] - Callback context
   * @returns {this}
   */
  eachLayer: function (fn, context) {},

  // ==================== Events ====================

  /**
   * Add an event listener.
   * @function on
   * @memberof IITC.map.IMapRenderer
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @param {Object} [context] - Handler context
   * @returns {this}
   */
  on: function (event, callback, context) {},

  /**
   * Remove an event listener.
   * @function off
   * @memberof IITC.map.IMapRenderer
   * @param {string} event - Event name
   * @param {Function} [callback] - Event handler to remove
   * @param {Object} [context] - Handler context
   * @returns {this}
   */
  off: function (event, callback, context) {},

  /**
   * Add a one-time event listener.
   * @function once
   * @memberof IITC.map.IMapRenderer
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @param {Object} [context] - Handler context
   * @returns {this}
   */
  once: function (event, callback, context) {},

  /**
   * Fire an event.
   * @function fire
   * @memberof IITC.map.IMapRenderer
   * @param {string} event - Event name
   * @param {Object} [data] - Event data
   * @returns {this}
   */
  fire: function (event, data) {},

  // ==================== Native Access ====================

  /**
   * Get the native map instance (L.map or mapboxgl.Map).
   * @function getNativeMap
   * @memberof IITC.map.IMapRenderer
   * @returns {Object} Native map instance
   */
  getNativeMap: function () {},

  /**
   * Get the renderer type identifier.
   * @function getRendererType
   * @memberof IITC.map.IMapRenderer
   * @returns {string} 'leaflet' | 'mapbox'
   */
  getRendererType: function () {},

  // ==================== Map State ====================

  /**
   * Get the map container element.
   * @function getContainer
   * @memberof IITC.map.IMapRenderer
   * @returns {HTMLElement} Map container
   */
  getContainer: function () {},

  /**
   * Get the size of the map container.
   * @function getSize
   * @memberof IITC.map.IMapRenderer
   * @returns {{x: number, y: number}} Container size
   */
  getSize: function () {},

  /**
   * Get the pixel bounds of the map view.
   * @function getPixelBounds
   * @memberof IITC.map.IMapRenderer
   * @returns {Object} Pixel bounds
   */
  getPixelBounds: function () {},

  /**
   * Locate the user's position.
   * @function locate
   * @memberof IITC.map.IMapRenderer
   * @param {Object} [options] - Locate options
   * @param {boolean} [options.setView=false] - Set view to location
   * @returns {this}
   */
  locate: function (options) {},
};

/**
 * Interface definition for layer factories.
 * Creates map elements (markers, shapes) appropriate for the current renderer.
 *
 * @interface ILayerFactory
 * @memberof IITC.map
 *
 * @description
 * The ILayerFactory interface defines methods for creating map layers and shapes.
 * Each renderer implementation provides its own factory that creates native layer types.
 */
IITC.map.ILayerFactory = {
  // ==================== Markers ====================

  /**
   * Create a portal marker.
   * @function createPortalMarker
   * @memberof IITC.map.ILayerFactory
   * @param {{lat: number, lng: number}} latlng - Portal location
   * @param {Object} data - Portal data
   * @returns {Object} Portal marker instance
   */
  createPortalMarker: function (latlng, data) {},

  /**
   * Create a generic marker.
   * @function createMarker
   * @memberof IITC.map.ILayerFactory
   * @param {{lat: number, lng: number}} latlng - Marker location
   * @param {Object} [options] - Marker options
   * @returns {Object} Marker instance
   */
  createMarker: function (latlng, options) {},

  /**
   * Create a circle marker.
   * @function createCircleMarker
   * @memberof IITC.map.ILayerFactory
   * @param {{lat: number, lng: number}} latlng - Marker location
   * @param {Object} [options] - Circle marker options
   * @param {number} [options.radius=10] - Radius in pixels
   * @returns {Object} Circle marker instance
   */
  createCircleMarker: function (latlng, options) {},

  // ==================== Shapes ====================

  /**
   * Create a polyline.
   * @function createPolyline
   * @memberof IITC.map.ILayerFactory
   * @param {Array} latlngs - Array of [lat, lng] or {lat, lng} points
   * @param {Object} [options] - Polyline options
   * @returns {Object} Polyline instance
   */
  createPolyline: function (latlngs, options) {},

  /**
   * Create a polygon.
   * @function createPolygon
   * @memberof IITC.map.ILayerFactory
   * @param {Array} latlngs - Array of [lat, lng] or {lat, lng} points
   * @param {Object} [options] - Polygon options
   * @returns {Object} Polygon instance
   */
  createPolygon: function (latlngs, options) {},

  /**
   * Create a circle.
   * @function createCircle
   * @memberof IITC.map.ILayerFactory
   * @param {{lat: number, lng: number}} latlng - Center location
   * @param {Object} [options] - Circle options
   * @param {number} options.radius - Radius in meters
   * @returns {Object} Circle instance
   */
  createCircle: function (latlng, options) {},

  /**
   * Create a rectangle.
   * @function createRectangle
   * @memberof IITC.map.ILayerFactory
   * @param {Array} bounds - [[south, west], [north, east]]
   * @param {Object} [options] - Rectangle options
   * @returns {Object} Rectangle instance
   */
  createRectangle: function (bounds, options) {},

  // ==================== Geodesic Shapes ====================

  /**
   * Create a geodesic polyline (great circle path).
   * @function createGeodesicPolyline
   * @memberof IITC.map.ILayerFactory
   * @param {Array} latlngs - Array of [lat, lng] or {lat, lng} points
   * @param {Object} [options] - Polyline options
   * @returns {Object} Geodesic polyline instance
   */
  createGeodesicPolyline: function (latlngs, options) {},

  /**
   * Create a geodesic polygon.
   * @function createGeodesicPolygon
   * @memberof IITC.map.ILayerFactory
   * @param {Array} latlngs - Array of [lat, lng] or {lat, lng} points
   * @param {Object} [options] - Polygon options
   * @returns {Object} Geodesic polygon instance
   */
  createGeodesicPolygon: function (latlngs, options) {},

  /**
   * Create a geodesic circle.
   * @function createGeodesicCircle
   * @memberof IITC.map.ILayerFactory
   * @param {{lat: number, lng: number}} latlng - Center location
   * @param {number|Object} radius - Radius in meters or options with radius
   * @param {Object} [options] - Circle options
   * @returns {Object} Geodesic circle instance
   */
  createGeodesicCircle: function (latlng, radius, options) {},

  // ==================== Layer Groups ====================

  /**
   * Create a layer group.
   * @function createLayerGroup
   * @memberof IITC.map.ILayerFactory
   * @param {Array} [layers] - Initial layers
   * @param {Object} [options] - Layer group options
   * @returns {Object} Layer group instance
   */
  createLayerGroup: function (layers, options) {},

  /**
   * Create a feature group (layer group with events).
   * @function createFeatureGroup
   * @memberof IITC.map.ILayerFactory
   * @param {Array} [layers] - Initial layers
   * @param {Object} [options] - Feature group options
   * @returns {Object} Feature group instance
   */
  createFeatureGroup: function (layers, options) {},

  /**
   * Create a GeoJSON layer.
   * @function createGeoJSON
   * @memberof IITC.map.ILayerFactory
   * @param {Object} [geojson] - GeoJSON data
   * @param {Object} [options] - GeoJSON layer options
   * @returns {Object} GeoJSON layer instance
   */
  createGeoJSON: function (geojson, options) {},

  // ==================== Tile Layers ====================

  /**
   * Create a tile layer.
   * @function createTileLayer
   * @memberof IITC.map.ILayerFactory
   * @param {string} url - Tile URL template
   * @param {Object} [options] - Tile layer options
   * @returns {Object} Tile layer instance
   */
  createTileLayer: function (url, options) {},

  // ==================== Popups and Tooltips ====================

  /**
   * Create a popup.
   * @function createPopup
   * @memberof IITC.map.ILayerFactory
   * @param {Object} [options] - Popup options
   * @param {Object} [source] - Source layer
   * @returns {Object} Popup instance
   */
  createPopup: function (options, source) {},

  /**
   * Create a tooltip.
   * @function createTooltip
   * @memberof IITC.map.ILayerFactory
   * @param {Object} [options] - Tooltip options
   * @param {Object} [source] - Source layer
   * @returns {Object} Tooltip instance
   */
  createTooltip: function (options, source) {},
};

/**
 * Interface for layer objects.
 * All layers created by ILayerFactory should support these methods.
 *
 * @interface ILayer
 * @memberof IITC.map
 */
IITC.map.ILayer = {
  /**
   * Add this layer to a map.
   * @function addTo
   * @memberof IITC.map.ILayer
   * @param {Object} map - Map to add to
   * @returns {this}
   */
  addTo: function (map) {},

  /**
   * Remove this layer from its parent map.
   * @function remove
   * @memberof IITC.map.ILayer
   * @returns {this}
   */
  remove: function () {},

  /**
   * Get the layer's lat/lng(s).
   * @function getLatLng
   * @memberof IITC.map.ILayer
   * @returns {Object|Array} LatLng or array of LatLngs
   */
  getLatLng: function () {},

  /**
   * Set the layer's lat/lng(s).
   * @function setLatLng
   * @memberof IITC.map.ILayer
   * @param {Object|Array} latlng - New position(s)
   * @returns {this}
   */
  setLatLng: function (latlng) {},

  /**
   * Get layer options.
   * @type {Object}
   * @memberof IITC.map.ILayer
   */
  options: {},

  /**
   * Set layer style.
   * @function setStyle
   * @memberof IITC.map.ILayer
   * @param {Object} style - Style options
   * @returns {this}
   */
  setStyle: function (style) {},

  /**
   * Bind a popup to the layer.
   * @function bindPopup
   * @memberof IITC.map.ILayer
   * @param {string|HTMLElement|Function} content - Popup content
   * @param {Object} [options] - Popup options
   * @returns {this}
   */
  bindPopup: function (content, options) {},

  /**
   * Bind a tooltip to the layer.
   * @function bindTooltip
   * @memberof IITC.map.ILayer
   * @param {string|HTMLElement|Function} content - Tooltip content
   * @param {Object} [options] - Tooltip options
   * @returns {this}
   */
  bindTooltip: function (content, options) {},

  /**
   * Bring layer to front.
   * @function bringToFront
   * @memberof IITC.map.ILayer
   * @returns {this}
   */
  bringToFront: function () {},

  /**
   * Bring layer to back.
   * @function bringToBack
   * @memberof IITC.map.ILayer
   * @returns {this}
   */
  bringToBack: function () {},

  /**
   * Add event listener.
   * @function on
   * @memberof IITC.map.ILayer
   * @param {string} event - Event name
   * @param {Function} callback - Handler
   * @returns {this}
   */
  on: function (event, callback) {},

  /**
   * Remove event listener.
   * @function off
   * @memberof IITC.map.ILayer
   * @param {string} event - Event name
   * @param {Function} [callback] - Handler
   * @returns {this}
   */
  off: function (event, callback) {},
};

/**
 * Standard event names used across all renderers.
 * Adapters should map native events to these names.
 *
 * @constant
 * @memberof IITC.map
 */
IITC.map.Events = {
  // View events
  MOVE_START: 'movestart',
  MOVE: 'move',
  MOVE_END: 'moveend',
  ZOOM_START: 'zoomstart',
  ZOOM: 'zoom',
  ZOOM_END: 'zoomend',
  RESIZE: 'resize',

  // Interaction events
  CLICK: 'click',
  DBLCLICK: 'dblclick',
  CONTEXTMENU: 'contextmenu',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  MOUSEOVER: 'mouseover',
  MOUSEOUT: 'mouseout',
  MOUSEMOVE: 'mousemove',

  // Layer events
  LAYER_ADD: 'layeradd',
  LAYER_REMOVE: 'layerremove',
  BASE_LAYER_CHANGE: 'baselayerchange',
  OVERLAY_ADD: 'overlayadd',
  OVERLAY_REMOVE: 'overlayremove',

  // Location events
  LOCATION_FOUND: 'locationfound',
  LOCATION_ERROR: 'locationerror',
};

/**
 * Common constants used by map renderers.
 *
 * @constant
 * @memberof IITC.map
 */
IITC.map.Constants = {
  /**
   * Earth radius in meters, matching S2 geometry library.
   * @see https://github.com/google/s2-geometry-library-java
   * @type {number}
   */
  EARTH_RADIUS: 6367000.0,

  /**
   * Default renderer type.
   * @type {string}
   */
  DEFAULT_RENDERER: 'leaflet',
};
