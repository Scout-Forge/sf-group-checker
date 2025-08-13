#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import meta2020 from "ajv/dist/refs/json-schema-2020-12.json" assert { type: "json" };

// resolve repo root so the script works from anywhere
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addMetaSchema(meta2020);
addFormats(ajv);

// load schema
const schemaPath = path.join(root, "data", "schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const validate = ajv.compile(schema);

const dataFiles = [
  "england.json",
  "scotland.json",
  "wales.json",
  "roi.json",
  "bso.json",
];

let ok = true;

for (const f of dataFiles) {
  const p = path.join(root, "data", f);
  const raw = fs.readFileSync(p, "utf8");
  const json = JSON.parse(raw);

  if (!validate(json)) {
    ok = false;
    console.error(`❌ ${f} failed schema:`);
    console.error(ajv.errorsText(validate.errors, { separator: "\n" }));
  }

  // optional: enforce alphabetical ordering of top-level units
  if (Array.isArray(json.units)) {
    const names = json.units.map((u) => u.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    if (JSON.stringify(names) !== JSON.stringify(sorted)) {
      ok = false;
      console.error(`❌ ${f} top-level units not alphabetical`);
    }
  }
}

if (!ok) {
  console.error("Validation failed");
  process.exit(1);
} else {
  console.log("✅ All data files valid");
}
