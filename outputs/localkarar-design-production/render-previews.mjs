import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const path = join(dir, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});

await new Promise(resolve => server.listen(4177, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1600 }, deviceScaleFactor: 1 });

const captures = [
  ['?view=board', 'LOCALKARAR_VISUAL_LANGUAGE_BOARD.png', 1880, 1500],
  ['?view=family', 'LOCALKARAR_DESKTOP_LIGHT_FAMILY_SHEET.png', 1740, 2300]
];

for (const [query, file, width, height] of captures) {
  await page.setViewportSize({ width, height });
  await page.goto(`http://127.0.0.1:4177/${query}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(dir, file), fullPage: true });
}

for (const slug of ['dashboard','course-player','decision-receipt','finance-center','model-workspace','ai-mentor','news','admin']) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:4177/?view=screen&screen=${slug}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(dir, `screen-${slug}.png`) });
}

await browser.close();
await new Promise(resolve => server.close(resolve));
