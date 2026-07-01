import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const gitPrerenderDir = path.join(__dirname, 'prerendered-html');

const PORT = 5188;

const routes = [
  '/',
  '/contact',
  '/portfolio',
  '/linkedin',
  '/agency',
  '/enterprise',
  '/devops-delivery',
  '/freelance-fit-advisor',
  '/privacy',
  '/security',
  '/terms',
  '/refund-policy',
  '/cancellation-refund-policy',
  '/shipping-policy',
  '/digital-delivery-policy',
  '/invoice-generator',
  '/blog/how-to-create-invoice-india',
  '/blog/gst-invoice-format-india',
  '/gst-invoice-generator',
  '/online-invoice-maker-india',
  '/freelance-invoice-software',
  '/payment-reminder-software',
  '/razorpay-invoice-payment-tracking',
  '/freelancers',
  '/workflows/freelancers',
  '/developers',
  '/workflows/developers',
  '/designers',
  '/workflows/designers',
  '/agencies',
  '/workflows/agencies',
  '/consultants',
  '/workflows/consultants'
];

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

// Simple native file server to serve built SPA files
const server = http.createServer((req, res) => {
  let requestedPath = req.url || '/';
  
  // Strip query parameters
  const qMark = requestedPath.indexOf('?');
  if (qMark !== -1) {
    requestedPath = requestedPath.substring(0, qMark);
  }

  let filePath = path.join(distDir, requestedPath === '/' ? 'index.html' : requestedPath);

  // SPA fallback: if file does not exist, serve index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath);
  let contentType = 'text/html';
  if (ext === '.js') contentType = 'text/javascript';
  else if (ext === '.css') contentType = 'text/css';
  else if (ext === '.svg') contentType = 'image/svg+xml';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.json') contentType = 'application/json';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading file');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

async function run() {
  const IS_CI_BUILD = !!(process.env.VERCEL || process.env.NETLIFY || process.env.CI || process.env.GITHUB_ACTIONS);

  if (IS_CI_BUILD) {
    console.log('[Prerender] CI Build detected (Vercel/CI). Skipping Puppeteer rendering.');
    if (fs.existsSync(gitPrerenderDir)) {
      console.log(`[Prerender] Copying pre-rendered static pages from ${gitPrerenderDir} to ${distDir}...`);
      copyFolderSync(gitPrerenderDir, distDir);
      console.log('[Prerender] Copy complete.');
    } else {
      console.warn('[Prerender] Warning: pre-rendered static pages directory does not exist. No static pages copied.');
    }
    process.exit(0);
  }

  console.log(`[Prerender] Starting server on port ${PORT}...`);
  await new Promise((resolve) => server.listen(PORT, resolve));

  let browser;
  try {
    console.log('[Prerender] Launching headless browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } catch (err) {
    console.warn('[Prerender] Failed to launch Chrome (expected in Vercel/CI environments). Falling back to pre-rendered git cache.');
    if (fs.existsSync(gitPrerenderDir)) {
      console.log(`[Prerender] Copying pre-rendered static pages from ${gitPrerenderDir} to ${distDir}...`);
      copyFolderSync(gitPrerenderDir, distDir);
      console.log('[Prerender] Copy complete.');
    } else {
      console.warn('[Prerender] Warning: pre-rendered static pages directory does not exist. No static pages copied.');
    }
    server.close();
    return;
  }

  const page = await browser.newPage();

  // Clear or recreate the git backup directory locally
  if (fs.existsSync(gitPrerenderDir)) {
    fs.rmSync(gitPrerenderDir, { recursive: true, force: true });
  }
  fs.mkdirSync(gitPrerenderDir, { recursive: true });

  for (const route of routes) {
    console.log(`[Prerender] Render route: ${route}`);
    
    // Visit local server
    await page.goto(`http://localhost:${PORT}${route}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait a brief moment to ensure React has fully rendered and settled
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Extract the fully rendered HTML
    const content = await page.content();

    // Write to standard output dist directory
    let targetPath;
    let backupPath;
    if (route === '/') {
      targetPath = path.join(distDir, 'index.html');
      backupPath = path.join(gitPrerenderDir, 'index.html');
    } else {
      const outputDir = path.join(distDir, route);
      const backupDir = path.join(gitPrerenderDir, route);
      
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      targetPath = path.join(outputDir, 'index.html');
      backupPath = path.join(backupDir, 'index.html');
    }

    fs.writeFileSync(targetPath, content);
    fs.writeFileSync(backupPath, content);
    console.log(`[Prerender] Wrote html to dist and copy to git: ${targetPath}`);
  }

  console.log('[Prerender] Cleaning up...');
  await browser.close();
  server.close();
  console.log('[Prerender] Done successfully! Pre-rendered pages are cached in git history.');
}

run().catch((err) => {
  console.error('[Prerender] Failed:', err);
  server.close();
  process.exit(1);
});
