import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, 'dist');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of ['index.html', 'styles.css', 'app.js', 'config.js']) {
  await cp(join(root, file), join(output, file));
}

await cp(join(root, 'images'), join(output, 'images'), { recursive: true });
console.log('Cloudflare Pages static assets built in ./dist');
