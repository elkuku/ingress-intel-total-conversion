/* global IITC, mapboxgl -- eslint */

/**
 * @file Mapbox GL JS marker implementation.
 * Provides generic marker support using Mapbox markers.
 * @module map/layers/mapbox/marker
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

  /**
   * Mapbox marker implementation.
   * Wraps mapboxgl.Marker for compatibility with IITC.
   *
   * @class MapboxMarker
   * @memberof IITC.map.layers.mapbox
   * @param {Object} latlng - Marker position
   * @param {Object} [options] - Marker options
   */
  function MapboxMarker(latlng, options) {
    this._latlng = normalizeLatLng(latlng);
    this._map = null;
    this._marker = null;
    this._popup = null;
    this._eventListeners = new Map();

    this.options = Object.assign(
      {
        draggable: false,
        color: '#3388ff',
        icon: null,
        interactive: true,
      },
      options
    );
  }

  /**
   * Add the marker to a map.
   * @param {Object} map - Map adapter
   * @returns {this}
   */
  MapboxMarker.prototype.addTo = function (map) {
    var adapter = map.getRendererType ? map : map._adapter;
    if (!adapter || adapter.getRendererType() !== 'mapbox') {
      return this;
    }

    this._map = adapter;

    var markerOptions = {
      draggable: this.options.draggable,
      color: this.options.color,
    };

    // Handle custom icon/element
    if (this.options.icon) {
      var iconOptions = this.options.icon.options || this.options.icon;
      if (iconOptions.html) {
        var el = document.createElement('div');
        el.innerHTML = iconOptions.html;
        if (iconOptions.className) {
          el.className = iconOptions.className;
        }
        markerOptions.element = el;
      } else if (iconOptions.iconUrl) {
        var img = document.createElement('img');
        img.src = iconOptions.iconUrl;
        if (iconOptions.iconSize) {
          img.style.width = iconOptions.iconSize[0] + 'px';
          img.style.height = iconOptions.iconSize[1] + 'px';
        }
        if (iconOptions.className) {
          img.className = iconOptions.className;
        }
        markerOptions.element = img;
      }
    }

    this._marker = new mapboxgl.Marker(markerOptions).setLngLat([this._latlng.lng, this._latlng.lat]).addTo(adapter.getNativeMap());

    // Set up event handlers
    var self = this;
    var el = this._marker.getElement();

    el.addEventListener('click', function (e) {
      self._fireEvent('click', { originalEvent: e });
    });

    el.addEventListener('dblclick', function (e) {
      self._fireEvent('dblclick', { originalEvent: e });
    });

    el.addEventListener('contextmenu', function (e) {
      self._fireEvent('contextmenu', { originalEvent: e });
    });

    if (this.options.draggable) {
      this._marker.on('drag', function () {
        var ll = self._marker.getLngLat();
        self._latlng = { lat: ll.lat, lng: ll.lng };
        self._fireEvent('drag', {});
      });

      this._marker.on('dragend', function () {
        var ll = self._marker.getLngLat();
        self._latlng = { lat: ll.lat, lng: ll.lng };
        self._fireEvent('dragend', {});
      });
    }

    return this;
  };

  /**
   * Remove the marker from the map.
   * @returns {this}
   */
  MapboxMarker.prototype.remove = function () {
    if (this._marker) {
      this._marker.remove();
      this._marker = null;
      this._map = null;
    }
    return this;
  };

  /**
   * Fire an event to listeners.
   * @private
   */
  MapboxMarker.prototype._fireEvent = function (event, e) {
    if (this._eventListeners.has(event)) {
      var normalized = {
        type: event,
        target: this,
        latlng: this._latlng,
        originalEvent: e.originalEvent,
      };
      this._eventListeners.get(event).forEach(function (cb) {
        cb(normalized);
      });
    }
  };

  /**
   * Get the marker's position.
   * @returns {Object}
   */
  MapboxMarker.prototype.getLatLng = function () {
    return { lat: this._latlng.lat, lng: this._latlng.lng };
  };

  /**
   * Set the marker's position.
   * @param {Object} latlng
   * @returns {this}
   */
  MapboxMarker.prototype.setLatLng = function (latlng) {
    this._latlng = normalizeLatLng(latlng);
    if (this._marker) {
      this._marker.setLngLat([this._latlng.lng, this._latlng.lat]);
    }
    return this;
  };

  /**
   * Set the marker's icon.
   * @param {Object} icon
   * @returns {this}
   */
  MapboxMarker.prototype.setIcon = function (icon) {
    this.options.icon = icon;
    // Would need to recreate the marker to change the icon
    // For now, this is a no-op after creation
    return this;
  };

  /**
   * Set the marker's opacity.
   * @param {number} opacity
   * @returns {this}
   */
  MapboxMarker.prototype.setOpacity = function (opacity) {
    if (this._marker) {
      var el = this._marker.getElement();
      el.style.opacity = opacity;
    }
    return this;
  };

  /**
   * Bind a popup to the marker.
   * @param {string|HTMLElement} content - Popup content
   * @param {Object} [options] - Popup options
   * @returns {this}
   */
  MapboxMarker.prototype.bindPopup = function (content, options) {
    options = options || {};

    var popup = new mapboxgl.Popup({
      offset: options.offset || 25,
      closeButton: options.closeButton !== false,
      closeOnClick: options.closeOnClick !== false,
    });

    if (typeof content === 'string') {
      popup.setHTML(content);
    } else if (content instanceof HTMLElement) {
      popup.setDOMContent(content);
    }

    this._popup = popup;

    if (this._marker) {
      this._marker.setPopup(popup);
    }

    return this;
  };

  /**
   * Unbind the popup from the marker.
   * @returns {this}
   */
  MapboxMarker.prototype.unbindPopup = function () {
    if (this._marker) {
      this._marker.setPopup(null);
    }
    this._popup = null;
    return this;
  };

  /**
   * Open the marker's popup.
   * @returns {this}
   */
  MapboxMarker.prototype.openPopup = function () {
    if (this._marker && this._popup) {
      this._marker.togglePopup();
    }
    return this;
  };

  /**
   * Close the marker's popup.
   * @returns {this}
   */
  MapboxMarker.prototype.closePopup = function () {
    if (this._popup) {
      this._popup.remove();
    }
    return this;
  };

  /**
   * Bind a tooltip to the marker.
   * @param {string} content - Tooltip content
   * @param {Object} [options] - Tooltip options
   * @returns {this}
   */
  MapboxMarker.prototype.bindTooltip = function (content, options) {
    // Mapbox doesn't have native tooltips, use popup with different styling
    options = Object.assign({ closeButton: false, closeOnClick: false }, options);
    return this.bindPopup(content, options);
  };

  /**
   * Add event listener.
   * @param {string} event - Event name
   * @param {Function} callback - Handler
   * @returns {this}
   */
  MapboxMarker.prototype.on = function (event, callback) {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event).add(callback);
    return this;
  };

  /**
   * Remove event listener.
   * @param {string} event - Event name
   * @param {Function} callback - Handler
   * @returns {this}
   */
  MapboxMarker.prototype.off = function (event, callback) {
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
   * Bring marker to front.
   * @returns {this}
   */
  MapboxMarker.prototype.bringToFront = function () {
    // Mapbox markers are always on top of map layers
    return this;
  };

  /**
   * Bring marker to back.
   * @returns {this}
   */
  MapboxMarker.prototype.bringToBack = function () {
    return this;
  };

  // ==================== DivIcon ====================

  /**
   * Mapbox DivIcon implementation.
   * Creates a custom HTML marker element.
   *
   * @class MapboxDivIcon
   * @memberof IITC.map.layers.mapbox
   * @param {Object} options - Icon options
   */
  function MapboxDivIcon(options) {
    this.options = Object.assign(
      {
        iconSize: null,
        iconAnchor: null,
        className: 'mapbox-div-icon',
        html: '',
      },
      options
    );
  }

  // ==================== Icon ====================

  /**
   * Mapbox Icon implementation.
   * Creates an image-based marker icon.
   *
   * @class MapboxIcon
   * @memberof IITC.map.layers.mapbox
   * @param {Object} options - Icon options
   */
  function MapboxIcon(options) {
    this.options = Object.assign(
      {
        iconUrl: '',
        iconSize: null,
        iconAnchor: null,
        popupAnchor: null,
        className: '',
      },
      options
    );
  }

  // Export
  IITC.map.layers.mapbox.Marker = MapboxMarker;
  IITC.map.layers.mapbox.DivIcon = MapboxDivIcon;
  IITC.map.layers.mapbox.Icon = MapboxIcon;
})();
