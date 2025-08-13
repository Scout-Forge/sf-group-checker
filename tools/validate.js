#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateSchema: false // do not fetch the 2020-12 metaschema
});
addFormats(ajv);

// Load schema
const schemaPath = path.join(root, "data", "schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const validate = ajv.compile(schema);

// Validate all data files you expose
const dataFiles = [
  "england.json",
  "scotland.json",
  "wales.json",
  // "bso.json",
  "northern-ireland.json"
];

let ok = true;

for (const f of dataFiles) {
  const p = path.join(root, "data", f);
  if (!fs.existsSync(p)) {
    console.warn(`⚠️  Skipping missing file: ${f}`);
    continue;
  }
  const raw = fs.readFileSync(p, "utf8");
  const json = JSON.parse(raw);

  if (!validate(json)) {
    ok = false;
    console.error(`❌ ${f} failed schema:`);
    console.error(ajv.errorsText(validate.errors, { separator: "\n" }));
  }

  // Optional: enforce alphabetical ordering at top level
  if (Array.isArray(json.units)) {
    const names = json.units.map(u => u.name);
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
