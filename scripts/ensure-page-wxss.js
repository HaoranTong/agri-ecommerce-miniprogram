const fs = require('fs');
const path = require('path');

const distRoot = path.resolve(process.cwd(), 'dist');
const appJsonPath = path.join(distRoot, 'app.json');

if (!fs.existsSync(appJsonPath)) {
  console.error('[ensure-page-wxss] dist/app.json not found. Run build first.');
  process.exit(1);
}

const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const pages = Array.isArray(appConfig.pages) ? appConfig.pages.slice() : [];

const subpackages = Array.isArray(appConfig.subpackages) ? appConfig.subpackages : [];
for (const pkg of subpackages) {
  if (!pkg || !pkg.root || !Array.isArray(pkg.pages)) continue;
  for (const page of pkg.pages) {
    pages.push(path.posix.join(pkg.root, page));
  }
}

const created = [];

for (const page of pages) {
  if (!page || typeof page !== 'string') continue;
  const wxssPath = path.join(distRoot, `${page}.wxss`);
  if (fs.existsSync(wxssPath)) continue;
  fs.mkdirSync(path.dirname(wxssPath), { recursive: true });
  fs.writeFileSync(wxssPath, '', 'utf8');
  created.push(wxssPath);
}

if (created.length > 0) {
  console.log(`[ensure-page-wxss] created ${created.length} missing wxss files.`);
} else {
  console.log('[ensure-page-wxss] no missing wxss files.');
}
