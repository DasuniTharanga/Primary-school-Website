import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { createApplication } from '../server/app.mjs';
import { config, root } from '../server/config.mjs';
import { createUser } from '../server/security.mjs';

// A fresh temporary database is used. Existing school data is never touched.
const directory = await mkdtemp(join(tmpdir(), 'meegahathanna-browser-'));
const cfg = config({
  production: false,
  dbPath: join(directory, 'school.db'),
  uploadPath: join(directory, 'uploads'),
  origin: 'http://127.0.0.1:3001',
});
const app = await createApplication(cfg);
await new Promise((resolveReady) => app.server.listen(0, '127.0.0.1', resolveReady));
const base = `http://127.0.0.1:${app.server.address().port}`;
cfg.origin = base;
await createUser(app.db, {
  name: 'School Administrator',
  email: 'admin@example.test',
  password: 'BrowserAdminPassword2026',
  role: 'ADMIN',
});
await createUser(app.db, {
  name: 'Content Editor',
  email: 'editor@example.test',
  password: 'BrowserEditorPassword2026',
  role: 'EDITOR',
});
const screenshotDir = resolve(root, 'test-results');
await mkdir(screenshotDir, { recursive: true });
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('status of 404'))
      errors.push(message.text());
  });
  page.on('dialog', (dialog) => dialog.accept());
  async function visit(path, expectHeading = true) {
    await page.goto(base + path);
    await page.waitForLoadState('networkidle');
    if (expectHeading) assert.ok(await page.locator('h1').count(), `Missing heading on ${path}`);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      false,
      `Horizontal overflow on ${path}`,
    );
    assert.deepEqual(
      await page.evaluate(() =>
        Array.from(document.images)
          .filter((img) => img.complete && img.currentSrc && img.naturalWidth === 0)
          .map((img) => img.currentSrc),
      ),
      [],
      `Broken images on ${path}`,
    );
  }
  const publicPages = [
    '/',
    '/about',
    '/classes',
    '/teachers',
    '/events',
    '/gallery',
    '/contact',
    '/admissions',
    '/notices',
    '/resources',
    '/privacy',
    '/login',
  ];
  for (const path of publicPages) await visit(path);
  await visit('/');
  await page.screenshot({ path: join(screenshotDir, 'home-desktop.png'), fullPage: true });
  await visit('/contact');
  await page.getByLabel('Full name *', { exact: true }).fill('Browser Test Parent');
  await page.getByLabel('Email address *', { exact: true }).fill('browser-parent@example.test');
  await page.getByLabel('Subject *', { exact: true }).selectOption('General enquiry');
  await page
    .getByLabel('Your message *', { exact: true })
    .fill('This message verifies the real school contact form.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByRole('heading', { name: 'Your message is with us.' }).waitFor();
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM messages').get().n, 1);
  await visit('/admissions');
  await page.getByLabel('Parent / guardian name *', { exact: true }).fill('Browser Test Parent');
  await page.getByLabel('Parent / guardian email *', { exact: true }).fill('parent@example.test');
  await page.getByLabel('Contact number *', { exact: true }).fill('0771234567');
  await page.getByLabel('Child’s full name *', { exact: true }).fill('Browser Test Child');
  await page.getByLabel('Child’s date of birth *', { exact: true }).fill('2020-01-12');
  await page.getByLabel('Enquiry for grade *', { exact: true }).selectOption('1');
  await page.getByLabel('Home address *', { exact: true }).fill('A test address in Sri Lanka');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Send enquiry', exact: true }).click();
  await page.getByRole('heading', { name: 'A little hello received.' }).waitFor();
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM admissions').get().n, 1);
  await visit('/admin');
  await page.waitForURL('**/login');
  await page.getByLabel('Email address', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserAdminPassword2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/admin');
  await page.getByRole('heading', { name: 'Hello, School.' }).waitFor();
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: join(screenshotDir, 'admin-dashboard.png'), fullPage: true });
  for (const path of [
    '/admin/content/notices',
    '/admin/content/events',
    '/admin/content/teachers',
    '/admin/content/classes',
    '/admin/content/gallery',
    '/admin/content/resources',
    '/admin/messages',
    '/admin/admissions',
    '/admin/settings',
    '/admin/users',
    '/admin/audit',
    '/admin/account',
  ])
    await visit(path);
  await visit('/admin/content/notices');
  await page.getByRole('button', { name: 'Add notice', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title *', { exact: true }).fill('Browser-tested notice');
  await dialog
    .getByLabel('Short description', { exact: true })
    .fill('A notice created from the staff dashboard.');
  await dialog
    .getByLabel('Full details', { exact: false })
    .fill('This notice was saved through the real UI and API.');
  await dialog.getByLabel('Publication status', { exact: true }).selectOption('published');
  await dialog.getByRole('button', { name: 'Save content', exact: true }).click();
  await page.getByText('Content saved successfully.', { exact: true }).waitFor();
  assert.ok(app.db.prepare('SELECT id FROM content WHERE title=?').get('Browser-tested notice'));
  await visit('/notices');
  await page.getByRole('link', { name: 'Browser-tested notice', exact: true }).click();
  await page.getByRole('heading', { name: 'Browser-tested notice', exact: true }).waitFor();
  assert.ok((await page.locator('.prose').textContent()).includes('real UI and API'));
  await visit('/admin/content/teachers');
  await page.getByRole('button', { name: /Edit / }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox').check();
  await dialog.getByLabel('Publication status', { exact: true }).selectOption('published');
  await dialog.getByRole('button', { name: 'Save content', exact: true }).click();
  await page.getByText('Content saved successfully.', { exact: true }).waitFor();
  const png = join(directory, 'school.png');
  await writeFile(
    png,
    await sharp({ create: { width: 600, height: 400, channels: 3, background: '#d6bea1' } })
      .png()
      .toBuffer(),
  );
  await visit('/admin/content/gallery');
  await page.getByRole('button', { name: 'Add photograph', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title *', { exact: true }).fill('A school photo');
  await dialog.locator('input[type=file]').setInputFiles(png);
  await dialog.locator('.upload-preview img').waitFor();
  await dialog.getByLabel('Publication status', { exact: true }).selectOption('published');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Save content', exact: true }).click();
  await page.getByText('Content saved successfully.', { exact: true }).waitFor();
  await visit('/gallery');
  await page.getByRole('button', { name: 'View A school photo' }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await visit('/admin/messages');
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Follow-up status', { exact: true }).selectOption('READ');
  await dialog
    .getByLabel('Internal follow-up notes', { exact: false })
    .fill('Reviewed in the browser smoke test.');
  await dialog.getByRole('button', { name: 'Save follow-up', exact: true }).click();
  await page.getByText('Enquiry updated.', { exact: true }).waitFor();
  await visit('/admin/content/notices');
  await page.getByRole('button', { name: 'Delete Browser-tested notice', exact: true }).click();
  await page.getByText('Item deleted.', { exact: true }).waitFor();
  assert.equal(
    app.db.prepare('SELECT id FROM content WHERE title=?').get('Browser-tested notice'),
    undefined,
  );
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL('**/login');
  await page.getByLabel('Email address', { exact: true }).fill('editor@example.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserEditorPassword2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/admin');
  assert.equal(await page.getByRole('link', { name: 'Staff accounts', exact: true }).count(), 0);
  await visit('/admin/messages', false);
  await page
    .getByRole('alert')
    .getByText('Administrator access is required to view enquiries.')
    .waitFor();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL('**/login');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of publicPages) await visit(path);
  await visit('/');
  await page.screenshot({ path: join(screenshotDir, 'home-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Classes', exact: true })
    .click();
  await page.waitForURL('**/classes');
  await page
    .getByRole('heading', { name: 'Little learners. Big possibilities.', exact: true })
    .waitFor();
  await visit('/login');
  await page.getByLabel('Email address', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserAdminPassword2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/admin');
  await page.waitForLoadState('networkidle');
  await page.getByRole('heading', { name: 'Hello, School.', exact: true }).waitFor();
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    false,
  );
  await page.getByRole('button', { name: 'Toggle staff navigation', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Staff navigation' })
    .getByRole('link', { name: 'Teachers', exact: true })
    .click();
  await page.waitForURL('**/admin/content/teachers');
  await page.getByRole('heading', { name: 'Teacher directory', exact: true }).waitFor();
  await page.waitForLoadState('networkidle');
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    false,
  );
  assert.deepEqual(errors, [], 'Browser JavaScript or CSP errors');
  console.log(
    'Browser checks passed: 12 public pages at desktop/mobile widths, all admin pages, real forms, login/logout, notice CRUD, teacher publication, gallery upload/lightbox, private inbox and editor permissions. Screenshots: test-results/',
  );
} finally {
  await browser?.close();
  await app.close();
  await rm(directory, { recursive: true, force: true });
}
