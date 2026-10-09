import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = (path, encoding = 'utf8') => readFile(new URL('../' + path, import.meta.url), encoding);
const welcomeCSS = await load('invite-app/styles/welcome/welcome.css');
const responsiveCSS = await load('invite-app/styles/responsive.css');
const coverRule = welcomeCSS.match(/\.welcome\s*\{([^}]*)\}/)?.[1];
const wallpaperRule = welcomeCSS.match(/\.welcome__wallpaper\s*\{([^}]*)\}/)?.[1];
const mobileRule = responsiveCSS.match(/@media \(max-width: 699px\)\s*\{\s*\/\*[^]*?\*\/\s*\.welcome__wallpaper\s*\{([^}]*)\}/)?.[1];
const shortCoverRule = responsiveCSS.match(/@media \(max-width: 699px\) and \(max-height: 760px\)\s*\{\s*\.welcome\s*\{([^}]*)\}/)?.[1];

test('Welcome wallpaper keeps its asset, layers, centering, opacity and original desktop zoom', () => {
  assert.ok(wallpaperRule);
  for (const declaration of [
    /position:\s*absolute;/, /inset:\s*0;/, /z-index:\s*0;/,
    /opacity:\s*0\.35;/, /transform:\s*scale\(2\.1\);/,
    /background-image:\s*var\(--asset-floral-wallpaper\);/,
    /background-position:\s*center;/, /background-repeat:\s*no-repeat;/,
    /background-size:\s*auto max\(100%, calc\(100vw \/ 2\.1\)\);/,
    /pointer-events:\s*none;/,
  ]) assert.match(wallpaperRule, declaration);
  assert.doesNotMatch(wallpaperRule, /animation|transition|background-attachment:\s*fixed/);
});

test('Welcome mobile wallpaper retains untransformed cover sizing', () => {
  assert.ok(mobileRule);
  assert.match(mobileRule, /background-size:\s*cover;/);
  assert.match(mobileRule, /transform:\s*none;/);
});

test('Welcome compact cover grows with content without changing padding or alignment', () => {
  assert.ok(shortCoverRule);
  assert.match(shortCoverRule, /height:\s*auto;/);
  assert.match(shortCoverRule, /min-height:\s*100svh;/);
  assert.match(shortCoverRule, /padding:\s*1\.25rem\s+1\.5rem;/);
  assert.doesNotMatch(shortCoverRule, /overflow(?:-[xy])?\s*:/);
  assert.doesNotMatch(shortCoverRule, /(?:^|[;\s])height:\s*100svh;|max-height|place-items|align-items|margin/);
  assert.match(welcomeCSS, /\.welcome\s*\{[^}]*display:\s*grid;[^}]*place-items:\s*center;/);
});

test('Welcome clips decorative overflow instead of creating an extra cover scrollport', () => {
  assert.ok(coverRule);
  assert.match(coverRule, /overflow:\s*clip;/);
  assert.match(coverRule, /min-height:\s*100svh;/);
  assert.doesNotMatch(coverRule, /(?:^|[;\s])height:\s*\d|max-height/);
  // A responsive override must not turn clip back into hidden/auto scrolling.
  for (const [, declarations] of responsiveCSS.matchAll(/\.welcome\s*\{([^}]*)\}/g)) {
    assert.doesNotMatch(declarations, /overflow(?:-[xy])?\s*:/);
  }
});

test('Welcome lower circle retains its design but must not expose space past the wallpaper', () => {
  const circle = welcomeCSS.match(/(?:^|})\s*\.welcome::after\s*\{([^}]*)\}/)?.[1];
  assert.ok(circle);
  assert.match(circle, /right:\s*-12rem;/);
  assert.match(circle, /bottom:\s*-14rem;/);
  // This positive block-end overflow used to add space with overflow-y: auto.
  // Check the CSS contract only: this is not proof of a browser render.
  assert.match(coverRule, /overflow:\s*clip;/);
  assert.match(wallpaperRule, /inset:\s*0;/);
  assert.match(mobileRule, /background-size:\s*cover;/);
});

test('Welcome desktop sizing is tied to the existing square wallpaper asset', async () => {
  const asset = 'images/wallpaper_floral_vitoriano_vintage_2508x2508.webp';
  const variables = await load('invite-app/styles/base/variables.css');
  assert.ok(variables.includes('url("../../' + asset + '")'));
  const image = await load('invite-app/' + asset, null);
  assert.equal(image.toString('ascii', 0, 4), 'RIFF');
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');
  assert.equal(image.toString('ascii', 12, 16), 'VP8X');
  assert.equal(image.readUIntLE(24, 3) + 1, 2508);
  assert.equal(image.readUIntLE(27, 3) + 1, 2508);
});

// Model the verified CSS sizing for this square asset, not a browser render.
// Height represents the whole cover (including content and existing padding).
const cases = [
  { label: '320px compact', width: 320, viewportHeight: 568, coverHeight: 900 },
  { label: '375px compact', width: 375, viewportHeight: 667, coverHeight: 1000 },
  { label: '390px compact', width: 390, viewportHeight: 700, coverHeight: 1100 },
  { label: '390px tall with short content', width: 390, viewportHeight: 844, coverHeight: 844 },
  { label: '390px tall with long names', width: 390, viewportHeight: 844, coverHeight: 1400 },
  { label: 'wide mobile landscape', width: 699, viewportHeight: 320, coverHeight: 700 },
  { label: 'portrait desktop', width: 1024, viewportHeight: 1440, coverHeight: 1440 },
  { label: 'regular desktop', width: 1440, viewportHeight: 900, coverHeight: 900 },
  { label: 'ultrawide desktop', width: 2560, viewportHeight: 720, coverHeight: 720 },
  { label: 'desktop with overflowing content', width: 1440, viewportHeight: 720, coverHeight: 1800 },
];
for (const { label, width, viewportHeight, coverHeight } of cases) {
  test('Welcome wallpaper modeled coverage: ' + label, () => {
    assert.ok(coverHeight >= viewportHeight);
    const mobile = width <= 699;
    const desktopZoom = Number(wallpaperRule.match(/scale\(([\d.]+)\)/)[1]);
    const sizeDivisor = Number(wallpaperRule.match(/100vw \/ ([\d.]+)/)[1]);
    assert.equal(sizeDivisor, desktopZoom);
    const side = mobile
      ? Math.max(width, coverHeight)
      : Math.max(coverHeight, width / sizeDivisor) * desktopZoom;
    // Both centered axes are covered; using auto preserves the asset's 1:1 ratio.
    assert.ok(side >= width - 1e-9);
    assert.ok(side >= coverHeight - 1e-9);
    if (!mobile && width <= coverHeight * desktopZoom) {
      assert.equal(side, coverHeight * desktopZoom, 'Existing desktop framing stays unchanged');
    }
  });
}
