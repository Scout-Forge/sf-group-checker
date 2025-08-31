# Scout Forge Static API v2 PRP

## Purpose

Build a static, read only, REST shaped API on GitHub Pages backed by generated JSON files and ship Redoc docs. Include build tooling to convert `all-groups.json` into a versioned folder tree, plus schema, sorting, validation, and a tiny client side search index.

## Core Principles

1. Context is king: include all docs and examples needed
2. Validation loops: lint, type check, and test the generator and schema
3. Information dense: reuse patterns from existing tools files (`merge.js`, `sort.js`, `validate.js`)
4. Progressive success: generate minimal tree, then add search indexes and manifests
5. Global rules: follow CLAUDE.md if present in repo

---

## Goal

Ship a versioned static API under `/api/v2/` on GitHub Pages with:

* Nations → Units → Districts → Groups JSON endpoints
* Cross reference indexes for units and districts
* Lightweight client side search index
* Redoc documentation page sourced from an OpenAPI 3.1 spec
* Repeatable CLI build that reads `all-groups.json` and emits the API tree

## Why

* Business value and user impact: instant free lookups for UK Scouting structures with zero backend and near zero cost
* Integration: drop in replacement for your current GH Pages hack while remaining compatible with a future Worker or D1 DB
* Problems solved: large single JSON payloads, awkward client filtering, lack of discoverable docs

## What

User visible behaviour and technical requirements:

* Deterministic endpoints with stable slugs and IDs
* Small JSON payloads per request
* Clear discovery entry points and breadcrumbs in each payload
* Search convenience via tiny token maps shipped statically
* Docs at `/docs/api/` using Redoc with the OpenAPI spec checked in

### Success Criteria

* [ ] Visiting `/api/v2/nations.json` returns the five nations
* [ ] Visiting a unit index returns districts for that unit
* [ ] Visiting a district index returns groups
* [ ] Global indexes build and load under 250 ms from GH Pages in a cold cache test
* [ ] Redoc loads and renders the spec with no errors
* [ ] `node tools/build-static-api.mjs` completes with exit code 0 and writes `dist/api/v2/`
* [ ] CI deploy publishes to GitHub Pages on pushes to `main`

## All Needed Context

### Documentation & References

```yaml
- file: /mnt/data/json_out/all-groups.json
  why: Source of truth for generator input

- file: merge.js
  why: Pattern for combining nation files and keeping structure consistent

- file: sort.js
  why: Sorting conventions for name fields at each level

- file: validate.js
  why: Baseline approach for schema validation with Ajv

- file: schema.json
  why: Existing schema to be extended for the group level

- docfile: docs/api/openapi.yaml
  why: OpenAPI spec that powers Redoc, must stay in sync with endpoint shapes

- file: tools/xlsx_to_json.py or tools/xlsx-to-json.mjs
  why: Upstream step that produces `all-groups.json` should remain compatible
```

### Current Codebase tree

```bash
# provide after cloning; if empty, this PRP creates the needed files
```

### Desired Codebase tree with responsibilities

```bash
docs/
  api/
    index.html                  # Redoc runner
    openapi.yaml                # OpenAPI 3.1 spec

tools/
  build-static-api.mjs          # converts all-groups.json -> /dist/api/v2 tree
  slug.js                       # shared slug generator with unit tests
  validate-api.mjs              # validates generated JSON against schema

schema/
  api-v2.schema.json            # JSON Schema for generated payloads

.github/workflows/
  deploy-pages.yml              # build and deploy dist to GitHub Pages

dist/
  api/
    v2/
      manifest.json
      nations.json
      units/index.json
      districts/index.json
      search/tokens.json
      search/units.json
      nations/
        england/
          index.json
          units/
            avon/
              index.json
              districts/
                axe/
                  index.json
                bath/
                  index.json
        scotland/...
        wales/...
        northern-ireland/...
        overseas/...
```

### Known Gotchas of our codebase and library quirks

```text
- Slugging must be stable: lower case, hyphenate, strip punctuation, replace '&' with 'and', collapse hyphens, trim edges
- Do not assume England has regions. England uses counties. Scotland, Wales, Northern Ireland use regions
- District and group names may include parentheses and apostrophes. Do not lose characters in the visible "name" field, only in the slug and fragment id
- Sorting must be case insensitive and respect locale where possible
- GitHub Pages is static only. No query strings that expect server logic beyond cache busting
- Keep each JSON file small. Do not embed parents recursively to avoid payload bloat
- Manifest hash should change when any payload changes to allow cache busting
```

## Implementation Blueprint

### Data models and structure

```json
// schema/api-v2.schema.json high level shapes
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://scoutforge.uk/schema/api-v2.schema.json",
  "type": "object",
  "properties": {
    "version": { "type": "integer", "const": 2 },
    "generated": { "type": "string", "format": "date-time" },
    "hash": { "type": "string" }
  }
}
```

Concrete schemas included in tasks below for:

* `nations.json` array
* `nations/{nation}/index.json` array of units
* `.../units/{unit}/index.json` array of districts
* `.../districts/{district}/index.json` object with `groups: []`
* `units/index.json` and `districts/index.json`
* `search/tokens.json` and `search/units.json`

### List of tasks to complete in order

```yaml
Task 1:
CREATE tools/slug.js:
  - Export `toSlug(name: string): string`
  - Rules: lowercase, replace '&' with 'and', remove non a-z0-9, collapse hyphens, trim hyphens
  - Include tests in tests/slug.test.mjs

Task 2:
CREATE schema/api-v2.schema.json:
  - Include subschemas for NationsList, UnitIndexEntry, DistrictIndexEntry, DistrictGroupsResponse, UnitsGlobal, DistrictsGlobal, SearchTokens, SearchUnits
  - Provide `$id` and make it consumable by Ajv

Task 3:
CREATE tools/build-static-api.mjs:
  - Input: all-groups.json
  - Output: dist/api/v2 folder tree
  - Write: manifest.json with version, generated, sha1 hash across files
  - Write: nations.json, per nation unit index, per unit district index, per district groups index
  - Write: global units and districts indexes
  - Write: search/tokens.json and search/units.json
  - Sorting: case insensitive by `name`
  - IDs: path as id, group ids use fragment form `#slug-of-group`
  - Parent and href fields included where specified

Task 4:
CREATE tools/validate-api.mjs:
  - Use Ajv to validate generated JSON files against schema/api-v2.schema.json where applicable
  - Fail with non zero exit code on any validation error
  - Check sort order and uniqueness constraints

Task 5:
MODIFY or CREATE docs/api/openapi.yaml and docs/api/index.html:
  - Use the OpenAPI 3.1 spec we prepared and ensure paths match `/api/v2/...`
  - Redoc index.html references `openapi.yaml`

Task 6:
CREATE .github/workflows/deploy-pages.yml:
  - On push to main and workflow_dispatch
  - Steps: checkout, setup node, run `node tools/build-static-api.mjs`, run `node tools/validate-api.mjs`, upload artifact `dist`, deploy to Pages

Task 7:
CREATE README sections:
  - Explain API layout, slugs, versioning, cache busting via `?v=<manifest.hash>`
  - Document how to rebuild locally and how to publish via Actions
```

### Per task pseudocode highlights

```javascript
// Task 1 slug.js
export function toSlug(s) {
  return s.toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
```

```javascript
// Task 3 build-static-api.mjs
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { toSlug } from "./slug.js";

const SRC = process.env.ALL_JSON || "all-groups.json";
const OUT = "dist/api/v2";

function idFor(nation, unit, district) {
  const n = toSlug(nation).replace("british-scouting-overseas","overseas");
  const u = unit ? `/${toSlug(unit)}` : "";
  const d = district ? `/${toSlug(district)}` : "";
  return `${n}${u}${d}`;
}

async function writeJSON(relPath, obj) {
  const full = path.join(OUT, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  const txt = JSON.stringify(obj, null, 2);
  await fs.writeFile(full, txt);
  return { relPath, buf: Buffer.from(txt) };
}

// read all-groups.json, iterate nations -> units -> districts -> groups
// write nations.json, per nation index, per unit index, per district index
// build global indexes and search tokens
// compute sha1 over all files to produce manifest.json with counts and hash
```

```javascript
// Task 4 validate-api.mjs
// Load Ajv with the schema, traverse dist/api/v2 and validate files that have a schema
// Enforce sorting by comparing to a sorted copy for names, log first offending entry
```

### Integration Points

```yaml
DATABASE:
  - none, static files only

CONFIG:
  - env var: ALL_JSON path to source all-groups.json
  - future: VERSION default v2 to allow v3 in the future

ROUTES:
  - static paths only, must match the OpenAPI spec
```

## Validation Loop

### Level 1: Syntax and Style

```bash
# Run these first
node --version                # require Node 20+
node -e "console.log('node ok')"
node -e "import('fs');"       # ensure ESM working

# Lint optional if you use eslint or ruff equivalent for JS
```

### Level 2: Unit Tests

```bash
# minimal node test runner using node:test
node --test tests/slug.test.mjs
```

Example `tests/slug.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { toSlug } from "../tools/slug.js";

test("slug basics", () => {
  assert.equal(toSlug("Northern Ireland"), "northern-ireland");
  assert.equal(toSlug("4th Carrickfergus (St Nicholas)"), "4th-carrickfergus-st-nicholas");
  assert.equal(toSlug("A & B"), "a-and-b");
});
```

### Level 3: Generator and Schema Validation

```bash
node tools/build-static-api.mjs
node tools/validate-api.mjs
# Expected: exit 0, and dist/api/v2 populated
```

### Level 4: Manual browse test

* Open `dist/api/v2/nations.json` and click through paths
* Load `docs/api/index.html` locally with a simple server

```bash
npx serve docs/api
```

## Final Validation Checklist

* [ ] `node tools/build-static-api.mjs` creates `dist/api/v2` with all endpoints
* [ ] `node tools/validate-api.mjs` passes with 0 errors
* [ ] `tests/slug.test.mjs` passes
* [ ] Redoc renders at `/docs/api/`
* [ ] GitHub Pages deploy succeeds, URLs resolve publicly
* [ ] Manifest hash changes when any file content changes
* [ ] All lists sorted case insensitively by `name`

## Anti Patterns to Avoid

* Do not infer England uses regions
* Do not mutate original names for display. Only slugs and fragment ids are normalised
* Do not embed entire hierarchies in every payload
* Do not create new JSON shapes that diverge from the OpenAPI spec
* Do not change slugs without a migration plan, they are part of the public ID

---

## Appendix A: Schemas to include in `schema/api-v2.schema.json` (snippets)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://scoutforge.uk/schema/api-v2.schema.json",
  "type": "object",
  "properties": {}
}
```

Add the following definitions inside `components` like structure or as standalone `$defs`:

```json
{
  "$defs": {
    "NationId": { "type": "string", "enum": ["england","scotland","wales","northern-ireland","overseas"] },
    "NationSummary": {
      "type": "object",
      "required": ["id","name","href"],
      "properties": {
        "id": { "$ref": "#/$defs/NationId" },
        "name": { "type": "string" },
        "href": { "type": "string" }
      }
    },
    "UnitIndexEntry": {
      "type": "object",
      "required": ["id","name","type","href"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "type": { "type": "string", "enum": ["county","region","area"] },
        "districtCount": { "type": "integer" },
        "href": { "type": "string" },
        "parent": { "type": "string" }
      }
    },
    "DistrictIndexEntry": {
      "type": "object",
      "required": ["id","name","href"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "groupCount": { "type": "integer" },
        "href": { "type": "string" },
        "parent": { "type": "string" }
      }
    },
    "Group": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" }
      }
    },
    "DistrictGroupsResponse": {
      "type": "object",
      "required": ["id","name","groups"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "parent": { "type": "string" },
        "groups": { "type": "array", "items": { "$ref": "#/$defs/Group" } }
      }
    },
    "UnitsGlobal": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id","name","nation","href"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "nation": { "type": "string" },
          "type": { "type": "string", "enum": ["county","region","area"] },
          "href": { "type": "string" }
        }
      }
    },
    "DistrictsGlobal": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id","name","nation","href"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "unit": { "type": "string" },
          "nation": { "type": "string" },
          "href": { "type": "string" }
        }
      }
    },
    "SearchTokens": {
      "type": "object",
      "additionalProperties": {
        "type": "array",
        "items": { "type": "string" }
      }
    },
    "SearchUnits": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["nation","href"],
        "properties": {
          "nation": { "type": "string" },
          "unit": { "type": "string" },
          "district": { "type": "string" },
          "href": { "type": "string" }
        }
      }
    }
  }
}
```

---

## Appendix B: OpenAPI

Use the Redoc spec we generated earlier. Place `docs/api/index.html` and `docs/api/openapi.yaml` as part of this PRP’s deliverables.