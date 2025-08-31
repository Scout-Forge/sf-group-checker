import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { toSlug, nationPathSlug } from './slug.js';

const SRC = process.env.ALL_JSON || 'all-groups.json';
const OUT = path.join('dist', 'api', 'v2');

function sortByName(arr) {
  return [...arr].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

function idFor(nationName, unitName, districtName) {
  const n = nationPathSlug(nationName);
  const u = unitName ? `/${toSlug(unitName)}` : '';
  const d = districtName ? `/${toSlug(districtName)}` : '';
  return `${n}${u}${d}`;
}

async function writeJSON(relPath, obj) {
  const full = path.join(OUT, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  const json = JSON.stringify(obj, null, 2) + '\n';
  await fs.writeFile(full, json, 'utf8');
}

function hrefFor(parts) {
  // build a URL-like path under /api/v2/... with forward slashes
  const rel = parts.join('/');
  return `/api/v2/${rel}`;
}

async function loadSource() {
  const raw = await fs.readFile(SRC, 'utf8');
  return JSON.parse(raw);
}

async function listFiles(dir, base = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      files.push(...await listFiles(full, base));
    } else {
      files.push(path.relative(base, full));
    }
  }
  return files;
}

async function writeManifest() {
  // compute sha1 across all emitted files except manifest.json
  const base = OUT;
  const files = (await listFiles(base)).filter(f => f !== 'manifest.json').sort();
  const hash = crypto.createHash('sha1');
  for (const rel of files) {
    const content = await fs.readFile(path.join(base, rel));
    hash.update(rel);
    hash.update('\n');
    hash.update(content);
    hash.update('\n');
  }
  const sha1 = hash.digest('hex');
  const manifest = {
    version: 2,
    generated: new Date().toISOString(),
    sha1,
  };
  await writeJSON('manifest.json', manifest);
}

async function main() {
  const src = await loadSource();
  await fs.mkdir(OUT, { recursive: true });

  // Nations list
  const nations = sortByName(src.nations ?? []);
  const nationsList = nations.map(n => {
    const nid = nationPathSlug(n.name);
    return {
      id: nid,
      name: n.name,
      href: hrefFor(['nations', nid, 'units', 'index.json']),
    };
  });
  await writeJSON('nations.json', nationsList);

  const globalUnits = [];
  const globalDistricts = [];

  for (const nation of nations) {
    const nid = nationPathSlug(nation.name);
    const nationUnits = sortByName(nation.units ?? []);

    // Per-nation units index
    const unitsIdx = nationUnits.map(u => {
      const uid = toSlug(u.name);
      return {
        id: `${nid}/${uid}`,
        name: u.name,
        href: hrefFor(['nations', nid, 'units', uid, 'districts', 'index.json']),
        parent: {
          id: nid,
          name: nation.name,
          href: hrefFor(['nations', nid, 'units', 'index.json']),
        },
      };
    });
    await writeJSON(path.join('nations', nid, 'units', 'index.json'), unitsIdx);
    globalUnits.push(...unitsIdx);

    for (const unit of nationUnits) {
      const uid = toSlug(unit.name);
      const unitDistricts = sortByName(unit.districts ?? []);
      const dIdx = unitDistricts.map(d => {
        const did = toSlug(d.name);
        return {
          id: `${nid}/${uid}/${did}`,
          name: d.name,
          href: hrefFor(['nations', nid, 'units', uid, 'districts', did, 'index.json']),
          parent: {
            id: `${nid}/${uid}`,
            name: unit.name,
            href: hrefFor(['nations', nid, 'units', uid, 'districts', 'index.json']),
          },
        };
      });
      await writeJSON(path.join('nations', nid, 'units', uid, 'districts', 'index.json'), dIdx);
      globalDistricts.push(...dIdx);

      for (const district of unitDistricts) {
        const did = toSlug(district.name);
        const groups = sortByName(district.groups ?? []).map(g => ({
          id: `#${toSlug(g.name)}`,
          name: g.name,
        }));
        const payload = {
          id: `${nid}/${uid}/${did}`,
          name: district.name,
          href: hrefFor(['nations', nid, 'units', uid, 'districts', did, 'index.json']),
          parent: {
            id: `${nid}/${uid}`,
            name: unit.name,
            href: hrefFor(['nations', nid, 'units', uid, 'districts', 'index.json']),
          },
          groups,
        };
        await writeJSON(path.join('nations', nid, 'units', uid, 'districts', did, 'index.json'), payload);
      }
    }
  }

  // Global indexes
  await writeJSON(path.join('units', 'index.json'), sortByName(globalUnits));
  await writeJSON(path.join('districts', 'index.json'), sortByName(globalDistricts));

  // Search indexes (very lightweight)
  const unitSearch = globalUnits.map(u => ({
    id: u.id,
    name: u.name,
    tokens: toSlug(u.name).split('-').filter(Boolean),
  }));
  await writeJSON(path.join('search', 'units.json'), unitSearch);

  // Token map: collect from nations, units, districts
  const tokenMap = new Map();
  const addToken = (tok, id) => {
    if (!tok) return;
    const key = tok.toLowerCase();
    if (!tokenMap.has(key)) tokenMap.set(key, new Set());
    tokenMap.get(key).add(id);
  };
  for (const n of nationsList) {
    toSlug(n.name).split('-').forEach(t => addToken(t, n.id));
  }
  for (const u of globalUnits) {
    toSlug(u.name).split('-').forEach(t => addToken(t, u.id));
  }
  for (const d of globalDistricts) {
    toSlug(d.name).split('-').forEach(t => addToken(t, d.id));
  }
  const searchTokens = Array.from(tokenMap.entries())
    .map(([token, idsSet]) => ({ token, ids: Array.from(idsSet).sort() }))
    .sort((a, b) => a.token.localeCompare(b.token));
  await writeJSON(path.join('search', 'tokens.json'), searchTokens);

  await writeManifest();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

