import {build} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pages} from '../src/content.js';
await build();
const html=await readFile('dist/index.html','utf8');
for(const [slug,title] of pages){if(!slug)continue;await mkdir(`dist/${slug}`,{recursive:true});await writeFile(`dist/${slug}/index.html`,html.replace(/<title>.*?<\/title>/,`<title>${title} | Soft Binomials India</title>`));}
await writeFile('dist/404.html',html);
console.log(`Built ${pages.length} page entry points.`);
