// Builds the trainer into dist/: one script, one stylesheet, plain files.
//   node build.mjs           build once
//   node build.mjs --serve   build, serve on http://localhost:8080 and rebuild on changes
//
// The script is a classic (non-module) bundle, so dist/index.html also opens
// straight from the disk by double-click, with no web server.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, watch, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src'), pub = join(root, 'public'), dist = join(root, 'dist');
const serve = process.argv.includes('--serve');

function files(dir) {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

async function build() {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  cpSync(pub, dist, { recursive: true });

  await esbuild.build({
    entryPoints: [join(src, 'main.jsx')],
    outfile: join(dist, 'app.js'),
    bundle: true, format: 'iife', target: 'es2019',
    jsx: 'automatic', minify: !serve, sourcemap: serve ? 'inline' : false,
    define: { 'process.env.NODE_ENV': serve ? '"development"' : '"production"' },
    logLevel: 'warning',
  });
  execFileSync(process.execPath, [
    join(root, 'node_modules', '@tailwindcss', 'cli', 'dist', 'index.mjs'),
    '-i', join(src, 'styles.css'), '-o', join(dist, 'app.css'), ...(serve ? [] : ['--minify']),
  ], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });

  // one version stamp for the page and the offline cache: a new build is a new cache
  const hash = createHash('sha1');
  for (const f of ['app.js', 'app.css']) hash.update(readFileSync(join(dist, f)));
  const version = hash.digest('hex').slice(0, 10);
  writeFileSync(join(dist, 'index.html'), readFileSync(join(src, 'index.html'), 'utf8').replaceAll('__VERSION__', version));
  const shell = ['./', ...files(dist).map(f => relative(dist, f).replaceAll('\\', '/')).filter(f => f !== 'sw.js')];
  const sw = readFileSync(join(pub, 'sw.js'), 'utf8').replace('__VERSION__', version).replace('__SHELL__', JSON.stringify(shell));
  writeFileSync(join(dist, 'sw.js'), sw);
  const kb = f => `${(statSync(join(dist, f)).size / 1024).toFixed(0)} kB`;
  console.log(`built dist/  app.js ${kb('app.js')}  app.css ${kb('app.css')}  version ${version}`);
}

await build();

if (serve) {
  const ctx = await esbuild.context({});
  const { port } = await ctx.serve({ servedir: dist, port: 8080 });
  console.log(`http://localhost:${port}  (rebuilds when a file in src/ or public/ changes)`);
  let timer = null, busy = false;
  const again = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (busy) return again();
      busy = true;
      try { await build(); } catch (e) { console.error(e.message); }
      busy = false;
    }, 150);
  };
  for (const dir of [src, pub]) watch(dir, { recursive: true }, again);
}
