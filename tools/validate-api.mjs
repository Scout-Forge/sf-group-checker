import fs from 'fs/promises';
import path from 'path';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist', 'api', 'v2');
const SCHEMA_PATH = path.join(ROOT, 'schema', 'api-v2.schema.json');
const SRC_JSON = process.env.ALL_JSON || path.join(ROOT, 'all-groups.json');

async function readJSON(file) {
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw);
}

function compareInsensitive(a, b) {
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
}

function isSortedByName(list) {
  for (let i = 1; i < list.length; i++) {
    if (compareInsensitive(list[i - 1].name, list[i].name) > 0) return false;
  }
  return true;
}

function unique(list) {
  return list.length === new Set(list).size;
}

async function loadAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const schema = await readJSON(SCHEMA_PATH);
  ajv.addSchema(schema);
  const cache = new Map();
  const c = (def) => {
    if (cache.has(def)) return cache.get(def);
    const wrapper = { $schema: 'https://json-schema.org/draft/2020-12/schema', $ref: `${schema.$id}#/$defs/${def}` };
    const compiled = ajv.compile(wrapper);
    cache.set(def, compiled);
    return compiled;
  };
  return { ajv, c };
}

async function listFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await listFiles(full));
    else out.push(full);
  }
  return out;
}

async function validateGenerated() {
  const { c } = await loadAjv();

  // Validate high-level entry points and enforce sort/uniqueness
  const nations = await readJSON(path.join(DIST, 'nations.json'));
  assert(Array.isArray(nations), 'nations.json must be an array');
  assert.equal(c('NationsList')(nations), true, 'NationsList schema validation failed');
  assert(isSortedByName(nations), 'nations.json should be sorted by name');
  assert(unique(nations.map(n => n.id)), 'nations ids must be unique');

  const unitsGlobal = await readJSON(path.join(DIST, 'units', 'index.json'));
  {
    const validate = c('UnitsGlobal');
    const ok = validate(unitsGlobal);
    if (!ok) console.error('UnitsGlobal errors:', validate.errors);
    assert.equal(ok, true, 'UnitsGlobal schema validation failed');
  }
  assert(isSortedByName(unitsGlobal), 'units/index.json should be sorted by name');
  assert(unique(unitsGlobal.map(u => u.id)), 'unit ids must be unique');

  const districtsGlobal = await readJSON(path.join(DIST, 'districts', 'index.json'));
  assert.equal(c('DistrictsGlobal')(districtsGlobal), true, 'DistrictsGlobal schema validation failed');
  assert(isSortedByName(districtsGlobal), 'districts/index.json should be sorted by name');
  assert(unique(districtsGlobal.map(d => d.id)), 'district ids must be unique');

  // Validate all nation/unit/district files recursively
  for (const nat of nations) {
    const nationUnits = await readJSON(path.join(DIST, 'nations', nat.id, 'units', 'index.json'));
    {
      const validate = c('UnitsGlobal');
      const ok = validate(nationUnits);
      if (!ok) console.error(`Units errors for ${nat.id}:`, validate.errors);
      assert.equal(ok, true, `Units index schema failed for nation ${nat.id}`);
    }
    assert(isSortedByName(nationUnits), `Units index not sorted for nation ${nat.id}`);
    assert(unique(nationUnits.map(u => u.id)), `Unit ids must be unique for nation ${nat.id}`);

    for (const unit of nationUnits) {
      const p = path.join(DIST, 'nations', nat.id, 'units', unit.id.split('/')[1], 'districts', 'index.json');
      const dIdx = await readJSON(p);
      assert.equal(c('DistrictsGlobal')(dIdx), true, `Districts index schema failed for ${unit.id}`);
      assert(isSortedByName(dIdx), `Districts index not sorted for ${unit.id}`);
      assert(unique(dIdx.map(d => d.id)), `District ids must be unique for ${unit.id}`);

      for (const d of dIdx) {
        const parts = d.id.split('/');
        const dp = path.join(DIST, 'nations', parts[0], 'units', parts[1], 'districts', parts[2], 'index.json');
        const payload = await readJSON(dp);
        assert.equal(c('DistrictGroupsResponse')(payload), true, `District payload schema failed for ${d.id}`);
        // groups sorted by name and unique fragment ids
        assert(isSortedByName(payload.groups), `Groups not sorted for ${d.id}`);
        assert(unique(payload.groups.map(g => g.id)), `Group fragment ids must be unique for ${d.id}`);
      }
    }
  }

  // Validate search payloads
  const searchTokens = await readJSON(path.join(DIST, 'search', 'tokens.json'));
  assert.equal(c('SearchTokens')(searchTokens), true, 'SearchTokens schema failed');
  const searchUnits = await readJSON(path.join(DIST, 'search', 'units.json'));
  assert.equal(c('SearchUnits')(searchUnits), true, 'SearchUnits schema failed');
}

async function validateSource() {
  const { c } = await loadAjv();
  const src = await readJSON(SRC_JSON);
  assert.equal(c('SourceGroups')(src), true, 'SourceGroups schema failed for all-groups.json');
}

async function main() {
  await validateSource();
  await validateGenerated();
  console.log('Validation OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
