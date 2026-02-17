import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: '**/*.playwright.mjs',
  testDir: './test',
});
