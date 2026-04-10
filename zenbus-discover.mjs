import puppeteer from 'puppeteer';

const URL = 'https://zenbus.net/publicapp/web/gpso?line=343890001&stop=5366312231501824&itinerary=5426824545828864';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

const requests = [];

// Capture ALL requests to zenbus
page.on('request', (req) => {
  const url = req.url();
  if (url.includes('zenbus') && !url.includes('.png') && !url.includes('.jpg') && !url.includes('.css') && !url.includes('.js') && !url.includes('sprite') && !url.includes('style.json') && !url.includes('maps/')) {
    requests.push({ url, method: req.method(), headers: req.headers() });
  }
});

const responses = [];
page.on('response', async (response) => {
  const url = response.url();
  if (url.includes('zenbus') && !url.includes('.png') && !url.includes('.jpg') && !url.includes('.css') && !url.includes('.js') && !url.includes('sprite') && !url.includes('style.json') && !url.includes('maps/')) {
    try {
      const text = await response.text();
      responses.push({ url, status: response.status(), contentType: response.headers()['content-type'], body: text.slice(0, 5000) });
    } catch {}
  }
});

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 8000));

console.log('=== ALL ZENBUS REQUESTS ===');
for (const r of requests) {
  console.log(`${r.method} ${r.url}`);
}

console.log('\n=== ALL ZENBUS RESPONSES ===');
for (const r of responses) {
  console.log(`\n--- ${r.url} [${r.status}] ${r.contentType}`);
  console.log(r.body);
}

await browser.close();
