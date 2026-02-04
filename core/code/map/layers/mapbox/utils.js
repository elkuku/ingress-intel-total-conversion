/* global IITC -- eslint */

/**
 * @file Mapbox GL JS utility classes.
 * Provides LatLng, LatLngBounds, Point, and Bounds classes for compatibility.
 * @module map/layers/mapbox/utils
 */

IITC.map.layers = IITC.map.layers || {};
IITC.map.layers.mapbox = IITC.map.layers.mapbox || {};

(function () {
  'use strict';

  // ==================== LatLng ====================

  /**
   * Mapbox LatLng implementation.
   * Provides a Leaflet-compatible LatLng class.
   *
   * @class MapboxLatLng
   * @memberof IITC.map.layers.mapbox
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} [alt] - Altitude
   */
  function MapboxLatLng(lat, lng, alt) {
    if (Array.isArray(lat)) {
      this.lat = lat[0];
      this.lng = lat[1];
      this.alt = lat[2];
    } else if (typeof lat === 'object') {
      this.lat = lat.lat;
      this.lng = lat.lng || lat.lon;
      this.alt = lat.alt;
    } else {
      this.lat = lat;
      this.lng = lng;
      this.alt = alt;
    }
  }

  /**
   * Check equality with another LatLng.
   * @param {Object} otherLatLng
   * @returns {boolean}
   */
  MapboxLatLng.prototype.equals = function (otherLatLng) {
    if (!otherLatLng) return false;
    var other = new MapboxLatLng(otherLatLng);
    return this.lat === other.lat && this.lng === other.lng;
  };

  /**
   * Get the distance to another LatLng.
   * @param {Object} otherLatLng
   * @returns {number} Distance in meters
   */
  MapboxLatLng.prototype.distanceTo = function (otherLatLng) {
    return IITC.geo.distance(this, otherLatLng);
  };

  /**
   * Wrap the longitude to [-180, 180].
   * @returns {MapboxLatLng}
   */
  MapboxLatLng.prototype.wrap = function () {
    return new MapboxLatLng(this.lat, IITC.geo.wrapLng(this.lng), this.alt);
  };

  /**
   * Clone this LatLng.
   * @returns {MapboxLatLng}
   */
  MapboxLatLng.prototype.clone = function () {
    return new MapboxLatLng(this.lat, this.lng, this.alt);
  };

  /**
   * Convert to string.
   * @returns {string}
   */
  MapboxLatLng.prototype.toString = function () {
    return 'LatLng(' + this.lat + ', ' + this.lng + ')';
  };

  /**
   * Convert to array.
   * @returns {Array}
   */
  MapboxLatLng.prototype.toArray = function () {
    return this.alt !== undefined ? [this.lat, this.lng, this.alt] : [this.lat, this.lng];
  };

  // ==================== LatLngBounds ====================

  /**
   * Mapbox LatLngBounds implementation.
   * Provides a Leaflet-compatible LatLngBounds class.
   *
   * @class MapboxLatLngBounds
   * @memberof IITC.map.layers.mapbox
   * @param {Object|Array} corner1 - First corner or array of corners
   * @param {Object|Array} [corner2] - Second corner
   */
  function MapboxLatLngBounds(corner1, corner2) {
    if (!corner1) {
      this._southWest = null;
      this._northEast = null;
      return;
    }

    if (Array.isArray(corner1)) {
      if (corner1.length === 2 && typeof corner1[0] === 'number') {
        // [lat, lng] format
        this._southWest = new MapboxLatLng(corner1);
        this._northEast = corner2 ? new MapboxLatLng(corner2) : new MapboxLatLng(corner1);
      } else {
        // Array of points
        this._southWest = null;
        this._northEast = null;
        var self = this;
        corner1.forEach(function (p) {
          self.extend(p);
        });
      }
    } else if (corner1._southWest) {
      // Another bounds object
      this._southWest = new MapboxLatLng(corner1._southWest);
      this._northEast = new MapboxLatLng(corner1._northEast);
    } else {
      this._southWest = new MapboxLatLng(corner1);
      this._northEast = corner2 ? new MapboxLatLng(corner2) : new MapboxLatLng(corner1);
    }
  }

  /**
   * Extend bounds to include a point or another bounds.
   * @param {Object} obj - LatLng or LatLngBounds
   * @returns {this}
   */
  MapboxLatLngBounds.prototype.extend = function (obj) {
    var sw = this._southWest;
    var ne = this._northEast;
    var sw2, ne2;

    if (obj._southWest) {
      // It's bounds
      sw2 = obj._southWest;
      ne2 = obj._northEast;
    } else {
      // It's a point
      sw2 = ne2 = new MapboxLatLng(obj);
    }

    if (!sw && !ne) {
      this._southWest = new MapboxLatLng(sw2.lat, sw2.lng);
      this._northEast = new MapboxLatLng(ne2.lat, ne2.lng);
    } else {
      sw.lat = Math.min(sw2.lat, sw.lat);
      sw.lng = Math.min(sw2.lng, sw.lng);
      ne.lat = Math.max(ne2.lat, ne.lat);
      ne.lng = Math.max(ne2.lng, ne.lng);
    }

    return this;
  };

  /**
   * Get the southwest corner.
   * @returns {MapboxLatLng}
   */
  MapboxLatLngBounds.prototype.getSouthWest = function () {
    return this._southWest;
  };

  /**
   * Get the northeast corner.
   * @returns {MapboxLatLng}
   */
  MapboxLatLngBounds.prototype.getNorthEast = function () {
    return this._northEast;
  };

  /**
   * Get the northwest corner.
   * @returns {MapboxLatLng}
   */
  MapboxLatLngBounds.prototype.getNorthWest = function () {
    return new MapboxLatLng(this.getNorth(), this.getWest());
  };

  /**
   * Get the southeast corner.
   * @returns {MapboxLatLng}
   */
  MapboxLatLngBounds.prototype.getSouthEast = function () {
    return new MapboxLatLng(this.getSouth(), this.getEast());
  };

  /**
   * Get the center.
   * @returns {MapboxLatLng}
   */
  MapboxLatLngBounds.prototype.getCenter = function () {
    return new MapboxLatLng((this._southWest.lat + this._northEast.lat) / 2, (this._southWest.lng + this._northEast.lng) / 2);
  };

  /**
   * Get the north latitude.
   * @returns {number}
   */
  MapboxLatLngBounds.prototype.getNorth = function () {
    return this._northEast.lat;
  };

  /**
   * Get the south latitude.
   * @returns {number}
   */
  MapboxLatLngBounds.prototype.getSouth = function () {
    return this._southWest.lat;
  };

  /**
   * Get the east longitude.
   * @returns {number}
   */
  MapboxLatLngBounds.prototype.getEast = function () {
    return this._northEast.lng;
  };

  /**
   * Get the west longitude.
   * @returns {number}
   */
  MapboxLatLngBounds.prototype.getWest = function () {
    return this._southWest.lng;
  };

  /**
   * Check if bounds contain a point.
   * @param {Object} latlng - Point to check
   * @returns {boolean}
   */
  MapboxLatLngBounds.prototype.contains = function (latlng) {
    var ll = new MapboxLatLng(latlng);
    var sw = this._southWest;
    var ne = this._northEast;

    return ll.lat >= sw.lat && ll.lat <= ne.lat && ll.lng >= sw.lng && ll.lng <= ne.lng;
  };

  /**
   * Check if bounds intersect another bounds.
   * @param {Object} bounds - Other bounds
   * @returns {boolean}
   */
  MapboxLatLngBounds.prototype.intersects = function (bounds) {
    var other = new MapboxLatLngBounds(bounds);
    var sw = this._southWest;
    var ne = this._northEast;
    var sw2 = other._southWest;
    var ne2 = other._northEast;

    return !(sw2.lat > ne.lat || ne2.lat < sw.lat || sw2.lng > ne.lng || ne2.lng < sw.lng);
  };

  /**
   * Check if bounds overlap another bounds.
   * @param {Object} bounds - Other bounds
   * @returns {boolean}
   */
  MapboxLatLngBounds.prototype.overlaps = function (bounds) {
    return this.intersects(bounds);
  };

  /**
   * Check if bounds are valid.
   * @returns {boolean}
   */
  MapboxLatLngBounds.prototype.isValid = function () {
    return !!(this._southWest && this._northEast);
  };

  /**
   * Pad the bounds.
   * @param {number} bufferRatio - Padding ratio
   * @returns {MapboxLatLngBounds}
   */
  MapboxLatLngBounds.prototype.pad = function (bufferRatio) {
    var sw = this._southWest;
    var ne = this._northEast;
    var latBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio;
    var lngBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;

    return new MapboxLatLngBounds(new MapboxLatLng(sw.lat - latBuffer, sw.lng - lngBuffer), new MapboxLatLng(ne.lat + latBuffer, ne.lng + lngBuffer));
  };

  /**
   * Check equality with another bounds.
   * @param {Object} otherBounds
   * @returns {boolean}
   */
  MapboxLatLngBounds.prototype.equals = function (otherBounds) {
    if (!otherBounds) return false;
    var other = new MapboxLatLngBounds(otherBounds);
    return this._southWest.equals(other._southWest) && this._northEast.equals(other._northEast);
  };

  /**
   * Convert to bounding box string.
   * @returns {string}
   */
  MapboxLatLngBounds.prototype.toBBoxString = function () {
    return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(',');
  };

  // ==================== Point ====================

  /**
   * Mapbox Point implementation.
   * Provides a Leaflet-compatible Point class for pixel coordinates.
   *
   * @class MapboxPoint
   * @memberof IITC.map.layers.mapbox
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {boolean} [round] - Whether to round values
   */
  function MapboxPoint(x, y, round) {
    if (Array.isArray(x)) {
      this.x = x[0];
      this.y = x[1];
    } else if (typeof x === 'object') {
      this.x = x.x;
      this.y = x.y;
    } else {
      this.x = x;
      this.y = y;
    }

    if (round) {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
    }
  }

  /**
   * Clone this point.
   * @returns {MapboxPoint}
   */
  MapboxPoint.prototype.clone = function () {
    return new MapboxPoint(this.x, this.y);
  };

  /**
   * Add another point.
   * @param {Object} point
   * @returns {MapboxPoint}
   */
  MapboxPoint.prototype.add = function (point) {
    var other = new MapboxPoint(point);
    return new MapboxPoint(this.x + other.x, this.y + other.y);
  };

  /**
   * Subtract another point.
   * @param {Object} point
   * @returns {MapboxPoint}
   */
  MapboxPoint.prototype.subtract = function (point) {
    var other = new MapboxPoint(point);
    return new MapboxPoint(this.x - other.x, this.y - other.y);
  };

  /**
   * Multiply by a number.
   * @param {number} num
   * @returns {MapboxPoint}
   */
  MapboxPoint.prototype.multiplyBy = function (num) {
    return new MapboxPoint(this.x * num, this.y * num);
  };

  /**
   * Divide by a number.
   * @param {number} num
   * @returns {MapboxPoint}
   */
  MapboxPoint.prototype.divideBy = function (num) {
    return new MapboxPoint(this.x / num, this.y / num);
  };

  /**
   * Get distance to another point.
   * @param {Object} point
   * @returns {number}
   */
  MapboxPoint.prototype.distanceTo = function (point) {
    var other = new MapboxPoint(point);
    var dx = other.x - this.x;
    var dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /**
   * Check equality.
   * @param {Object} point
   * @returns {boolean}
   */
  MapboxPoint.prototype.equals = function (point) {
    var other = new MapboxPoint(point);
    return this.x === other.x && this.y === other.y;
  };

  /**
   * Round the coordinates.
   * @returns {MapboxPoint}
   */
  MapboxPoint.prototype.round = function () {
    return new MapboxPoint(Math.round(this.x), Math.round(this.y));
  };

  /**
   * Floor the coordinates.
   * @returns {MapboxPoint}
   */
  MapboxPoint.prototype.floor = function () {
    return new MapboxPoint(Math.floor(this.x), Math.floor(this.y));
  };

  /**
   * Ceil the coordinates.
   * @returns {MapboxPoint}
   */
  MapboxPoint.prototype.ceil = function () {
    return new MapboxPoint(Math.ceil(this.x), Math.ceil(this.y));
  };

  /**
   * Convert to string.
   * @returns {string}
   */
  MapboxPoint.prototype.toString = function () {
    return 'Point(' + this.x + ', ' + this.y + ')';
  };

  // ==================== Bounds ====================

  /**
   * Mapbox Bounds implementation.
   * Provides a Leaflet-compatible Bounds class for pixel bounds.
   *
   * @class MapboxBounds
   * @memberof IITC.map.layers.mapbox
   * @param {Object|Array} corner1 - First corner
   * @param {Object|Array} [corner2] - Second corner
   */
  function MapboxBounds(corner1, corner2) {
    if (!corner1) {
      this.min = null;
      this.max = null;
      return;
    }

    var points = corner2 ? [corner1, corner2] : corner1;

    var self = this;
    this.min = null;
    this.max = null;

    if (Array.isArray(points)) {
      points.forEach(function (p) {
        self.extend(p);
      });
    } else {
      this.extend(corner1);
      if (corner2) this.extend(corner2);
    }
  }

  /**
   * Extend bounds to include a point.
   * @param {Object} point
   * @returns {this}
   */
  MapboxBounds.prototype.extend = function (point) {
    var p = new MapboxPoint(point);

    if (!this.min && !this.max) {
      this.min = p.clone();
      this.max = p.clone();
    } else {
      this.min.x = Math.min(p.x, this.min.x);
      this.min.y = Math.min(p.y, this.min.y);
      this.max.x = Math.max(p.x, this.max.x);
      this.max.y = Math.max(p.y, this.max.y);
    }

    return this;
  };

  /**
   * Get the center point.
   * @returns {MapboxPoint}
   */
  MapboxBounds.prototype.getCenter = function () {
    return new MapboxPoint((this.min.x + this.max.x) / 2, (this.min.y + this.max.y) / 2);
  };

  /**
   * Get the size.
   * @returns {MapboxPoint}
   */
  MapboxBounds.prototype.getSize = function () {
    return new MapboxPoint(this.max.x - this.min.x, this.max.y - this.min.y);
  };

  /**
   * Check if bounds contain a point.
   * @param {Object} point
   * @returns {boolean}
   */
  MapboxBounds.prototype.contains = function (point) {
    var p = new MapboxPoint(point);
    return p.x >= this.min.x && p.x <= this.max.x && p.y >= this.min.y && p.y <= this.max.y;
  };

  /**
   * Check if bounds intersect another bounds.
   * @param {Object} bounds
   * @returns {boolean}
   */
  MapboxBounds.prototype.intersects = function (bounds) {
    var other = new MapboxBounds(bounds);
    return !(other.min.x > this.max.x || other.max.x < this.min.x || other.min.y > this.max.y || other.max.y < this.min.y);
  };

  /**
   * Check if bounds are valid.
   * @returns {boolean}
   */
  MapboxBounds.prototype.isValid = function () {
    return !!(this.min && this.max);
  };

  // Export
  IITC.map.layers.mapbox.LatLng = MapboxLatLng;
  IITC.map.layers.mapbox.LatLngBounds = MapboxLatLngBounds;
  IITC.map.layers.mapbox.Point = MapboxPoint;
  IITC.map.layers.mapbox.Bounds = MapboxBounds;
})();
