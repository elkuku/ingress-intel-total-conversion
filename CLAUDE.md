# Claude Commands for IITC-CE

## Project Overview

IITC-CE (Ingress Intel Total Conversion - Community Edition) is a browser-based overlay for the Ingress game map. It replaces the stock Intel website with an enhanced interface featuring:
- Custom Leaflet.js-based map rendering with Ingress-specific extensions
- 69+ plugins for extended functionality
- Mobile Android app support
- Hook-based plugin architecture for extensibility

### Directory Structure

```
ingress-intel-total-conversion/
├── core/                      # Core IITC framework
│   ├── code/                  # 46 JavaScript modules
│   ├── external/              # Third-party libraries (Leaflet, jQuery, etc.)
│   ├── total-conversion-build.js   # Main entry point with version/changelog
│   ├── style.css              # Core styling
│   └── smartphone.css         # Mobile-specific styling
├── plugins/                   # 69+ plugin files
│   ├── *.js                   # Individual plugins
│   ├── experimental/          # Experimental plugins
│   └── deleted/               # Archived plugins
├── mobile/                    # Android app code
│   └── app/build.gradle       # Contains versionName to sync with core
├── build.py                   # Main build script
├── build_plugin.py            # Plugin build logic
└── buildsettings.py           # Build configuration
```

---

## Map Rendering System

### Overview

Map rendering uses **Leaflet.js** with custom IITC extensions. The system is tile-based with intelligent caching and batched rendering for performance.

### Key Files

| File | Purpose |
|------|---------|
| `core/code/map.js` | Map initialization, CRS setup, base layers |
| `core/code/map_data_request.js` | Tile-based data fetching from Ingress servers |
| `core/code/map_data_render.js` | Render queue for portals, links, fields |
| `core/code/map_data_calc_tools.js` | Tile coordinate calculations, zoom mappings |
| `core/code/portal_marker.js` | Portal CircleMarker rendering |

### Coordinate Reference System (CRS)

Located in `core/code/map.js`:
- Uses S2 geometry library for projection
- Earth radius: 6,367,000 meters (matches Ingress client)
- Custom Leaflet CRS with S2 projection for accurate distance calculations

```javascript
// Key function: setupCRS()
// Sets up window.map with custom CRS
```

### Data Request Pipeline

The `MapDataRequest` class in `core/code/map_data_request.js` manages tile fetching:

1. **Tile Calculation**: Map viewport divided into tiles at zoom-dependent granularity
2. **Request Queuing**: Tiles queued for fetch (max 5 parallel requests, 25 tiles per request)
3. **Caching**: `DataCache` class stores tile data with expiration
   - FRESH_AGE: 3 minutes (use cached without fetching)
   - MAX_AGE: 5 minutes (discard after)
4. **Render Scheduling**: Data passed to render queue in batches

Key parameters:
```javascript
MAX_REQUESTS: 5            // Parallel requests
NUM_TILES_PER_REQUEST: 25  // Tiles per batch
MAX_TILE_RETRIES: 5        // Retry attempts
RENDER_BATCH_SIZE: 1500    // Items per render batch
```

### Render Pipeline

The `Render` class in `core/code/map_data_render.js`:

1. `startRenderPass()`: Begins render cycle, tracks seen entity GUIDs
2. `processGameEntities()`: Processes portals, links, fields from tile data
3. Entity-specific rendering:
   - **Portals**: `createPortalEntity()` → `L.PortalMarker` (CircleMarker)
   - **Links**: `createLinkEntity()` → Geodesic Polyline
   - **Fields**: `createFieldEntity()` → Geodesic Polygon
4. `endRenderPass()`: Cleans up entities outside viewport

### Portal Marker Rendering

`L.PortalMarker` in `core/code/portal_marker.js`:
- Extends Leaflet's CircleMarker
- Styling by level:
  ```javascript
  LEVEL_TO_WEIGHT: [2,2,2,2,2,3,3,4,4]   // Stroke width
  LEVEL_TO_RADIUS: [7,7,7,7,8,8,9,10,11] // Pixel radius
  ```
- Smart updates via `willUpdate()` based on timestamps and team changes
- Event handlers for click, dblclick, contextmenu

### Global Entity Storage

```javascript
window.portals  // Object: GUID → L.PortalMarker
window.links    // Object: GUID → Leaflet Polyline
window.fields   // Object: GUID → Leaflet Polygon
```

### Refresh Timing

Defined in `core/total-conversion-build.js`:
```javascript
REFRESH: 30                      // Default refresh interval (seconds)
ZOOM_LEVEL_ADJ: 5                // Seconds added per zoom level
ON_MOVE_REFRESH: 2.5             // Refresh after pan/zoom
MINIMUM_OVERRIDE_REFRESH: 10     // Minimum refresh interval
REFRESH_GAME_SCORE: 900          // Score refresh (15 mins)
```

---

## Plugin System

### Plugin Structure

Plugins are wrapped by `build_plugin.py` with:
1. UserScript metadata block (@name, @version, @description, @match)
2. `wrapper(plugin_info)` function containing plugin code
3. Setup function registration via `plugin_info.setup`

### Hook System

Located in `core/code/hooks.js`. Plugins use hooks to respond to events:

```javascript
window.addHook('hookName', callback);
window.runHooks('hookName', data);
```

**Key Hooks**:
| Hook | Triggered When |
|------|----------------|
| `portalSelected` | Portal selection changed |
| `mapDataRefreshStart` | Map data fetch begins |
| `mapDataRefreshEnd` | Map data fetch completes |
| `portalAdded` | Portal rendered to map |
| `portalRemoved` | Portal removed from map |
| `linkAdded` / `linkRemoved` | Link lifecycle |
| `fieldAdded` / `fieldRemoved` | Field lifecycle |
| `portalDetailsUpdated` | Sidebar details refreshed |
| `iitcLoaded` | All plugins initialized |

### Plugin APIs

| API | File | Purpose |
|-----|------|---------|
| `IITC.filters` | `core/code/filters.js` | Entity filtering/hiding |
| `IITC.toolbox` | `core/code/toolbox.js` | Toolbar button creation |
| `IITC.utils` | `core/code/utils.js` | Utility functions |
| `IITC.search` | `core/code/search.js` | Search functionality |
| `IITC.statusbar` | `core/code/statusbar.js` | Status bar updates |

---

## Game Constants

Defined in `core/total-conversion-build.js`:

```javascript
COLORS: ['#FF6600', '#0088FF', '#03DC03', '#FF0028']  // [none, RES, ENL, MAC]
HACK_RANGE: 40                    // meters
BASE_HACK_COOLDOWN: 300           // seconds (5 mins)
FACTION_HACK_COOLDOWN: 180        // seconds (3 mins)
LINK_RANGE_MAC: [0,200,250,350,400,500,600,700,1000,1000]  // by level
```

---

## Build System

### Build Scripts

- `build.py`: Main orchestrator, processes core and plugins
- `build_plugin.py`: Plugin processing, embeds resources (CSS, images)
- `buildsettings.py`: Configuration for build targets (local, dev, mobile)

### Build Targets

```python
# In buildsettings.py
'local'   # Local development
'dev'     # Development server
'tmdev'   # Tampermonkey development
'mobile'  # Android app build
```

### Running Builds

```bash
python3 build.py local    # Build for local testing
python3 build.py dev      # Build for development
python3 build.py mobile   # Build for Android app
```

---

## Key Core Modules

| Module | Size | Purpose |
|--------|------|---------|
| `boot.js` | 12 KB | Initialization, page setup |
| `map.js` | 17 KB | Map setup, CRS, base layers |
| `map_data_request.js` | 30 KB | Tile data fetching |
| `map_data_render.js` | 20 KB | Entity rendering |
| `portal_marker.js` | 11 KB | Portal CircleMarker class |
| `portal_info.js` | 16 KB | Portal data calculations |
| `portal_detail_display.js` | 16 KB | Portal sidebar UI |
| `comm.js` | 30 KB | Chat system |
| `hooks.js` | 6 KB | Event hook system |
| `utils.js` | 19 KB | Utility functions |

---

## Version Management

### Update Plugin and Core Versions

Command: `/version-update` or simply ask Claude to "update versions"

This command will:

1. **Check plugin changes since last release**:
   - Find the last release commit (search for "release" in commit messages)
   - Check git history for each plugin since last release
   - Identify plugins that have changes but haven't had version bumps

2. **Update plugin versions**:
   - For each changed plugin, determine version increment based on change type:
     - **Patch version** (0.3.4 → 0.3.5): Bug fixes, eslint fixes, small improvements
     - **Minor version** (0.3.4 → 0.4.0): New features, API changes, significant enhancements
   - Add changelog entries describing the changes with appropriate detail level

3. **Update core version**:
   - Check `core/` directory changes since last release
   - Increment minor version in `core/total-conversion-build.js` (e.g., 0.40.0 → 0.41.0)
   - Add changelog entries for core improvements
   - Focus on user-visible changes and bug fixes

4. **Update mobile app version**:
   - Update `versionName` in `mobile/app/build.gradle` to match core version
   - Change from `versionName "0.40.0"` to `versionName "0.41.0"`

### Process Steps:
1. `git log --oneline [last-release-commit]..HEAD -- plugins/[plugin-name].js`
2. Check if version in plugin header needs updating
3. Add concise changelog entries (like "Fix portal snap positioning bug")
4. `git log --oneline [last-release-commit]..HEAD -- core/`
5. Update core version and changelog
6. Exclude translation commits and mobile-specific changes from core changelog

### Example Changelog Entries:
- **Plugin**: `'Fix portal snap positioning bug'`
- **Core**: `'Fix RegionScore tooltip HTML rendering'`, `'Update MODs display colors'`

Keep descriptions concise and user-focused, avoiding technical implementation details.