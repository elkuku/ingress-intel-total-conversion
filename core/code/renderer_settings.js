/* global IITC, log, $ -- eslint */

/**
 * @file Map renderer settings UI and configuration.
 * Allows users to select which map renderer to use (Leaflet or Mapbox).
 * @module renderer_settings
 */

/**
 * @namespace IITC.renderer
 * @description Renderer selection and configuration utilities.
 */
IITC.renderer = IITC.renderer || {};

(function () {
  'use strict';

  /**
   * localStorage key for renderer preference.
   * @constant
   * @type {string}
   */
  var STORAGE_KEY_RENDERER = 'iitc-renderer';

  /**
   * localStorage key for Mapbox token.
   * @constant
   * @type {string}
   */
  var STORAGE_KEY_MAPBOX_TOKEN = 'iitc-renderer-mapbox-token';

  /**
   * localStorage key for Mapbox style.
   * @constant
   * @type {string}
   */
  var STORAGE_KEY_MAPBOX_STYLE = 'iitc-renderer-mapbox-style';

  /**
   * Available renderer options.
   * @constant
   * @type {Object}
   */
  var RENDERERS = {
    leaflet: {
      id: 'leaflet',
      name: 'Leaflet',
      description: 'Default renderer. Stable and well-tested.',
      available: true,
    },
    mapbox: {
      id: 'mapbox',
      name: 'Mapbox GL JS',
      description: 'WebGL-based renderer with smooth animations. Requires access token.',
      available: true,
      requiresToken: true,
    },
  };

  /**
   * Default Mapbox styles.
   * @constant
   * @type {Array}
   */
  var MAPBOX_STYLES = [
    { id: 'mapbox://styles/mapbox/dark-v11', name: 'Dark' },
    { id: 'mapbox://styles/mapbox/light-v11', name: 'Light' },
    { id: 'mapbox://styles/mapbox/streets-v12', name: 'Streets' },
    { id: 'mapbox://styles/mapbox/satellite-v9', name: 'Satellite' },
    { id: 'mapbox://styles/mapbox/satellite-streets-v12', name: 'Satellite Streets' },
  ];

  /**
   * Get the saved renderer preference.
   *
   * @function getRenderer
   * @memberof IITC.renderer
   * @returns {string} The renderer ID ('leaflet' or 'mapbox')
   */
  IITC.renderer.getRenderer = function () {
    try {
      return localStorage[STORAGE_KEY_RENDERER] || 'leaflet';
    } catch (e) {
      log.warn('Failed to read renderer preference:', e);
      return 'leaflet';
    }
  };

  /**
   * Set the renderer preference.
   *
   * @function setRenderer
   * @memberof IITC.renderer
   * @param {string} renderer - The renderer ID
   */
  IITC.renderer.setRenderer = function (renderer) {
    try {
      localStorage[STORAGE_KEY_RENDERER] = renderer;
    } catch (e) {
      log.warn('Failed to save renderer preference:', e);
    }
  };

  /**
   * Get the saved Mapbox access token.
   *
   * @function getMapboxToken
   * @memberof IITC.renderer
   * @returns {string|null} The Mapbox access token or null
   */
  IITC.renderer.getMapboxToken = function () {
    try {
      return localStorage[STORAGE_KEY_MAPBOX_TOKEN] || null;
    } catch (e) {
      return null;
    }
  };

  /**
   * Set the Mapbox access token.
   *
   * @function setMapboxToken
   * @memberof IITC.renderer
   * @param {string} token - The Mapbox access token
   */
  IITC.renderer.setMapboxToken = function (token) {
    try {
      if (token) {
        localStorage[STORAGE_KEY_MAPBOX_TOKEN] = token;
      } else {
        delete localStorage[STORAGE_KEY_MAPBOX_TOKEN];
      }
    } catch (e) {
      log.warn('Failed to save Mapbox token:', e);
    }
  };

  /**
   * Get the saved Mapbox style.
   *
   * @function getMapboxStyle
   * @memberof IITC.renderer
   * @returns {string} The Mapbox style URL
   */
  IITC.renderer.getMapboxStyle = function () {
    try {
      return localStorage[STORAGE_KEY_MAPBOX_STYLE] || MAPBOX_STYLES[0].id;
    } catch (e) {
      return MAPBOX_STYLES[0].id;
    }
  };

  /**
   * Set the Mapbox style.
   *
   * @function setMapboxStyle
   * @memberof IITC.renderer
   * @param {string} style - The Mapbox style URL
   */
  IITC.renderer.setMapboxStyle = function (style) {
    try {
      localStorage[STORAGE_KEY_MAPBOX_STYLE] = style;
    } catch (e) {
      log.warn('Failed to save Mapbox style:', e);
    }
  };

  /**
   * Get the renderer configuration for map initialization.
   * This is called by IITC.map.initialize to get renderer settings.
   *
   * @function getConfig
   * @memberof IITC.renderer
   * @returns {Object} Configuration object for map initialization
   */
  IITC.renderer.getConfig = function () {
    var renderer = IITC.renderer.getRenderer();
    var config = {
      renderer: renderer,
    };

    if (renderer === 'mapbox') {
      config.mapboxToken = IITC.renderer.getMapboxToken();
      config.style = IITC.renderer.getMapboxStyle();

      // Validate Mapbox configuration
      if (!config.mapboxToken) {
        log.warn('Mapbox renderer selected but no token provided. Falling back to Leaflet.');
        config.renderer = 'leaflet';
      }
    }

    return config;
  };

  /**
   * Check if the current renderer is active.
   *
   * @function isActive
   * @memberof IITC.renderer
   * @param {string} rendererId - The renderer ID to check
   * @returns {boolean} True if the specified renderer is active
   */
  IITC.renderer.isActive = function (rendererId) {
    return IITC.map.getRendererType() === rendererId;
  };

  /**
   * Build the settings dialog HTML.
   *
   * @private
   * @returns {string} HTML string for the dialog
   */
  function buildSettingsHtml() {
    var currentRenderer = IITC.renderer.getRenderer();
    var mapboxToken = IITC.renderer.getMapboxToken() || '';
    var mapboxStyle = IITC.renderer.getMapboxStyle();
    var activeRenderer = IITC.map.isInitialized() ? IITC.map.getRendererType() : null;

    var html = '<div class="renderer-settings">';

    // Current status
    if (activeRenderer) {
      var rendererName = RENDERERS[activeRenderer] ? RENDERERS[activeRenderer].name : activeRenderer;
      html += '<div class="renderer-status">';
      html += '<strong>Current renderer:</strong> ' + rendererName;
      html += '</div>';
    }

    // Renderer selection
    html += '<div class="renderer-section">';
    html += '<label for="renderer-select"><strong>Map Renderer:</strong></label>';
    html += '<select id="renderer-select">';
    for (var id in RENDERERS) {
      var r = RENDERERS[id];
      if (r.available) {
        var selected = currentRenderer === id ? ' selected' : '';
        html += '<option value="' + id + '"' + selected + '>' + r.name + '</option>';
      }
    }
    html += '</select>';
    html += '<p class="renderer-description" id="renderer-description"></p>';
    html += '</div>';

    // Mapbox settings (shown/hidden based on selection)
    html += '<div class="renderer-section mapbox-settings" id="mapbox-settings" style="display: none;">';
    html += '<label for="mapbox-token"><strong>Mapbox Access Token:</strong></label>';
    html += '<input type="text" id="mapbox-token" value="' + escapeHtml(mapboxToken) + '" ';
    html += 'placeholder="pk.xxx..." style="width: 100%; margin-bottom: 8px;">';
    html += '<p class="help-text">Get a free token at <a href="https://account.mapbox.com/access-tokens/" target="_blank">mapbox.com</a></p>';
    html += '<p class="help-text">The Mapbox GL JS library will be loaded automatically when selected.</p>';

    // Mapbox style selection
    html += '<label for="mapbox-style"><strong>Map Style:</strong></label>';
    html += '<select id="mapbox-style">';
    for (var i = 0; i < MAPBOX_STYLES.length; i++) {
      var style = MAPBOX_STYLES[i];
      var styleSelected = mapboxStyle === style.id ? ' selected' : '';
      html += '<option value="' + style.id + '"' + styleSelected + '>' + style.name + '</option>';
    }
    html += '</select>';
    html += '</div>';

    // Warning about reload
    html += '<div class="renderer-warning">';
    html += '<p><strong>Note:</strong> Changing the renderer requires a page reload to take effect.</p>';
    html += '</div>';

    html += '</div>';

    return html;
  }

  /**
   * Escape HTML special characters.
   *
   * @private
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Show the renderer settings dialog.
   *
   * @function showSettings
   * @memberof IITC.renderer
   */
  IITC.renderer.showSettings = function () {
    var html = buildSettingsHtml();

    var dialog = window.dialog({
      title: 'Map Renderer Settings',
      html: html,
      id: 'renderer-settings',
      width: 400,
      buttons: {
        Apply: function () {
          var newRenderer = $('#renderer-select').val();
          var mapboxToken = $('#mapbox-token').val().trim();
          var mapboxStyle = $('#mapbox-style').val();

          // Validate Mapbox settings
          if (newRenderer === 'mapbox' && !mapboxToken) {
            alert('Please enter a Mapbox access token to use the Mapbox renderer.');
            return;
          }

          // Save settings
          IITC.renderer.setRenderer(newRenderer);
          if (newRenderer === 'mapbox') {
            IITC.renderer.setMapboxToken(mapboxToken);
            IITC.renderer.setMapboxStyle(mapboxStyle);
          }

          // Check if reload is needed
          var currentActiveRenderer = IITC.map.isInitialized() ? IITC.map.getRendererType() : null;
          if (currentActiveRenderer && currentActiveRenderer !== newRenderer) {
            if (confirm('The page needs to reload to apply the new renderer. Reload now?')) {
              window.location.reload();
            }
          }

          $(this).dialog('close');
        },
        Cancel: function () {
          $(this).dialog('close');
        },
      },
    });

    // Set up event handlers after dialog is created
    setTimeout(function () {
      var $select = $('#renderer-select');
      var $description = $('#renderer-description');
      var $mapboxSettings = $('#mapbox-settings');

      function updateUI() {
        var selected = $select.val();
        var renderer = RENDERERS[selected];

        // Update description
        $description.text(renderer ? renderer.description : '');

        // Show/hide Mapbox settings
        if (selected === 'mapbox') {
          $mapboxSettings.show();
        } else {
          $mapboxSettings.hide();
        }
      }

      $select.on('change', updateUI);
      updateUI(); // Initial update
    }, 100);
  };

  /**
   * Add CSS styles for the settings dialog.
   *
   * @private
   */
  function addStyles() {
    var css =
      '.renderer-settings { font-size: 13px; }' +
      '.renderer-settings .renderer-status { background: rgba(0,0,0,0.2); padding: 8px; margin-bottom: 12px; border-radius: 4px; }' +
      '.renderer-settings .renderer-section { margin-bottom: 12px; }' +
      '.renderer-settings label { display: block; margin-bottom: 4px; }' +
      '.renderer-settings select, .renderer-settings input[type="text"] { padding: 4px 8px; border-radius: 3px; border: 1px solid #666; background: #333; color: #eee; }' +
      '.renderer-settings select { width: 100%; }' +
      '.renderer-settings .renderer-description { color: #999; font-size: 11px; margin-top: 4px; font-style: italic; }' +
      '.renderer-settings .help-text { color: #888; font-size: 11px; margin: 4px 0; }' +
      '.renderer-settings .help-text a { color: #6cf; }' +
      '.renderer-settings .renderer-warning { background: rgba(255,200,0,0.1); border: 1px solid rgba(255,200,0,0.3); padding: 8px; border-radius: 4px; margin-top: 12px; }' +
      '.renderer-settings .renderer-warning p { margin: 0; color: #cc9; font-size: 11px; }';

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Check if Mapbox GL JS is loaded.
   *
   * @function isMapboxLoaded
   * @memberof IITC.renderer
   * @returns {boolean}
   */
  IITC.renderer.isMapboxLoaded = function () {
    return typeof mapboxgl !== 'undefined';
  };

  /**
   * Initialize the renderer settings module.
   * Sets up window.mapRendererConfig which is read by IITC.map.initialize.
   * This runs immediately to ensure config is available before setupMap().
   *
   * Note: Mapbox GL JS library loading is handled early in total-conversion-build.js
   *
   * @function init
   * @memberof IITC.renderer
   */
  IITC.renderer.init = function () {
    // Get saved config
    var config = IITC.renderer.getConfig();

    // Check if Mapbox was supposed to load but didn't
    if (config.renderer === 'mapbox' && !IITC.renderer.isMapboxLoaded()) {
      log.warn('Mapbox GL JS not loaded, falling back to Leaflet');
      config.renderer = 'leaflet';
    }

    // Set up window.mapRendererConfig for map initialization
    // This MUST run before setupMap() is called
    window.mapRendererConfig = {
      renderer: config.renderer,
      mapboxToken: config.mapboxToken,
      style: config.style,
    };

    log.log('Renderer config initialized. Selected renderer: ' + config.renderer);
  };

  /**
   * Set up the UI components (toolbox button, styles).
   * Called after IITC is fully loaded since toolbox may not be ready earlier.
   *
   * @function setupUI
   * @memberof IITC.renderer
   * @private
   */
  IITC.renderer.setupUI = function () {
    addStyles();

    // Add toolbox button
    IITC.toolbox.addButton({
      id: 'renderer-settings-btn',
      label: 'Renderer',
      title: 'Map renderer settings',
      action: IITC.renderer.showSettings,
    });
  };

  // Initialize config immediately (before setupMap is called)
  IITC.renderer.init();

  // Set up UI after IITC is fully loaded
  window.addHook('iitcLoaded', IITC.renderer.setupUI);
})();
