import {build} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pages} from '../src/content.js';
await build();
const html=await readFile('dist/index.html','utf8');
for(const [slug,title] of pages){if(!slug)continue;await mkdir(`dist/${slug}`,{recursive:true});await writeFile(`dist/${slug}/index.html`,html.replace(/<title>.*?<\/title>/,`<title>${title} | Soft Binomials India</title>`));}
await writeFile('dist/404.html',html);
// Review copy of the admin console at /demo/: same build, sample data only (see admin/main.js).
await mkdir('dist/demo',{recursive:true});
await writeFile('dist/demo/index.html',(await readFile('dist/admin/index.html','utf8')).replace(/<title>.*?<\/title>/,'<title>Admin console (review copy) | Soft Binomials India</title>'));
console.log(`Built ${pages.length} page entry points.`);
