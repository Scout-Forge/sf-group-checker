# Data Mapping: Groups_Level.xlsx → all-groups.json

This project treats `Groups_Level.xlsx` as the canonical source for building the static API. The exporter `tools/xlsx-to-json.mjs` reads the workbook and produces a normalized `all-groups.json` with this shape:

```
{
  "nations": [
    {
      "name": "England",
      "slug": "england",
      "units": [
        {
          "name": "Greater London",
          "slug": "greater-london",
          "districts": [
            {
              "name": "Westminster",
              "slug": "westminster",
              "groups": [
                { "name": "1st Westminster", "slug": "1st-westminster" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Column detection
The exporter auto-detects headers on the first suitable worksheet using case-insensitive matching with synonyms:
- Nation: `nation`, `country`
- Unit: `unit`, `county`, `area`, `region`, `region (scotland)`, `counties/areas/regions`
- District: `district`, `scout district`
- Group: `group`, `group name`, `scout group`, `groupname`

If a sheet with these four columns isn’t found, the exporter fails with an error listing available sheets and header rows.

## Normalization
- Trim and collapse internal whitespace for all names.
- Derive `slug` with `tools/slug.js` rules: lowercase, `&`→`and`, non-alphanumerics → `-`, collapse hyphens, trim ends.
- De-duplicate entries within each level by slug.
- Sort `nations`, `units`, `districts`, and `groups` case-insensitively by `name` for deterministic output.
- Nation path special‑case: the slug `british-scouting-overseas` is mapped to `overseas` for path/id purposes.

## Usage
- Default: `node tools/xlsx-to-json.mjs`
- Custom paths: `node tools/xlsx-to-json.mjs --in ./assets/Groups_Level.xlsx --out ./all-groups.json`
- Env vars: `IN_XLSX`, `OUT_JSON`

## Notes
- The exporter only reads a single sheet—the first one that matches required columns.
- If your workbook structure changes, update the synonyms above or the sheet headers to match.
- The output is consumed by the static API builder at `tools/build-static-api.mjs`.

