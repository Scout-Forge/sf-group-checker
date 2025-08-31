# Scout UK Directory (Public, Read-only API)

Read-only JSON listing the UK structure:
Nation → County/Area/Region → District → District.

## Endpoints (GitHub Pages)
- https://scout-forge.github.io/sf-group-checker/data/all-groups.json (All groups in all territories)
- https://scout-forge.github.io/sf-group-checker/data/england.json
- https://scout-forge.github.io/sf-group-checker/data/northern-ireland.json
- https://scout-forge.github.io/sf-group-checker/data/scotland.json
- https://scout-forge.github.io/sf-group-checker/data/wales.json
<!-- - https://scout-forge.github.io/sf-group-checker/data/bso.json -->

## API v2

- Static tree under `/api/v2/` built from `all-groups.json`.
- Nations: `/api/v2/nations.json` (england, scotland, wales, northern-ireland, overseas)
- Per-nation: `/api/v2/nations/{nation}/units/index.json`
- Per-unit: `/api/v2/nations/{nation}/units/{unit}/districts/index.json`
- Per-district: `/api/v2/nations/{nation}/units/{unit}/districts/{district}/index.json`
- Global: `/api/v2/units/index.json`, `/api/v2/districts/index.json`
- Search: `/api/v2/search/tokens.json`, `/api/v2/search/units.json`

### Slugs and IDs
- Slugs are stable: lowercase; `&` -> `and`; non-alphanumerics -> `-`; collapse; trim.
- IDs are path-based for nation/unit/district; groups are fragment ids `#slug`.
- `british-scouting-overseas` maps to path slug `overseas`.

### Build and Validate
```
node tools/xlsx-to-json.mjs
node tools/build-static-api.mjs
node tools/validate-api.mjs
```

### Docs
- Redoc at `docs/api/index.html` (loads `docs/api/openapi.yaml`).

## Contributing
See `CONTRIBUTING.md`. All PRs will be auto-validated via GitHub Actions before consideration for inclusion.

## Ownership and Licence
MIT License

This repository is managed by Scout Forge (scoutforge.co.uk) for the benefit of Scouting. Although we try to ensure data accuracy, we cannot be held liable for any errors/omissions in this data.

## Security
Report security issues via our website: scoutforge.co.uk
No sensitive data is stored. This is a public directory.

## Additional comment for demo purposes.
