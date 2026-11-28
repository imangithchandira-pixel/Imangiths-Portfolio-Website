import { test, expect, type Page } from '@playwright/test';
import { PROJECTS, SITE } from '../src/data/site';

/* Every page must load with no script errors and nothing blocked by the
   Content Security Policy. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    const text = m.text();
    if (/Content.Security.Policy|Refused to/i.test(text)) problems.push(`csp: ${text}`);
    else if (m.type() === 'error' && !/status of 404/.test(text)) problems.push(`console: ${text}`);
  });
  return problems;
}

const pages = ['/', '/projects', '/about', ...PROJECTS.map((p) => `/projects/${p.slug}`)];

for (const path of pages) {
  test(`${path} loads cleanly`, async ({ page }) => {
    const problems = watch(page);
    const res = await page.goto(path, { waitUntil: 'networkidle' });
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('meta[http-equiv="content-security-policy"]')).toHaveCount(1);
    // every image actually loaded
    const broken = await page.$$eval('img', (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc));
    expect(broken).toEqual([]);
    expect(problems).toEqual([]);
  });
}

test('unknown pages get the 404 page', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('link', { name: 'Back to the map' })).toBeVisible();
});

test('home map: every piece is a link to its project, and the map is on screen without waiting for script', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('.map__link');
  await expect(links).toHaveCount(PROJECTS.reduce((n, p) => n + p.nodes.length, 0));
  for (const p of PROJECTS) await expect(page.locator(`.map__link[href="/projects/${p.slug}"]`).first()).toHaveAttribute('aria-label', p.title);
  const transform = await page.locator('.map__world').evaluate((el) => getComputedStyle(el).transform);
  expect(transform).not.toBe('none');
});

test('home map: keyboard and wheel move the camera, and it comes to rest', async ({ page, isMobile }) => {
  test.skip(isMobile, 'wheel and keys are desktop input');
  await page.goto('/');
  const world = page.locator('.map__world');
  const before = await world.evaluate((el) => getComputedStyle(el).transform);
  await page.locator('[data-map]').focus();
  const ls = await world.evaluate((el) => el.style.getPropertyValue('--ls'));
  await page.keyboard.press('+');
  await expect.poll(() => world.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);
  // Once it comes to rest, the park's hairlines are redrawn for the new scale.
  await expect.poll(() => world.evaluate((el) => el.style.getPropertyValue('--ls')), { timeout: 5000 }).not.toBe(ls);
  await expect(world).not.toHaveClass(/is-zooming/);
  // the wheel zooms too
  const zoomed = await world.evaluate((el) => getComputedStyle(el).transform);
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => world.evaluate((el) => getComputedStyle(el).transform)).not.toBe(zoomed);
});

test('pages do not jump about while loading (CLS)', async ({ page }) => {
  for (const path of pages) {
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
          if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls, `layout shift on ${path}`).toBeLessThan(0.1);
  }
});

test('projects page lists every project in order', async ({ page }) => {
  await page.goto('/projects');
  for (const p of PROJECTS) await expect(page.locator(`a[href="/projects/${p.slug}"]`)).toContainText(p.title);
});

test('a project page links on to the next project', async ({ page }) => {
  const [first, second] = PROJECTS;
  await page.goto(`/projects/${first.slug}`);
  await expect(page.locator('h1')).toHaveText(first.title);
  await page.getByRole('navigation', { name: 'Next project' }).getByRole('link').click();
  await expect(page).toHaveURL(new RegExp(`/projects/${second.slug}$`));
});

test('contact form validates each step and sends the note', async ({ page }) => {
  const problems = watch(page);
  let sent: Record<string, unknown> | null = null;
  // Never reaches the real Web3Forms: nothing is emailed.
  await page.route('https://api.web3forms.com/submit', async (route) => {
    sent = JSON.parse(route.request().postData() || '{}');
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"success":true}' });
  });
  await page.goto('/about');
  const next = page.locator('[data-next]');
  await next.click();
  await expect(page.locator('#f-name')).toHaveAttribute('aria-invalid', 'true');
  await page.fill('#f-name', 'Test Visitor');
  await page.fill('#f-email', 'visitor@example.com');
  await next.click();
  await page.locator('label', { hasText: 'A collaboration' }).click();
  await next.click();
  await page.fill('#f-message', 'Hello from the test suite.');
  await expect(next).toHaveText('Send');
  await next.click();
  await expect(page.locator('[data-thanks]')).toHaveText('Thank you, Test.');
  await expect(page.locator('[data-sent]')).toBeVisible();
  expect(sent).toMatchObject({ access_key: SITE.formKey, name: 'Test Visitor', email: 'visitor@example.com', reason: 'A collaboration', botcheck: false });
  expect(problems).toEqual([]);
});

test('text and images still appear when JavaScript is off', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/projects/malaga');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.media img').first()).toBeVisible();
  await page.goto('/');
  await expect(page.locator('.map__link').first()).toBeVisible();
  await ctx.close();
});

test('security headers are sent with every page', async ({ request }) => {
  for (const path of ['/', '/about', '/no-such-page']) {
    const res = await request.get(path);
    const h = res.headers();
    expect(h['content-security-policy'], path).toContain("frame-ancestors 'none'");
    expect(h['x-frame-options'], path).toBe('DENY');
    expect(h['x-content-type-options'], path).toBe('nosniff');
    expect(h['strict-transport-security'], path).toContain('max-age=63072000');
  }
});

test('addresses are clean: no .html, no trailing slash', async ({ request }) => {
  for (const [from, to] of [['/about.html', '/about'], ['/about/', '/about'], [`/projects/${PROJECTS[0].slug}.html`, `/projects/${PROJECTS[0].slug}`]]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBeGreaterThanOrEqual(301);
    expect(res.status(), from).toBeLessThanOrEqual(308);
    expect(new URL(res.headers()['location'], 'http://x').pathname, from).toBe(to);
  }
});

test('old single-page links redirect to the new project pages', async ({ request }) => {
  const slug = PROJECTS[0].slug;
  for (const [from, to] of [[`/project.html?p=${slug}`, `/projects/${slug}`], [`/project?p=${slug}`, `/projects/${slug}`], ['/project.html', '/projects'], ['/project?p=../evil', '/projects']]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    expect(res.headers()['location'], from).toBe(to);
  }
});

test('built files are cached for a year', async ({ request, page }) => {
  await page.goto('/');
  const asset = await page.$$eval('[src^="/_astro/"], [href^="/_astro/"], [srcset*="/_astro/"]', (els) =>
    els.map((e) => e.getAttribute('src') || e.getAttribute('href') || (e.getAttribute('srcset') || '').split(' ')[0]).find(Boolean)
  );
  expect(asset).toBeTruthy();
  const res = await request.get(asset!);
  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toContain('immutable');
});
