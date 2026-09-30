import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const path of ['index.html','styles.css','manifest.webmanifest','sw.js']) await copyFile(path, `dist/${path}`);
await cp('src','dist/src',{recursive:true});
await mkdir('dist/assets/art',{recursive:true});
await cp('assets/art/runtime','dist/assets/art/runtime',{recursive:true});
for (const path of ['icon.svg','icon-192.png','icon-512.png']) await copyFile(`assets/${path}`,`dist/assets/${path}`);
console.log('Static build ready in dist/ (original art and test files excluded).');
