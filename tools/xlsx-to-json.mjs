import fs from "fs/promises";
import path from "path";
import process from "process";
import xlsxLib from "xlsx";
import { toSlug, nationPathSlug } from "./slug.js";

const XLSX = xlsxLib.default || xlsxLib;

function usage() {
  console.log("Usage: node tools/xlsx-to-json.mjs [--in <xlsx>] [--out <json>]");
  console.log("Env: IN_XLSX, OUT_JSON");
}

const argv = process.argv.slice(2);
let inArg;
let outArg;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--in") inArg = argv[++i];
  else if (argv[i] === "--out") outArg = argv[++i];
  else if (argv[i] === "--help" || argv[i] === "-h") {
    usage();
    process.exit(0);
  }
}

const IN_XLSX = inArg || process.env.IN_XLSX || "Groups_Level.xlsx";
const OUT_JSON = outArg || process.env.OUT_JSON || "all-groups.json";

const SYNONYMS = {
  nation: ["nation", "country"],
  unit: [
    "unit",
    "county",
    "area",
    "region",
    "region (scotland)",
    "counties/areas/regions",
  ],
  district: ["district", "scout district"],
  group: ["group", "group name", "scout group", "groupname"],
};

function normHeader(h) {
  return String(h || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s*\(.*?\)\s*/g, (m) => m) // keep text in () for synonyms
    .trim();
}

function findHeaderMap(headerRow) {
  const headers = headerRow.map(normHeader);
  const get = (wanted) => {
    const candidates = SYNONYMS[wanted];
    for (const cand of candidates) {
      const idx = headers.indexOf(cand);
      if (idx !== -1) return { name: headerRow[idx], idx };
    }
    return null;
  };
  const nation = get("nation");
  const unit = get("unit");
  const district = get("district");
  const group = get("group");
  if (nation && unit && district && group) {
    return { nation, unit, district, group };
  }
  return null;
}

function collapseWS(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function sortByName(a, b) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "accent" });
}

async function main() {
  // Read workbook
  let workbook;
  try {
    workbook = XLSX.readFile(IN_XLSX);
  } catch (err) {
    console.error(`Failed to read ${IN_XLSX}:`, err.message);
    process.exit(1);
  }

  // Pick sheet that contains required columns
  let chosenSheetName = null;
  let chosenHeaderMap = null;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rows || rows.length === 0) continue;
    const headerRow = rows[0];
    const map = findHeaderMap(headerRow);
    if (map) {
      chosenSheetName = sheetName;
      chosenHeaderMap = map;
      break;
    }
  }
  if (!chosenSheetName) {
    console.error(
      `Could not find a worksheet with required columns (nation, unit, district, group). Available sheets:`,
      workbook.SheetNames
    );
    process.exit(1);
  }

  const sheet = workbook.Sheets[chosenSheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const { nation: nH, unit: uH, district: dH, group: gH } = chosenHeaderMap;
  const nationKey = nH.name;
  const unitKey = uH.name;
  const districtKey = dH.name;
  const groupKey = gH.name;

  // Build nested structure with Maps for dedupe
  const nationsMap = new Map();

  for (const row of data) {
    const nationName = collapseWS(row[nationKey]);
    const unitName = collapseWS(row[unitKey]);
    const districtName = collapseWS(row[districtKey]);
    const groupName = collapseWS(row[groupKey]);

    if (!nationName || !unitName || !districtName || !groupName) continue;

    const nationSlug = nationPathSlug(nationName);
    let nation = nationsMap.get(nationSlug);
    if (!nation) {
      nation = { name: nationName, slug: nationSlug, units: [] };
      nation._map = new Map(); // unit map
      nationsMap.set(nationSlug, nation);
    }

    const unitSlug = toSlug(unitName);
    let unit = nation._map.get(unitSlug);
    if (!unit) {
      unit = { name: unitName, slug: unitSlug, districts: [] };
      unit._map = new Map(); // district map
      nation._map.set(unitSlug, unit);
      nation.units.push(unit);
    }

    const districtSlug = toSlug(districtName);
    let district = unit._map.get(districtSlug);
    if (!district) {
      district = { name: districtName, slug: districtSlug, groups: [] };
      district._set = new Set(); // group slug set
      unit._map.set(districtSlug, district);
      unit.districts.push(district);
    }

    const groupSlug = toSlug(groupName);
    if (!district._set.has(groupSlug)) {
      district.groups.push({ name: groupName, slug: groupSlug });
      district._set.add(groupSlug);
    }
  }

  // Finalize: sort and strip helper maps
  const nations = Array.from(nationsMap.values());
  for (const n of nations) {
    n.units.sort(sortByName);
    for (const u of n.units) {
      u.districts.sort(sortByName);
      for (const d of u.districts) {
        d.groups.sort(sortByName);
        delete d._set;
      }
      delete u._map;
    }
    delete n._map;
  }
  nations.sort(sortByName);

  const output = { nations };

  // Write file
  const outFull = path.resolve(OUT_JSON);
  await fs.writeFile(outFull, JSON.stringify(output, null, 2) + "\n", "utf8");
  // Summary
  const nationCount = nations.length;
  const unitCount = nations.reduce((acc, n) => acc + n.units.length, 0);
  const districtCount = nations.reduce(
    (acc, n) => acc + n.units.reduce((a, u) => a + u.districts.length, 0),
    0
  );
  const groupCount = nations.reduce(
    (acc, n) =>
      acc +
      n.units.reduce(
        (a, u) => a + u.districts.reduce((aa, d) => aa + d.groups.length, 0),
        0
      ),
    0
  );
  console.log(
    `Wrote ${outFull}  nations:${nationCount} units:${unitCount} districts:${districtCount} groups:${groupCount}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

