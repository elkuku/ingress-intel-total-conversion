import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testPage = 'file://' + path.resolve(__dirname, 'mapbox-boot.html');

test('IITC boots with mapbox renderer without console errors', async ({ page }) => {
  const errors = [];

  // Capture all console messages for debugging
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
    console.log('BROWSER:', text);
  });

  // Capture uncaught exceptions with stack traces
  page.on('pageerror', err => {
    errors.push(err.message);
    console.log('PAGE ERROR:', err.message);
    console.log('STACK:', err.stack);
  });

  await page.goto(testPage, { waitUntil: 'load', timeout: 15000 });

  // Wait for IITC boot (it uses setTimeout(boot))
  await page.waitForTimeout(3000);

  // Filter out expected/irrelevant errors (e.g. network requests to intel.ingress.com)
  const realErrors = errors.filter(e =>
    !e.includes('net::ERR_') &&
    !e.includes('Failed to load resource') &&
    !e.includes('Mapbox access token') && // expected with dummy token
    !e.includes('CORS policy') && // expected from file:// protocol
    !e.includes('401') && // expected with dummy token
    !e.includes('loadMapboxGLEarly') // mapbox internal errors with dummy token
  );

  console.log('All console errors:', errors);
  console.log('Filtered errors:', realErrors);

  // Verify LayerChooser is present and visible
  const lcVisible = await page.evaluate(() => {
    const lc = window.layerChooser;
    if (!lc || !lc._container) return false;
    const rect = lc._container.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top >= 0;
  });
  expect(lcVisible).toBe(true);

  expect(realErrors).toEqual([]);
});
