// Unisce src/index.html, src/app.css e src/*.js in un unico www/index.html (nessun bundler).
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'src');
const out = path.join(__dirname, '..', 'www', 'index.html');

let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(src, 'app.css'), 'utf8');
const order = fs.readFileSync(path.join(src, 'order.txt'), 'utf8').split(/\s+/).filter(Boolean);
const js = order.map(f => `// ---- ${f}\n` + fs.readFileSync(path.join(src, f), 'utf8')).join('\n');

html = html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
// librerie locali (funzionano anche offline)
const nm = path.join(__dirname, '..', 'node_modules');
const vend = path.join(__dirname, '..', 'www', 'vendor');
fs.mkdirSync(path.join(vend, 'gradio'), { recursive: true });
for (const f of ['three.module.js', 'three.core.js']) {
  const p = path.join(nm, 'three', 'build', f);
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(vend, f));
}
const gdir = path.join(nm, '@gradio', 'client', 'dist');
if (fs.existsSync(gdir)) for (const f of fs.readdirSync(gdir)) if (f.endsWith('.js')) fs.copyFileSync(path.join(gdir, f), path.join(vend, 'gradio', f));
console.log('www/index.html', (html.length / 1024).toFixed(0) + ' KB');
