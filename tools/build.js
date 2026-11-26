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
console.log('www/index.html', (html.length / 1024).toFixed(0) + ' KB');
