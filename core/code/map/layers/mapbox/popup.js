/* global IITC, mapboxgl -- eslint */

/**
 * @file Mapbox GL JS popup and tooltip implementation.
 * Wraps mapboxgl.Popup for compatibility with IITC.
 * @module map/layers/mapbox/popup
 */

IITC.map.layers = IITC.map.layers || {};
IITC.map.layers.mapbox = IITC.map.layers.mapbox || {};

(function () {
  'use strict';

  /**
   * Normalize a LatLng-like value.
   * @private
   */
  function normalizeLatLng(latlng) {
    if (Array.isArray(latlng)) {
      return { lat: latlng[0], lng: latlng[1] };
    }
    return { lat: latlng.lat, lng: latlng.lng };
  }

  // ==================== Popup ====================

  /**
   * Mapbox popup implementation.
   * Wraps mapboxgl.Popup for Leaflet-like API.
   *
   * @class MapboxPopup
   * @memberof IITC.map.layers.mapbox
   * @param {Object} [options] - Popup options
   * @param {Object} [source] - Source layer
   */
  function MapboxPopup(options, source) {
    this._latlng = null;
    this._content = '';
    this._map = null;
    this._popup = null;
    this._source = source;
    this._isOpen = false;
    this._eventListeners = new Map();

    this.options = Object.assign(
      {
        maxWidth: 300,
        minWidth: 50,
        maxHeight: null,
        autoPan: true,
        closeButton: true,
        closeOnClick: true,
        closeOnMove: false,
        autoClose: true,
        offset: [0, 0],
        className: '',
        anchor: 'bottom',
      },
      options
    );
  }

  /**
   * Set the geographic position of the popup.
   * @param {Object} latlng - Position
   * @returns {this}
   */
  MapboxPopup.prototype.setLatLng = function (latlng) {
    this._latlng = normalizeLatLng(latlng);
    if (this._popup) {
      this._popup.setLngLat([this._latlng.lng, this._latlng.lat]);
    }
    return this;
  };

  /**
   * Get the geographic position of the popup.
   * @returns {Object|null}
   */
  MapboxPopup.prototype.getLatLng = function () {
    return this._latlng;
  };

  /**
   * Set the HTML content of the popup.
   * @param {string|HTMLElement|Function} content - Content
   * @returns {this}
   */
  MapboxPopup.prototype.setContent = function (content) {
    if (typeof content === 'function') {
      this._content = content(this._source);
    } else {
      this._content = content;
    }

    if (this._popup) {
      if (typeof this._content === 'string') {
        this._popup.setHTML(this._content);
      } else if (this._content instanceof HTMLElement) {
        this._popup.setDOMContent(this._content);
      }
    }
    return this;
  };

  /**
   * Get the content of the popup.
   * @returns {string|HTMLElement}
   */
  MapboxPopup.prototype.getContent = function () {
    return this._content;
  };

  /**
   * Open the popup on the map.
   * @param {Object} map - Map adapter
   * @returns {this}
   */
  MapboxPopup.prototype.openOn = function (map) {
    var adapter = map.getRendererType ? map : map._adapter;
    if (!adapter || adapter.getRendererType() !== 'mapbox') {
      return this;
    }

    this._map = adapter;

    // Create the Mapbox popup
    var popupOptions = {
      closeButton: this.options.closeButton,
      closeOnClick: this.options.closeOnClick,
      closeOnMove: this.options.closeOnMove,
      maxWidth: this.options.maxWidth + 'px',
      anchor: this.options.anchor,
    };

    if (this.options.offset) {
      popupOptions.offset = this.options.offset;
    }

    if (this.options.className) {
      popupOptions.className = this.options.className;
    }

    this._popup = new mapboxgl.Popup(popupOptions);

    if (this._latlng) {
      this._popup.setLngLat([this._latlng.lng, this._latlng.lat]);
    }

    if (this._content) {
      if (typeof this._content === 'string') {
        this._popup.setHTML(this._content);
      } else if (this._content instanceof HTMLElement) {
        this._popup.setDOMContent(this._content);
      }
    }

    var self = this;
    this._popup.on('close', function () {
      self._isOpen = false;
      self._fireEvent('popupclose', {});
    });

    this._popup.addTo(adapter.getNativeMap());
    this._isOpen = true;
    this._fireEvent('popupopen', {});

    return this;
  };

  /**
   * Alias for openOn.
   */
  MapboxPopup.prototype.addTo = function (map) {
    return this.openOn(map);
  };

  /**
   * Remove the popup from the map.
   * @returns {this}
   */
  MapboxPopup.prototype.remove = function () {
    if (this._popup) {
      this._popup.remove();
      this._popup = null;
      this._isOpen = false;
    }
    return this;
  };

  /**
   * Close the popup.
   * @returns {this}
   */
  MapboxPopup.prototype.close = function () {
    return this.remove();
  };

  /**
   * Check if popup is open.
   * @returns {boolean}
   */
  MapboxPopup.prototype.isOpen = function () {
    return this._isOpen;
  };

  /**
   * Get the popup element.
   * @returns {HTMLElement|null}
   */
  MapboxPopup.prototype.getElement = function () {
    return this._popup ? this._popup.getElement() : null;
  };

  /**
   * Update the popup.
   * @returns {this}
   */
  MapboxPopup.prototype.update = function () {
    // Mapbox popups auto-update
    return this;
  };

  /**
   * Fire an event to listeners.
   * @private
   */
  MapboxPopup.prototype._fireEvent = function (event, data) {
    if (this._eventListeners.has(event)) {
      var self = this;
      this._eventListeners.get(event).forEach(function (cb) {
        cb.call(self, Object.assign({ type: event, target: self, popup: self }, data));
      });
    }
  };

  /**
   * Add event listener.
   */
  MapboxPopup.prototype.on = function (event, callback) {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event).add(callback);
    return this;
  };

  /**
   * Remove event listener.
   */
  MapboxPopup.prototype.off = function (event, callback) {
    if (this._eventListeners.has(event)) {
      if (callback) {
        this._eventListeners.get(event).delete(callback);
      } else {
        this._eventListeners.delete(event);
      }
    }
    return this;
  };

  /**
   * Bring popup to front.
   * @returns {this}
   */
  MapboxPopup.prototype.bringToFront = function () {
    return this;
  };

  /**
   * Bring popup to back.
   * @returns {this}
   */
  MapboxPopup.prototype.bringToBack = function () {
    return this;
  };

  // ==================== Tooltip ====================

  /**
   * Mapbox tooltip implementation.
   * Uses Mapbox Popup with different styling and behavior.
   *
   * @class MapboxTooltip
   * @memberof IITC.map.layers.mapbox
   * @param {Object} [options] - Tooltip options
   * @param {Object} [source] - Source layer
   */
  function MapboxTooltip(options, source) {
    MapboxPopup.call(this, options, source);

    // Override defaults for tooltip behavior
    this.options = Object.assign(this.options, {
      closeButton: false,
      closeOnClick: false,
      className: 'mapbox-tooltip ' + (options && options.className ? options.className : ''),
      permanent: false,
      sticky: false,
      direction: 'auto',
      opacity: 0.9,
    });
  }

  MapboxTooltip.prototype = Object.create(MapboxPopup.prototype);
  MapboxTooltip.prototype.constructor = MapboxTooltip;

  // Export
  IITC.map.layers.mapbox.Popup = MapboxPopup;
  IITC.map.layers.mapbox.Tooltip = MapboxTooltip;
})();
