# Contributing

1. Fork and create a feature branch.
2. Edit the relevant `data/*.json` file(s).
3. Run `node tools/validate.js` locally (Node 18+).
4. Open a PR. The CI will run the same validator.
5. There is no need to compile the group.json file. This is compiled automatically in the CI.

### Data rules
- Alphabetical ordering at each level.
- Use official names where possible.
- Include an official website if public and stable.
- Don’t add personal emails or PII.

### Verification
Add or update `last_verified` (YYYY-MM-DD) when you’ve checked an entry.
