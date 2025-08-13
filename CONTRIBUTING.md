# Contributing

1. Fork and create a feature branch.
2. Run `npm install`.
3. Edit the relevant `data/*.json` file(s).
4. Sort the file you have edited to ensure it is in alphabetical order e.g. `npm run sort data/scotland.json`.
5. Run `npm run validate` locally (Node 18+).
6. Open a PR. The CI will run the same validator.

*N.B. There is no need to compile group.json file. This is compiled automatically in the CI.*

### Data rules
- Alphabetical ordering at each level (use `npm run sort data/scotland.json`).
- Use official names where possible.
- Include an official website if public and stable.
- Don’t add personal emails or PII.

### Verification
Add or update `last_verified` (YYYY-MM-DD) when you’ve checked an entry.
