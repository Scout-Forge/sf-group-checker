// tools/merge.js
import fs from "fs";

const DATA_DIR = "data";
const NATIONS = ["england", "scotland", "wales", "northern-ireland"];

function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function main() {
  const now = new Date().toISOString();

  const combined = {
    version: 1,
    last_generated: now,
    nations: []
  };

  for (const key of NATIONS) {
    const path = `${DATA_DIR}/${key}.json`;
    if (!fs.existsSync(path)) {
      console.error(`Missing: ${path}`);
      process.exit(1);
    }
    const json = readJSON(path);

    if (!json.nation || !json.units || !Array.isArray(json.units)) {
      console.error(`Invalid structure in ${path}: expected { nation, units[] }`);
      process.exit(1);
    }

    combined.nations.push(json);
  }

  const outPath = `${DATA_DIR}/all-groups.json`;
  fs.writeFileSync(outPath, JSON.stringify(combined, null, 2));

  console.log(`✅ Wrote ${outPath} at ${now}`);
}

main();
