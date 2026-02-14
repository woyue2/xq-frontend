import fs from 'node:fs';
import path from 'node:path';

const targetDir = process.argv[2];

if (!targetDir) {
  // eslint-disable-next-line no-console
  console.error('usage: node fix-esm-specifiers.mjs <dist-dir>');
  process.exit(1);
}

const ABS = path.resolve(process.cwd(), targetDir);

const hasExt = (value) => /\.(mjs|cjs|js|json)$/i.test(value);

const patchContent = (content) => {
  let next = content;

  // import/export ... from "./x"
  next = next.replace(
    /(from\s+['"])(\.{1,2}\/[^'"\n]+)(['"])/g,
    (_all, head, spec, tail) => (hasExt(spec) ? `${head}${spec}${tail}` : `${head}${spec}.js${tail}`)
  );

  // import("./x")
  next = next.replace(
    /(import\(\s*['"])(\.{1,2}\/[^'"\n]+)(['"]\s*\))/g,
    (_all, head, spec, tail) => (hasExt(spec) ? `${head}${spec}${tail}` : `${head}${spec}.js${tail}`)
  );

  return next;
};

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.js')) {
      continue;
    }
    const raw = fs.readFileSync(full, 'utf8');
    const patched = patchContent(raw);
    if (patched !== raw) {
      fs.writeFileSync(full, patched, 'utf8');
    }
  }
};

walk(ABS);

// eslint-disable-next-line no-console
console.log(`patched esm specifiers in ${ABS}`);
