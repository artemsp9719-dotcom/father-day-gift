import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Uses the existing bundled Playwright and the installed Edge in a separate,
// headless profile. It never attaches to the user's tabs or saved browser data.
const playwrightPath = process.env.FATHER_DAY_PLAYWRIGHT || 'C:/Users/ger12/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const { chromium } = await import(pathToFileURL(playwrightPath).href);
const root = fileURLToPath(new URL('../', import.meta.url));
const qa = path.join(root, 'qa', process.argv[2] || 'celebration');
await fs.mkdir(qa, { recursive: true });
const result = { screens: [], checks: [], errors: [], warnings: [], failedRequests: [] };
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

function observe(page, label) {
  page.on('pageerror', error => result.errors.push({ label, message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') result.errors.push({ label, message: message.text() });
    if (message.type() === 'warning') result.warnings.push({ label, message: message.text() });
  });
  page.on('requestfailed', request => result.failedRequests.push({ label, url: request.url(), error: request.failure()?.errorText }));
}

async function scrollToProgress(page, progress) {
  await page.evaluate(value => {
    const story = document.querySelector('.story');
    const viewport = document.querySelector('.viewport');
    window.scrollTo(0, story.offsetTop + value * (story.offsetHeight - viewport.offsetHeight));
  }, progress);
  await page.waitForFunction(value => Math.abs(Number(document.querySelector('.viewport').dataset.progress) - value) < 0.002, progress);
  // Two frames allow the Three.js render loop to consume the DOM timeline.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function capture(page, label, progress) {
  await scrollToProgress(page, progress);
  const metrics = await page.evaluate(() => {
    const styles = getComputedStyle(document.querySelector('.viewport'));
    const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
    return {
      viewport: { width: innerWidth, height: innerHeight, density: devicePixelRatio },
      progress: Number(document.querySelector('.viewport').dataset.progress),
      open: Number(styles.getPropertyValue('--curtain-open')),
      garlands: Number(styles.getPropertyValue('--garland-light')),
      spotlight: Number(styles.getPropertyValue('--spotlight')),
      stageBrightness: Number(styles.getPropertyValue('--stage-brightness')),
      heroOpacity: Number(styles.getPropertyValue('--hero-opacity')),
      letterOpacity: Number(styles.getPropertyValue('--note-opacity')),
      signatureOpacity: Number(styles.getPropertyValue('--signature-opacity')),
      model: document.querySelector('canvas').dataset.model,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      title: rect('.intro-title'), letter: rect('.letter-inner'),
      leftCurtain: rect('.curtain-left'), rightCurtain: rect('.curtain-right'),
      canvas: { width: document.querySelector('canvas').width, height: document.querySelector('canvas').height },
    };
  });
  const filename = `${label}.png`;
  await page.screenshot({ path: path.join(qa, filename), fullPage: false });
  result.screens.push({ label, filename, ...metrics });
  if (metrics.horizontalOverflow) result.errors.push({ label, message: 'Horizontal overflow' });
  if (progress === 1 && (metrics.letter.bottom > metrics.viewport.height || metrics.letter.top < 0)) {
    result.errors.push({ label, message: 'Final letter is clipped' });
  }
  return metrics;
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  observe(page, 'desktop');
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.model === 'custom');
  await capture(page, 'desktop-start', 0);
  await capture(page, 'desktop-opening', 0.15);
  const garlands = await capture(page, 'desktop-garlands', 0.20);
  if (garlands.garlands < 0.8 || garlands.spotlight > 0.01) result.errors.push({ label: 'lighting', message: 'Garlands must switch on before the spotlight' });
  await capture(page, 'desktop-spotlight-rising', 0.28);
  await capture(page, 'desktop-dance', 0.38);
  await page.waitForTimeout(550);
  await page.screenshot({ path: path.join(qa, 'desktop-dance-next.png'), fullPage: false });
  await capture(page, 'desktop-letter', 1);
  await page.keyboard.press('Home');
  await page.waitForFunction(() => Number(document.querySelector('.viewport').dataset.progress) < 0.002);
  result.checks.push('Home returns to closed curtains');
  await page.mouse.wheel(0, 700);
  await page.waitForFunction(() => Number(document.querySelector('.viewport').dataset.progress) > 0.25);
  result.checks.push('Mouse wheel opens curtains');
  await page.keyboard.press('End');
  await page.waitForFunction(() => Number(document.querySelector('.viewport').dataset.progress) > 0.998);
  result.checks.push('End reaches complete letter');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'mobile-letter-after-resize', 1);
  result.checks.push('Canvas survives desktop-to-mobile resize');
  await context.close();

  for (const spec of [{ label: 'mobile', width: 390, height: 844 }, { label: 'small', width: 320, height: 568 }]) {
    const context = await browser.newContext({ viewport: spec, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    observe(page, spec.label);
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.model === 'custom');
    await capture(page, `${spec.label}-start`, 0);
    await capture(page, `${spec.label}-garlands`, 0.20);
    await capture(page, `${spec.label}-dance`, 0.38);
    await capture(page, `${spec.label}-letter`, 1);
    await context.close();
  }

  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const reducedPage = await reducedContext.newPage();
  observe(reducedPage, 'reduced-motion');
  await reducedPage.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await reducedPage.waitForFunction(() => document.querySelector('canvas')?.dataset.model === 'custom');
  await capture(reducedPage, 'reduced-letter', 1);
  await reducedPage.screenshot({ path: path.join(qa, 'reduced-still-a.png') });
  await reducedPage.waitForTimeout(500);
  await reducedPage.screenshot({ path: path.join(qa, 'reduced-still-b.png') });
  result.checks.push('Reduced-motion scene captured twice for stillness comparison');
  await reducedContext.close();

  const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const fallbackPage = await fallbackContext.newPage();
  await fallbackPage.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return original.call(this, type, ...args);
    };
  });
  await fallbackPage.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await fallbackPage.locator('.character-fallback').waitFor({ state: 'attached' });
  await fallbackPage.evaluate(() => document.fonts.ready);
  await capture(fallbackPage, 'mobile-no-webgl-letter', 1);
  result.checks.push('No-WebGL fallback portrait loads and letter remains available');
  await fallbackContext.close();
} catch (error) {
  result.errors.push({ label: 'runner', message: error.stack });
} finally {
  await browser.close();
  await fs.writeFile(path.join(qa, 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ screenshots: result.screens.length, checks: result.checks, errors: result.errors, warnings: result.warnings, failedRequests: result.failedRequests }, null, 2));
  if (result.errors.length) process.exitCode = 1;
}
