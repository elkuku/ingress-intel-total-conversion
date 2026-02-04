/* global IITC -- eslint */

/**
 * @file Geodesic calculation utilities for IITC-CE.
 * Provides renderer-agnostic geodesic math for great circle paths and distances.
 * @module map/geo/geodesic-calc
 */

/**
 * @namespace IITC.geo
 * @description Geodesic calculation utilities using S2 Earth radius.
 */
IITC.geo = IITC.geo || {};

(function () {
  'use strict';

  // Constants
  var DEG_TO_RAD = Math.PI / 180.0;
  var RAD_TO_DEG = 180.0 / Math.PI;

  /**
   * Earth radius in meters, matching the S2 geometry library.
   * This value is used by Ingress for distance calculations.
   * @constant
   * @type {number}
   */
  IITC.geo.EARTH_RADIUS = 6367000.0;

  /**
   * Default number of segments per meter of geodesic line.
   * Higher values = smoother curves but more points.
   * @constant
   * @type {number}
   */
  IITC.geo.SEGMENTS_COEFF = 5000;

  /**
   * Minimum number of segments for geodesic circles.
   * @constant
   * @type {number}
   */
  IITC.geo.SEGMENTS_MIN = 48;

  /**
   * Circle segments coefficient for geodesic circles.
   * @constant
   * @type {number}
   */
  IITC.geo.CIRCLE_SEGMENTS_COEFF = 1000;

  /**
   * Normalize a LatLng-like object to {lat, lng} format.
   *
   * @function normalizeLatLng
   * @memberof IITC.geo
   * @param {Object|Array} latlng - LatLng as object, array [lat, lng], or Leaflet LatLng
   * @returns {{lat: number, lng: number}} Normalized LatLng object
   */
  IITC.geo.normalizeLatLng = function (latlng) {
    if (Array.isArray(latlng)) {
      return { lat: latlng[0], lng: latlng[1] };
    }
    return { lat: latlng.lat, lng: latlng.lng };
  };

  /**
   * Wrap longitude to [-180, 180] range.
   *
   * @function wrapLng
   * @memberof IITC.geo
   * @param {number} lng - Longitude to wrap
   * @returns {number} Wrapped longitude
   */
  IITC.geo.wrapLng = function (lng) {
    return ((((lng + 180) % 360) + 360) % 360) - 180;
  };

  /**
   * Wrap a LatLng object's longitude to [-180, 180] range.
   *
   * @function wrapLatLng
   * @memberof IITC.geo
   * @param {{lat: number, lng: number}} latlng - LatLng to wrap
   * @returns {{lat: number, lng: number}} Wrapped LatLng
   */
  IITC.geo.wrapLatLng = function (latlng) {
    return {
      lat: latlng.lat,
      lng: IITC.geo.wrapLng(latlng.lng),
    };
  };

  /**
   * Calculate the distance between two points using the Haversine formula.
   * Uses S2 Earth radius for Ingress-accurate results.
   *
   * @function distance
   * @memberof IITC.geo
   * @param {{lat: number, lng: number}} latlng1 - First point
   * @param {{lat: number, lng: number}} latlng2 - Second point
   * @returns {number} Distance in meters
   */
  IITC.geo.distance = function (latlng1, latlng2) {
    var p1 = IITC.geo.normalizeLatLng(latlng1);
    var p2 = IITC.geo.normalizeLatLng(latlng2);

    var lat1 = p1.lat * DEG_TO_RAD;
    var lat2 = p2.lat * DEG_TO_RAD;
    var dLat = (p2.lat - p1.lat) * DEG_TO_RAD;
    var dLng = (p2.lng - p1.lng) * DEG_TO_RAD;

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return IITC.geo.EARTH_RADIUS * c;
  };

  /**
   * Calculate the bearing from one point to another.
   *
   * @function bearing
   * @memberof IITC.geo
   * @param {{lat: number, lng: number}} latlng1 - Start point
   * @param {{lat: number, lng: number}} latlng2 - End point
   * @returns {number} Bearing in degrees (0-360)
   */
  IITC.geo.bearing = function (latlng1, latlng2) {
    var p1 = IITC.geo.normalizeLatLng(latlng1);
    var p2 = IITC.geo.normalizeLatLng(latlng2);

    var lat1 = p1.lat * DEG_TO_RAD;
    var lat2 = p2.lat * DEG_TO_RAD;
    var dLng = (p2.lng - p1.lng) * DEG_TO_RAD;

    var y = Math.sin(dLng) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    var bearing = Math.atan2(y, x) * RAD_TO_DEG;
    return (bearing + 360) % 360;
  };

  /**
   * Calculate a destination point given start, bearing, and distance.
   *
   * @function destination
   * @memberof IITC.geo
   * @param {{lat: number, lng: number}} latlng - Start point
   * @param {number} bearing - Bearing in degrees
   * @param {number} distance - Distance in meters
   * @returns {{lat: number, lng: number}} Destination point
   */
  IITC.geo.destination = function (latlng, bearing, distance) {
    var p = IITC.geo.normalizeLatLng(latlng);

    var lat1 = p.lat * DEG_TO_RAD;
    var lng1 = p.lng * DEG_TO_RAD;
    var brng = bearing * DEG_TO_RAD;
    var angularDist = distance / IITC.geo.EARTH_RADIUS;

    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDist) + Math.cos(lat1) * Math.sin(angularDist) * Math.cos(brng));

    var lng2 = lng1 + Math.atan2(Math.sin(brng) * Math.sin(angularDist) * Math.cos(lat1), Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2));

    return {
      lat: lat2 * RAD_TO_DEG,
      lng: lng2 * RAD_TO_DEG,
    };
  };

  /**
   * Calculate intermediate points along a geodesic line between two points.
   * This is the core calculation for geodesic polylines.
   *
   * Based on calculations from https://edwilliams.org/avform.htm#Int
   *
   * @function geodesicIntermediatePoints
   * @memberof IITC.geo
   * @param {{lat: number, lng: number}} start - Start point
   * @param {{lat: number, lng: number}} end - End point
   * @param {Object} [options] - Options
   * @param {number} [options.segmentsCoeff=5000] - Segments coefficient
   * @returns {Array<{lat: number, lng: number}>} Array of intermediate points (excluding start/end)
   */
  IITC.geo.geodesicIntermediatePoints = function (start, end, options) {
    options = options || {};
    var segmentsCoeff = options.segmentsCoeff || IITC.geo.SEGMENTS_COEFF;

    var p1 = IITC.geo.normalizeLatLng(start);
    var p2 = IITC.geo.normalizeLatLng(end);

    var lng1 = p1.lng * DEG_TO_RAD;
    var lng2 = p2.lng * DEG_TO_RAD;
    var dLng = lng1 - lng2;

    var segments = Math.floor(Math.abs((dLng * IITC.geo.EARTH_RADIUS) / segmentsCoeff));
    if (segments < 2) {
      return [];
    }

    // Pre-calculate constant values for the loop
    var lat1 = p1.lat * DEG_TO_RAD;
    var lat2 = p2.lat * DEG_TO_RAD;
    var sinLat1 = Math.sin(lat1);
    var sinLat2 = Math.sin(lat2);
    var cosLat1 = Math.cos(lat1);
    var cosLat2 = Math.cos(lat2);
    var sinLat1CosLat2 = sinLat1 * cosLat2;
    var sinLat2CosLat1 = sinLat2 * cosLat1;
    var cosLat1CosLat2SinDLng = cosLat1 * cosLat2 * Math.sin(dLng);

    var points = [];
    for (var i = 1; i < segments; i++) {
      var iLng = lng1 - dLng * (i / segments);
      var iLat = Math.atan((sinLat1CosLat2 * Math.sin(iLng - lng2) - sinLat2CosLat1 * Math.sin(iLng - lng1)) / cosLat1CosLat2SinDLng);

      points.push({
        lat: iLat * RAD_TO_DEG,
        lng: iLng * RAD_TO_DEG,
      });
    }

    return points;
  };

  /**
   * Convert an array of LatLngs to a geodesic path with intermediate points.
   * Handles anti-meridian crossing by offsetting coordinates.
   *
   * @function geodesicPath
   * @memberof IITC.geo
   * @param {Array} latlngs - Array of LatLng points
   * @param {Object} [options] - Options
   * @param {number} [options.segmentsCoeff=5000] - Segments coefficient
   * @param {boolean} [options.closed=false] - Whether the path is closed (polygon)
   * @returns {Array<{lat: number, lng: number}>} Geodesic path with intermediate points
   */
  IITC.geo.geodesicPath = function (latlngs, options) {
    options = options || {};

    if (latlngs.length === 0) {
      return [];
    }

    // Normalize all points
    var points = latlngs.map(IITC.geo.normalizeLatLng);

    // Offset coordinates to handle anti-meridian crossing
    var lngOffset = points[0].lng;

    // Wrap points relative to first point
    var offsetPoints = points.map(function (p) {
      return IITC.geo.wrapLatLng({
        lat: p.lat,
        lng: p.lng - lngOffset,
      });
    });

    // For closed paths (polygons), connect last point to first
    var workPoints = offsetPoints.slice();
    if (options.closed && workPoints.length > 0) {
      workPoints.push(workPoints[0]);
    }

    // Build result path
    var result = [];
    if (!options.closed && workPoints.length > 0) {
      result.push(workPoints[0]);
    }

    for (var i = 0; i < workPoints.length - 1; i++) {
      // Add intermediate points
      var intermediates = IITC.geo.geodesicIntermediatePoints(workPoints[i], workPoints[i + 1], options);
      result = result.concat(intermediates);
      result.push(workPoints[i + 1]);
    }

    // Remove offset
    result = result.map(function (p) {
      return {
        lat: p.lat,
        lng: p.lng + lngOffset,
      };
    });

    return result;
  };

  /**
   * Calculate points for a geodesic circle.
   *
   * @function geodesicCirclePoints
   * @memberof IITC.geo
   * @param {{lat: number, lng: number}} center - Center point
   * @param {number} radius - Radius in meters
   * @param {Object} [options] - Options
   * @param {number} [options.segmentsMin=48] - Minimum number of segments
   * @param {number} [options.segmentsCoeff=1000] - Segments coefficient
   * @returns {Array<{lat: number, lng: number}>} Array of points forming the circle
   */
  IITC.geo.geodesicCirclePoints = function (center, radius, options) {
    options = options || {};
    var segmentsMin = options.segmentsMin || IITC.geo.SEGMENTS_MIN;
    var segmentsCoeff = options.segmentsCoeff || IITC.geo.CIRCLE_SEGMENTS_COEFF;

    var c = IITC.geo.normalizeLatLng(center);

    // Circle radius as an angle from the centre of the earth
    var radRadius = radius / IITC.geo.EARTH_RADIUS;

    // Pre-calculate values
    var centreLat = c.lat * DEG_TO_RAD;
    var centreLng = c.lng * DEG_TO_RAD;

    var cosCentreLat = Math.cos(centreLat);
    var sinCentreLat = Math.sin(centreLat);

    var cosRadRadius = Math.cos(radRadius);
    var sinRadRadius = Math.sin(radRadius);

    var segments = Math.max(segmentsMin, Math.floor(radius / segmentsCoeff));
    var points = [];

    for (var i = 0; i < segments; i++) {
      var angle = ((Math.PI * 2) / segments) * i;

      var lat = Math.asin(sinCentreLat * cosRadRadius + cosCentreLat * sinRadRadius * Math.cos(angle));

      var lng = centreLng + Math.atan2(Math.sin(angle) * sinRadRadius * cosCentreLat, cosRadRadius - sinCentreLat * Math.sin(lat));

      points.push({
        lat: lat * RAD_TO_DEG,
        lng: lng * RAD_TO_DEG,
      });
    }

    return points;
  };

  /**
   * Calculate the midpoint between two points along a great circle path.
   *
   * @function midpoint
   * @memberof IITC.geo
   * @param {{lat: number, lng: number}} latlng1 - First point
   * @param {{lat: number, lng: number}} latlng2 - Second point
   * @returns {{lat: number, lng: number}} Midpoint
   */
  IITC.geo.midpoint = function (latlng1, latlng2) {
    var p1 = IITC.geo.normalizeLatLng(latlng1);
    var p2 = IITC.geo.normalizeLatLng(latlng2);

    var lat1 = p1.lat * DEG_TO_RAD;
    var lng1 = p1.lng * DEG_TO_RAD;
    var lat2 = p2.lat * DEG_TO_RAD;
    var dLng = (p2.lng - p1.lng) * DEG_TO_RAD;

    var Bx = Math.cos(lat2) * Math.cos(dLng);
    var By = Math.cos(lat2) * Math.sin(dLng);

    var lat3 = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By));

    var lng3 = lng1 + Math.atan2(By, Math.cos(lat1) + Bx);

    return {
      lat: lat3 * RAD_TO_DEG,
      lng: lng3 * RAD_TO_DEG,
    };
  };

  /**
   * Check if a point is inside a polygon using ray casting algorithm.
   * Works with geodesic polygons as well.
   *
   * @function pointInPolygon
   * @memberof IITC.geo
   * @param {{lat: number, lng: number}} point - Point to test
   * @param {Array} polygon - Array of polygon vertices
   * @returns {boolean} True if point is inside polygon
   */
  IITC.geo.pointInPolygon = function (point, polygon) {
    var p = IITC.geo.normalizeLatLng(point);
    var inside = false;

    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      var pi = IITC.geo.normalizeLatLng(polygon[i]);
      var pj = IITC.geo.normalizeLatLng(polygon[j]);

      if (pi.lng > p.lng !== pj.lng > p.lng && p.lat < ((pj.lat - pi.lat) * (p.lng - pi.lng)) / (pj.lng - pi.lng) + pi.lat) {
        inside = !inside;
      }
    }

    return inside;
  };

  /**
   * Calculate the area of a geodesic polygon in square meters.
   * Uses spherical excess formula.
   *
   * @function polygonArea
   * @memberof IITC.geo
   * @param {Array} polygon - Array of polygon vertices
   * @returns {number} Area in square meters
   */
  IITC.geo.polygonArea = function (polygon) {
    if (polygon.length < 3) {
      return 0;
    }

    var points = polygon.map(IITC.geo.normalizeLatLng);
    var sum = 0;

    for (var i = 0; i < points.length; i++) {
      var p1 = points[i];
      var p2 = points[(i + 1) % points.length];

      var lat1 = p1.lat * DEG_TO_RAD;
      var lat2 = p2.lat * DEG_TO_RAD;
      var dLng = (p2.lng - p1.lng) * DEG_TO_RAD;

      sum += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
    }

    return Math.abs((sum * IITC.geo.EARTH_RADIUS * IITC.geo.EARTH_RADIUS) / 2);
  };

  /**
   * Convert GeoJSON coordinates to LatLng format.
   *
   * @function geoJSONToLatLng
   * @memberof IITC.geo
   * @param {Array} coords - GeoJSON coordinates [lng, lat]
   * @returns {{lat: number, lng: number}} LatLng object
   */
  IITC.geo.geoJSONToLatLng = function (coords) {
    return { lat: coords[1], lng: coords[0] };
  };

  /**
   * Convert LatLng to GeoJSON coordinates format.
   *
   * @function latLngToGeoJSON
   * @memberof IITC.geo
   * @param {{lat: number, lng: number}} latlng - LatLng object
   * @returns {Array} GeoJSON coordinates [lng, lat]
   */
  IITC.geo.latLngToGeoJSON = function (latlng) {
    var p = IITC.geo.normalizeLatLng(latlng);
    return [p.lng, p.lat];
  };
})();
