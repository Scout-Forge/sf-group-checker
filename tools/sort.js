#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// usage example: node tools/sort.js data/scotland.json
const input = process.argv[2];
if (!input) {
  console.error("Usage: node tools/sort.js data/<nation>.json");
  process.exit(1);
}

const filePath = path.resolve(__dirname, "..", input);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(filePath, "utf8"));

if (!json || json.nation == null || !Array.isArray(json.units)) {
  console.error("Invalid file: expected { nation: string, units: [] }");
  process.exit(1);
}

// locale-aware, case-insensitive compare
const cmp = (a, b) =>
  String(a ?? "").localeCompare(String(b ?? ""), "en-GB", { sensitivity: "base" });

// sort regions (units)
json.units.sort((u1, u2) => cmp(u1.name, u2.name));

// sort districts within each region
for (const unit of json.units) {
  if (Array.isArray(unit.children)) {
    unit.children.sort((c1, c2) => cmp(c1.name, c2.name));
  }
}

fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
console.log(`✅ Sorted and saved: ${input}`);
