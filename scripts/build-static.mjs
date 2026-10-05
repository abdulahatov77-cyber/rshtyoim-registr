import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(projectRoot, 'dist');

// Vercel serves `dist`, so copy every browser asset there. API functions stay
// at the project root where Vercel packages them as serverless functions.
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const file of ['index.html', 'import.html', 'robots.txt', '_redirects']) {
  await cp(path.join(projectRoot, file), path.join(outputDir, file));
}

for (const directory of ['css', 'img', 'js']) {
  await cp(path.join(projectRoot, directory), path.join(outputDir, directory), {
    recursive: true,
  });
}

// Kesh: JS/CSS fayllar 1 yil "immutable" keshlanadi. Har bir `?v=...` ni fayl mazmunining
// xeshi bilan almashtiramiz — fayl o'zgarsa versiya o'zi o'zgaradi, qo'lda oshirish
// esdan chiqib, brauzer eski kodni ishlatib qolmaydi. Zanjir (index → bootstrap → router →
// sahifalar) uchun bir necha marta o'tamiz.
{
  const { readFile, writeFile, readdir } = await import('node:fs/promises');
  const { createHash } = await import('node:crypto');
  const listJs = async (dir) => (await readdir(dir, { withFileTypes: true, recursive: true }))
    .filter((e) => e.isFile() && e.name.endsWith('.js'))
    .map((e) => path.join(e.parentPath ?? e.path, e.name));
  const files = [path.join(outputDir, 'index.html'), ...(await listJs(path.join(outputDir, 'js')))];
  const hashOf = async (rel) => {
    try {
      const buf = await readFile(path.join(outputDir, rel));
      return createHash('sha256').update(buf).digest('hex').slice(0, 10);
    } catch { return null; }
  };
  const re = /((?:js|css)\/[\w./-]+\.(?:js|css))\?v=[\w.-]+/g;
  for (let pass = 0; pass < 4; pass++) {
    for (const file of files) {
      const src = await readFile(file, 'utf8');
      const self = path.relative(outputDir, file).split(path.sep).join('/');
      // O'ziga havola (izohdagi namuna) xeshni har safar o'zgartirib yuboradi — tashlab ketamiz
      const refs = [...new Set([...src.matchAll(re)].map((m) => m[1]))].filter((r) => r !== self);
      if (!refs.length) continue;
      const map = {};
      for (const r of refs) map[r] = await hashOf(r);
      const out = src.replace(re, (m, r) => (r !== self && map[r] ? `${r}?v=${map[r]}` : m));
      if (out !== src) await writeFile(file, out);
    }
  }
}
