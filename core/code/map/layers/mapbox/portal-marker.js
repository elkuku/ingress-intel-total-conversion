/* global IITC, mapboxgl -- eslint */

/**
 * @file Mapbox GL JS portal marker implementation.
 * Uses GeoJSON sources and circle layers to render portals efficiently.
 * @module map/layers/mapbox/portal-marker
 */

IITC.map.layers = IITC.map.layers || {};
IITC.map.layers.mapbox = IITC.map.layers.mapbox || {};

(function () {
  'use strict';

  /**
   * Portal marker constants matching Leaflet implementation.
   * @memberof IITC.map.layers.mapbox
   */
  var PortalMarkerConstants = {
    portalBaseStyle: {
      stroke: true,
      opacity: 1,
      fill: true,
      fillOpacity: 0.5,
      interactive: true,
    },
    placeholderStyle: {
      dashArray: '1,2',
      weight: 1,
    },
    LEVEL_TO_WEIGHT: [2, 2, 2, 2, 2, 3, 3, 4, 4],
    LEVEL_TO_RADIUS: [7, 7, 7, 7, 8, 8, 9, 10, 11],
  };

  /**
   * Portal Manager for Mapbox.
   * Manages a single GeoJSON source and layer for all portals.
   * This is more efficient than creating individual markers.
   *
   * @class PortalManager
   * @memberof IITC.map.layers.mapbox
   */
  function PortalManager(adapter) {
    this._adapter = adapter;
    this._sourceId = 'iitc-portals-source';
    this._layerId = 'iitc-portals-layer';
    this._outlineLayerId = 'iitc-portals-outline-layer';
    this._portals = new Map(); // guid -> MapboxPortalMarker
    this._features = new Map(); // guid -> GeoJSON feature
    this._initialized = false;
    this._selectedGuid = null;
  }

  /**
   * Initialize the portal source and layers.
   */
  PortalManager.prototype.initialize = function () {
    if (this._initialized) return;

    var adapter = this._adapter;
    var self = this;
    var nativeMap = adapter.getNativeMap();

    var setupSourceAndLayer = function () {
      console.log('[Mapbox] setupSourceAndLayer called, style loaded:', nativeMap.isStyleLoaded());

      // Add GeoJSON source for portals if it doesn't exist
      if (!nativeMap.getSource(self._sourceId)) {
        try {
          nativeMap.addSource(self._sourceId, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [],
            },
          });
          console.log('[Mapbox] Portal source created:', self._sourceId);
        } catch (e) {
          console.error('[Mapbox] Error creating source:', e);
        }
      }

      // Verify source exists before adding layer
      var sourceCheck = nativeMap.getSource(self._sourceId);
      console.log('[Mapbox] Source check before layer creation:', sourceCheck ? 'exists' : 'MISSING');

      // Add circle layer for portals if it doesn't exist
      if (!nativeMap.getLayer(self._layerId)) {
        try {
          var layerDef = {
            id: self._layerId,
            type: 'circle',
            source: self._sourceId,
            paint: {
              // Data-driven styling from feature properties
              'circle-radius': ['coalesce', ['get', 'radius'], 8],
              'circle-color': ['coalesce', ['get', 'fillColor'], '#00FF00'],
              'circle-opacity': ['coalesce', ['get', 'fillOpacity'], 0.8],
              'circle-stroke-width': ['coalesce', ['get', 'weight'], 2],
              'circle-stroke-color': ['coalesce', ['get', 'color'], '#FFFFFF'],
              'circle-stroke-opacity': ['coalesce', ['get', 'opacity'], 1],
            },
          };
          console.log('[Mapbox] Adding layer, source exists:', !!sourceCheck);
          console.log('[Mapbox] Style layers before:', nativeMap.getStyle().layers.length);

          // Try using the native addLayer directly
          nativeMap.addLayer(layerDef);

          // Check immediately
          var addedLayer = nativeMap.getLayer(self._layerId);
          console.log('[Mapbox] Layer after addLayer:', addedLayer ? 'exists' : 'MISSING');
          console.log('[Mapbox] Style layers after:', nativeMap.getStyle().layers.length);

          if (!addedLayer) {
            // Try alternative: check if it's in the style
            var styleLayers = nativeMap.getStyle().layers;
            var found = styleLayers.find(function(l) { return l.id === self._layerId; });
            console.log('[Mapbox] Layer in style.layers:', found ? 'YES' : 'NO');

            // List last 5 layers
            console.log('[Mapbox] Last 5 layers:', styleLayers.slice(-5).map(function(l) { return l.id; }));
          } else {
            console.log('[Mapbox] Portal layer created successfully');
            nativeMap.moveLayer(self._layerId);
          }
        } catch (e) {
          console.error('[Mapbox] Error creating layer:', e.message);
          console.error('[Mapbox] Error stack:', e.stack);
        }
      } else {
        console.log('[Mapbox] Portal layer already exists');
      }
    };

    var setupEventHandlers = function () {
      // Set up click handler
      nativeMap.on('click', self._layerId, function (e) {
        if (e.features && e.features.length > 0) {
          var feature = e.features[0];
          var guid = feature.properties.guid;
          self._handlePortalClick(guid, e);
        }
      });

      nativeMap.on('dblclick', self._layerId, function (e) {
        if (e.features && e.features.length > 0) {
          var feature = e.features[0];
          var guid = feature.properties.guid;
          self._handlePortalDblClick(guid, e);
        }
      });

      nativeMap.on('contextmenu', self._layerId, function (e) {
        if (e.features && e.features.length > 0) {
          var feature = e.features[0];
          var guid = feature.properties.guid;
          self._handlePortalContextMenu(guid, e);
        }
      });

      // Change cursor on hover
      nativeMap.on('mouseenter', self._layerId, function () {
        nativeMap.getCanvas().style.cursor = 'pointer';
      });

      nativeMap.on('mouseleave', self._layerId, function () {
        nativeMap.getCanvas().style.cursor = '';
      });
    };

    var setupAll = function () {
      setupSourceAndLayer();
      setupEventHandlers();
    };

    // Execute after style is fully loaded
    // Use both 'load' and 'style.load' events and check isStyleLoaded()
    var styleLoaded = nativeMap.isStyleLoaded();
    console.log('[Mapbox] Initial style loaded check:', styleLoaded);

    if (styleLoaded) {
      setupAll();
    } else {
      // Try both events in case one already fired
      var setupOnce = function () {
        if (!nativeMap.getLayer(self._layerId)) {
          console.log('[Mapbox] Running setup from event');
          setupAll();
        }
      };
      nativeMap.once('style.load', setupOnce);
      nativeMap.once('load', setupOnce);
      // Also try with a small delay as fallback
      setTimeout(function () {
        if (!nativeMap.getLayer(self._layerId) && nativeMap.isStyleLoaded()) {
          console.log('[Mapbox] Running setup from timeout fallback');
          setupAll();
        }
      }, 500);
    }
    console.log('[Mapbox] Portal layer initialization queued');

    this._initialized = true;
  };

  /**
   * Handle portal click event.
   * @private
   */
  PortalManager.prototype._handlePortalClick = function (guid, e) {
    window.selectPortal(guid, 'click');
    window.renderPortalDetails(guid);
    e.originalEvent.stopPropagation();
  };

  /**
   * Handle portal double-click event.
   * @private
   */
  PortalManager.prototype._handlePortalDblClick = function (guid, e) {
    window.selectPortal(guid, 'dblclick');
    window.renderPortalDetails(guid);
    var marker = this._portals.get(guid);
    if (marker) {
      window.map.setView(marker.getLatLng(), window.DEFAULT_ZOOM);
    }
    e.originalEvent.stopPropagation();
  };

  /**
   * Handle portal context menu event.
   * @private
   */
  PortalManager.prototype._handlePortalContextMenu = function (guid, e) {
    window.selectPortal(guid, 'contextmenu');
    window.renderPortalDetails(guid);
    if (window.isSmartphone()) {
      window.show('info');
    } else if (!$('#scrollwrapper').is(':visible')) {
      $('#sidebartoggle').click();
    }
    e.originalEvent.stopPropagation();
  };

  /**
   * Add a portal marker.
   * @param {MapboxPortalMarker} marker
   */
  PortalManager.prototype.addPortal = function (marker) {
    this.initialize();

    var guid = marker.options.guid;
    this._portals.set(guid, marker);
    var feature = marker.toGeoJSON();
    this._features.set(guid, feature);

    // Log first few portals added for debugging
    if (this._portals.size <= 3) {
      console.log('[Mapbox] Portal added:', guid, 'total:', this._portals.size);
      console.log('[Mapbox] Feature:', JSON.stringify(feature));
    }

    this._updateSource();
  };

  /**
   * Remove a portal marker.
   * @param {string} guid
   */
  PortalManager.prototype.removePortal = function (guid) {
    this._portals.delete(guid);
    this._features.delete(guid);
    this._updateSource();
  };

  /**
   * Update a portal's feature.
   * @param {string} guid
   */
  PortalManager.prototype.updatePortal = function (guid) {
    var marker = this._portals.get(guid);
    if (marker) {
      this._features.set(guid, marker.toGeoJSON());
      this._updateSource();
    }
  };

  /**
   * Update the GeoJSON source with current features.
   * Uses debouncing to batch rapid updates.
   * @private
   */
  PortalManager.prototype._updateSource = function () {
    var self = this;

    // Debounce updates to avoid excessive calls
    if (this._updatePending) return;
    this._updatePending = true;

    // Use requestAnimationFrame for batching
    requestAnimationFrame(function () {
      self._updatePending = false;
      self._doUpdateSource();
    });
  };

  /**
   * Actually perform the source update with retry logic.
   * @private
   */
  PortalManager.prototype._doUpdateSource = function (retryCount) {
    var self = this;
    retryCount = retryCount || 0;
    var maxRetries = 20;

    var nativeMap = this._adapter.getNativeMap();
    var source = nativeMap.getSource(this._sourceId);

    if (source) {
      var features = Array.from(this._features.values());
      source.setData({
        type: 'FeatureCollection',
        features: features,
      });
      if (retryCount > 0) {
        console.log('[Mapbox] Source update succeeded after', retryCount, 'retries,', features.length, 'features');
      }
    } else if (retryCount < maxRetries) {
      // Source not ready yet, retry with delay
      setTimeout(function () {
        self._doUpdateSource(retryCount + 1);
      }, 100);
    } else {
      console.error('[Mapbox] Failed to update source after', maxRetries, 'retries');
    }
  };

  /**
   * Set the selected portal.
   * @param {string|null} guid
   */
  PortalManager.prototype.setSelected = function (guid) {
    var previousGuid = this._selectedGuid;
    this._selectedGuid = guid;

    // Update previous and new selected markers
    if (previousGuid && this._portals.has(previousGuid)) {
      this._portals.get(previousGuid).setSelected(false);
    }
    if (guid && this._portals.has(guid)) {
      this._portals.get(guid).setSelected(true);
    }
  };

  /**
   * Get a portal marker by GUID.
   * @param {string} guid
   * @returns {MapboxPortalMarker|undefined}
   */
  PortalManager.prototype.getPortal = function (guid) {
    return this._portals.get(guid);
  };

  /**
   * Check if a portal exists.
   * @param {string} guid
   * @returns {boolean}
   */
  PortalManager.prototype.hasPortal = function (guid) {
    return this._portals.has(guid);
  };

  // Singleton instance
  var _portalManager = null;

  /**
   * Get or create the portal manager singleton.
   * @param {Object} adapter - The Mapbox adapter
   * @returns {PortalManager}
   */
  function getPortalManager(adapter) {
    if (!_portalManager) {
      _portalManager = new PortalManager(adapter);
    }
    return _portalManager;
  }

  /**
   * Mapbox Portal Marker class.
   * Provides an API compatible with L.PortalMarker but uses the shared
   * GeoJSON source for efficient rendering.
   *
   * @class MapboxPortalMarker
   * @memberof IITC.map.layers.mapbox
   */
  function MapboxPortalMarker(latlng, data) {
    this._latlng = this._normalizeLatLng(latlng);
    this._details = null;
    this._level = 0;
    this._team = window.TEAM_NONE;
    this._selected = data.guid === window.selectedPortal;
    this._map = null;
    this._visible = true;

    this.options = {
      guid: data.guid,
    };

    this.updateDetails(data);
  }

  MapboxPortalMarker.statics = PortalMarkerConstants;

  /**
   * Normalize latlng to {lat, lng} format.
   * @private
   */
  MapboxPortalMarker.prototype._normalizeLatLng = function (latlng) {
    if (Array.isArray(latlng)) {
      return { lat: latlng[0], lng: latlng[1] };
    }
    return { lat: latlng.lat, lng: latlng.lng };
  };

  /**
   * Add this marker to a map.
   * @param {Object} map - Map adapter or native map
   * @returns {this}
   */
  MapboxPortalMarker.prototype.addTo = function (map) {
    // Get the adapter (map might be the adapter or the native map)
    var adapter = map._adapter || map;

    // Debug: only log first call
    if (!MapboxPortalMarker._loggedAddTo) {
      MapboxPortalMarker._loggedAddTo = true;
      console.log('[Mapbox] addTo called, map._adapter:', !!map._adapter);
      console.log('[Mapbox] adapter.getRendererType:', adapter.getRendererType ? adapter.getRendererType() : 'no method');
    }

    if (adapter.getRendererType && adapter.getRendererType() === 'mapbox') {
      this._map = adapter;
      var manager = getPortalManager(adapter);
      manager.addPortal(this);
    }
    return this;
  };

  /**
   * Remove this marker from the map.
   * @returns {this}
   */
  MapboxPortalMarker.prototype.remove = function () {
    if (this._map) {
      var manager = getPortalManager(this._map);
      manager.removePortal(this.options.guid);
      this._map = null;
    }
    return this;
  };

  /**
   * Check if the marker should be updated with new data.
   * Same logic as L.PortalMarker.willUpdate
   */
  MapboxPortalMarker.prototype.willUpdate = function (details) {
    if (details.level === undefined) {
      return this._details.timestamp < details.timestamp && this._details.team !== details.team;
    }
    if (this._details.timestamp < details.timestamp) {
      return true;
    }
    if (this.isPlaceholder() && this._details.team === details.team) {
      return true;
    }
    if (this._details.timestamp > details.timestamp) {
      return false;
    }
    if (details.history) {
      if (!this._details.history) {
        return true;
      }
      if (this._details.history._raw !== details.history._raw) {
        return true;
      }
    }
    if (!this._details.mods && details.mods) {
      return true;
    }
    return false;
  };

  /**
   * Update the marker with new portal details.
   */
  MapboxPortalMarker.prototype.updateDetails = function (details) {
    // Same logic as L.PortalMarker.updateDetails
    if (this._details) {
      if (this._details.latE6 !== details.latE6 || this._details.lngE6 !== details.lngE6) {
        this._latlng = { lat: details.latE6 / 1e6, lng: details.lngE6 / 1e6 };
      }

      if (details.level === undefined) {
        if (this._details.timestamp < details.timestamp && this._details.team !== details.team) {
          details.title = this._details.title;
          details.image = this._details.image;
          details.history = this._details.history;
          this._details = details;
        }
      } else if (this._details.timestamp === details.timestamp) {
        var localThis = this;
        ['level', 'health', 'resCount', 'image', 'title', 'ornaments', 'mission', 'mission50plus', 'artifactBrief', 'mods', 'resonators', 'owner', 'artifactDetail'].forEach(function (
          prop
        ) {
          if (details[prop]) localThis._details[prop] = details[prop];
        });

        if (details.history) {
          if (!this._details.history) {
            this._details.history = details.history;
          } else {
            this._details.history._raw |= details.history._raw;
            ['visited', 'captured', 'scoutControlled'].forEach(function (prop) {
              localThis._details.history[prop] ||= details.history[prop];
            });
          }
        }
        this._details.ent = details.ent;
      } else {
        if (!details.history) {
          details.history = this._details.history;
        }
        this._details = details;
      }
    } else {
      this._details = details;
    }

    this._level = parseInt(this._details.level) || 0;
    this._team = IITC.utils.getTeamId(this._details.team);

    if (this._team === window.TEAM_NONE) {
      this._level = 0;
    }

    this.options = {
      guid: this._details.guid,
      level: this._level,
      team: this._team,
      ent: this._details.ent,
      timestamp: this._details.timestamp,
      data: this._details,
    };

    this.setSelected();

    if (this.hasFullDetails()) {
      window.portalDetail.store(this.options.guid, this._details);
    }

    // Update the feature in the manager
    if (this._map) {
      var manager = getPortalManager(this._map);
      manager.updatePortal(this.options.guid);
    }
  };

  /**
   * Get portal details.
   */
  MapboxPortalMarker.prototype.getDetails = function () {
    return this._details;
  };

  /**
   * Check if this is a placeholder portal.
   */
  MapboxPortalMarker.prototype.isPlaceholder = function () {
    return this._details.level === undefined;
  };

  /**
   * Check if portal has full details.
   */
  MapboxPortalMarker.prototype.hasFullDetails = function () {
    return !!this._details.mods;
  };

  /**
   * Get the marker's lat/lng.
   */
  MapboxPortalMarker.prototype.getLatLng = function () {
    return this._latlng;
  };

  /**
   * Set the marker's lat/lng.
   */
  MapboxPortalMarker.prototype.setLatLng = function (latlng) {
    this._latlng = this._normalizeLatLng(latlng);
    if (this._map) {
      var manager = getPortalManager(this._map);
      manager.updatePortal(this.options.guid);
    }
    return this;
  };

  /**
   * Set style (stub for highlighters).
   */
  MapboxPortalMarker.prototype.setStyle = function (style) {
    Object.assign(this.options, style);
    return this;
  };

  /**
   * Set the marker style.
   */
  MapboxPortalMarker.prototype.setMarkerStyle = function (style) {
    var styleOptions = Object.assign({}, this._style(), style);
    Object.assign(this.options, styleOptions);

    // Apply highlighter
    var highlightStyle = window.highlightPortal(this);
    if (highlightStyle) {
      Object.assign(this.options, highlightStyle);
    }

    if (this._selected) {
      this.options.color = window.COLOR_SELECTED_PORTAL;
    }

    if (this._map) {
      var manager = getPortalManager(this._map);
      manager.updatePortal(this.options.guid);
    }

    return this;
  };

  /**
   * Set selection state.
   */
  MapboxPortalMarker.prototype.setSelected = function (selected) {
    if (selected === false) {
      this._selected = false;
    } else {
      this._selected = this._selected || selected;
    }
    this.setMarkerStyle();
  };

  /**
   * Calculate style based on portal state.
   * @private
   */
  MapboxPortalMarker.prototype._style = function () {
    return Object.assign({}, this._scale(), PortalMarkerConstants.portalBaseStyle, {
      color: window.COLORS[this._team],
      fillColor: window.COLORS[this._team],
    });
  };

  /**
   * Calculate scale based on zoom level.
   * @private
   */
  MapboxPortalMarker.prototype._scale = function () {
    var scale = window.portalMarkerScale();
    var level = Math.floor(this._level || 0);

    var lvlWeight = PortalMarkerConstants.LEVEL_TO_WEIGHT[level] * Math.sqrt(scale);
    var lvlRadius = PortalMarkerConstants.LEVEL_TO_RADIUS[level] * scale;

    if (this.isPlaceholder()) {
      lvlWeight = PortalMarkerConstants.placeholderStyle.weight;
    }

    return {
      radius: lvlRadius,
      weight: lvlWeight,
    };
  };

  /**
   * Bring marker to front (no-op for Mapbox, layers handle z-order).
   */
  MapboxPortalMarker.prototype.bringToFront = function () {
    return this;
  };

  /**
   * Bring marker to back (no-op for Mapbox).
   */
  MapboxPortalMarker.prototype.bringToBack = function () {
    return this;
  };

  /**
   * Convert to GeoJSON feature.
   */
  MapboxPortalMarker.prototype.toGeoJSON = function () {
    var style = this._style();
    var scale = this._scale();

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [this._latlng.lng, this._latlng.lat],
      },
      properties: {
        guid: this.options.guid,
        level: this._level,
        team: this._team,
        radius: scale.radius,
        weight: scale.weight,
        color: this._selected ? window.COLOR_SELECTED_PORTAL : style.color,
        fillColor: this.options.fillColor || style.fillColor,
        opacity: this.options.opacity || style.opacity,
        fillOpacity: this.options.fillOpacity || style.fillOpacity,
        selected: this._selected,
      },
    };
  };

  /**
   * Add event listener (compatibility stub).
   */
  MapboxPortalMarker.prototype.on = function () {
    // Events are handled by the PortalManager
    return this;
  };

  /**
   * Remove event listener (compatibility stub).
   */
  MapboxPortalMarker.prototype.off = function () {
    return this;
  };

  // Export
  IITC.map.layers.mapbox.PortalMarker = MapboxPortalMarker;
  IITC.map.layers.mapbox.PortalManager = PortalManager;

  // Debug function - call from console: IITC.map.layers.mapbox.debugPortals()
  IITC.map.layers.mapbox.debugPortals = function () {
    var map = window.map;
    var nativeMap = map._adapter ? map._adapter.getNativeMap() : map;
    var source = nativeMap.getSource('iitc-portals-source');
    var layer = nativeMap.getLayer('iitc-portals-layer');
    var allLayers = nativeMap.getStyle().layers;
    var portalLayerIndex = allLayers.findIndex(function (l) { return l.id === 'iitc-portals-layer'; });

    console.group('Mapbox Portal Debug');
    console.log('Source exists:', !!source);
    console.log('Layer exists:', !!layer);
    console.log('Layer index:', portalLayerIndex, 'of', allLayers.length, '(higher = on top)');
    console.log('Layer visibility:', layer ? layer.layout?.visibility || 'visible' : 'N/A');

    if (layer) {
      console.log('Layer paint properties:', layer.paint);
    }

    var features = nativeMap.querySourceFeatures('iitc-portals-source');
    console.log('Features in source (querySourceFeatures):', features.length);

    // Also check rendered features
    var renderedFeatures = nativeMap.queryRenderedFeatures({ layers: ['iitc-portals-layer'] });
    console.log('Rendered features (visible on screen):', renderedFeatures.length);

    if (features.length > 0) {
      console.log('Sample feature:', features[0]);
    }

    // Check current bounds
    var bounds = nativeMap.getBounds();
    console.log('Map bounds:', bounds.toArray());
    console.log('Zoom:', nativeMap.getZoom());

    console.groupEnd();
  };
  IITC.map.layers.mapbox.getPortalManager = getPortalManager;
  IITC.map.layers.mapbox.PortalMarkerConstants = PortalMarkerConstants;
})();
