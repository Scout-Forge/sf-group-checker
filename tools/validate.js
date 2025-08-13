#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schema = JSON.parse(fs.readFileSync('data/schema.json', 'utf8'));
const validate = ajv.compile(schema);

const dataDir = 'data';
const files = ['england.json','scotland.json','wales.json','roi.json','bso.json'];

let ok = true;

for (const f of files) {
  const p = path.join(dataDir, f);
  const raw = fs.readFileSync(p, 'utf8');
  const json = JSON.parse(raw);
  if (!validate(json)) {
    ok = false;
    console.error(`❌ ${f} failed schema:\n`, ajv.errorsText(validate.errors, { separator: '\n' }));
  }
  // Optional: enforce alpha ordering at each level
  const names = json.units.map(u => u.name);
  const sorted = [...names].sort((a,b)=>a.localeCompare(b));
  if (JSON.stringify(names) !== JSON.stringify(sorted)) {
    ok = false;
    console.error(`❌ ${f} top-level units not alphabetical`);
  }
}

if (!ok) {
  console.error('Validation failed'); process.exit(1);
} else {
  console.log('✅ All data files valid');
}
