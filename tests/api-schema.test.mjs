import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

async function loadSchema() {
  const file = path.join(process.cwd(), 'schema', 'api-v2.schema.json');
  const raw = await readFile(file, 'utf8');
  return JSON.parse(raw);
}

function compileSubschema(ajv, rootSchema, defName) {
  // Create a tiny wrapper schema that $ref's the desired $defs entry
  const wrapper = {
    $id: `https://scoutforge.uk/schema/test-${defName}.json`,
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $ref: `${rootSchema.$id}#/$defs/${defName}`,
  };
  return ajv.compile(wrapper);
}

function examplePayloads() {
  return {
    NationsList: [
      { id: 'england', name: 'England', href: '/api/v2/nations/england/index.json' },
      { id: 'scotland', name: 'Scotland', href: '/api/v2/nations/scotland/index.json' },
      { id: 'wales', name: 'Wales', href: '/api/v2/nations/wales/index.json' },
      { id: 'northern-ireland', name: 'Northern Ireland', href: '/api/v2/nations/northern-ireland/index.json' },
      { id: 'overseas', name: 'British Scouting Overseas', href: '/api/v2/nations/overseas/index.json' },
    ],
    UnitIndexEntry: {
      id: 'england/avon',
      name: 'Avon',
      href: '/api/v2/nations/england/units/avon/index.json',
      parent: { id: 'england', name: 'England', href: '/api/v2/nations/england/index.json' },
    },
    DistrictIndexEntry: {
      id: 'england/avon/axe',
      name: 'Axe',
      href: '/api/v2/nations/england/units/avon/districts/axe/index.json',
      parent: { id: 'england/avon', name: 'Avon', href: '/api/v2/nations/england/units/avon/index.json' },
    },
    DistrictGroupsResponse: {
      id: 'england/avon/axe',
      name: 'Axe',
      href: '/api/v2/nations/england/units/avon/districts/axe/index.json',
      parent: { id: 'england/avon', name: 'Avon', href: '/api/v2/nations/england/units/avon/index.json' },
      groups: [
        { id: '#1st-axe', name: '1st Axe' },
        { id: '#2nd-axe', name: '2nd Axe' },
      ],
    },
    UnitsGlobal: [
      {
        id: 'england/avon',
        name: 'Avon',
        href: '/api/v2/nations/england/units/avon/index.json',
        parent: { id: 'england', name: 'England', href: '/api/v2/nations/england/index.json' },
      },
    ],
    DistrictsGlobal: [
      {
        id: 'england/avon/axe',
        name: 'Axe',
        href: '/api/v2/nations/england/units/avon/districts/axe/index.json',
        parent: { id: 'england/avon', name: 'Avon', href: '/api/v2/nations/england/units/avon/index.json' },
      },
    ],
    SearchTokens: [
      { token: 'avon', ids: ['england/avon'] },
      { token: 'axe', ids: ['england/avon/axe'] },
    ],
    SearchUnits: [
      { id: 'england/avon', name: 'Avon', tokens: ['avon', 'england'] },
    ],
  };
}

async function main() {
  const schema = await loadSchema();
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);

  // Load root once
  ajv.addSchema(schema);

  const examples = examplePayloads();
  for (const defName of Object.keys(examples)) {
    const validate = compileSubschema(ajv, schema, defName);
    const data = examples[defName];
    const ok = validate(data);
    if (!ok) {
      console.error(`Validation failed for ${defName}:`, validate.errors);
    }
    assert.equal(ok, true, `Example for ${defName} should be valid`);
  }

  // Also validate the real source groups file against SourceGroups
  const src = JSON.parse(await readFile(path.join(process.cwd(), 'all-groups.json'), 'utf8'));
  const validateSource = compileSubschema(ajv, schema, 'SourceGroups');
  const okSrc = validateSource(src);
  if (!okSrc) {
    console.error('Validation failed for SourceGroups:', validateSource.errors);
  }
  assert.equal(okSrc, true, 'all-groups.json should match SourceGroups schema');

  console.log('All schema example validations passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
