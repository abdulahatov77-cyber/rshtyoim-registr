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
