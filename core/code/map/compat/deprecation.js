/* global IITC, L, log -- eslint */

/**
 * @file Deprecation warnings for legacy Leaflet factory functions.
 * Wraps global L.* functions with warnings directing authors to IITC.map.factory.*.
 * Warnings only fire in debug mode (development builds or localStorage['iitc-debug'] set).
 * Each call site only triggers a warning once to avoid console spam.
 * @module map/compat/deprecation
 */

IITC.map.compat = IITC.map.compat || {};

(function () {
  'use strict';

  /**
   * Set of call sites that have already been warned.
   * Keyed by "functionName|stackLine" to warn once per call site.
   * @private
   */
  var _warned = {};

  /**
   * Check if debug mode is active.
   * @private
   * @returns {boolean}
   */
  function _isDebug() {
    try {
      return !!(window.iitcBuildDate || localStorage.getItem('iitc-debug'));
    } catch (e) {
      return false;
    }
  }

  /**
   * Extract a call site identifier from the current stack trace.
   * @private
   * @returns {string} A string identifying the caller location
   */
  function _getCallSite() {
    var stack = new Error().stack || '';
    var lines = stack.split('\n');
    // Skip Error, _getCallSite, _emitWarning, wrapper — caller is ~4th line
    return lines[4] || 'unknown';
  }

  /**
   * Emit a deprecation warning if this call site hasn't been warned yet.
   * @private
   * @param {string} oldName - The deprecated function name
   * @param {string} newName - The recommended replacement
   */
  function _emitWarning(oldName, newName) {
    if (!_isDebug()) return;

    var callSite = oldName + '|' + _getCallSite();
    if (_warned[callSite]) return;
    _warned[callSite] = true;

    log.warn(
      '[IITC Deprecation] ' + oldName + '() is deprecated. ' +
      'Use ' + newName + '() instead. ' +
      'See core/code/map/MIGRATION.md for details.'
    );
  }

  /**
   * Mapping of legacy functions to their new equivalents.
   * Each entry: [object, methodName, newName, isConstructorStyle]
   * @private
   */
  var _deprecations = [
    ['geodesicPolyline', 'IITC.map.factory.createGeodesicPolyline'],
    ['geodesicPolygon', 'IITC.map.factory.createGeodesicPolygon'],
    ['geodesicCircle', 'IITC.map.factory.createGeodesicCircle'],
    ['circleMarker', 'IITC.map.factory.createCircleMarker'],
    ['polyline', 'IITC.map.factory.createPolyline'],
    ['polygon', 'IITC.map.factory.createPolygon'],
    ['layerGroup', 'IITC.map.factory.createLayerGroup'],
    ['featureGroup', 'IITC.map.factory.createFeatureGroup'],
  ];

  /**
   * Install deprecation wrappers on L.* factory functions.
   * Preserves original behavior while adding a one-time console warning per call site.
   *
   * @function deprecateFactory
   * @memberof IITC.map.compat
   */
  IITC.map.compat.deprecateFactory = function () {
    if (typeof L === 'undefined') return;

    _deprecations.forEach(function (entry) {
      var methodName = entry[0];
      var newName = entry[1];
      var original = L[methodName];

      if (typeof original !== 'function') return;

      L[methodName] = function () {
        _emitWarning('L.' + methodName, newName);
        return original.apply(L, arguments);
      };
    });
  };

  // Auto-install when loaded
  IITC.map.compat.deprecateFactory();
})();
