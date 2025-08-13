# Contributing

1. Fork and create a feature branch.
2. Run `npm install`.
3. Edit the relevant `data/*.json` file(s).
4. Sort the file you have edited to ensure it is in alphabetical order e.g. `npm run sort data/scotland.json` or `npm run sort:scotland`.
5. Run `npm run validate` locally (Node 18+).
6. Open a PR. The CI will run the same validator.

*N.B. There is no need to compile group.json file. This is compiled automatically in the CI.*

### Data rules
- Alphabetical ordering at each level (use `npm run sort data/scotland.json` or `npm run sort:scotland`).
- Use official names where possible. For Scouts Cymru, please use Welsh names as appropriate to each region.
- Include an official website if public and stable.
- Don’t add personal emails or PII.

### Verification
Add or update `last_verified` (YYYY-MM-DD) when you’ve checked an entry.

### NPM Notes
This project uses **Node 18+** and **npm** for all tooling.
Run `npm install` once after cloning or pulling updates to ensure you have the correct dependencies.

**Common scripts:**

| Command                 | Purpose                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `npm run validate`      | Validate all JSON files against the schema. Must pass before PR is merged.                                                 |
| `npm run merge`         | Manually rebuild the combined `all-groups.json` file (normally done automatically in CI).                                  |
| `npm run sort <file>`   | Sort a specific nation JSON file in alphabetical order by Region and District. Example: `npm run sort data/scotland.json`. |
| `npm run sort:scotland` | Shortcut to sort `data/scotland.json`.                                                                                     |
| `npm run sort:england`  | Shortcut to sort `data/england.json`.                                                                                      |
| `npm run sort:ni`       | Shortcut to sort `data/northern-ireland.json`.                                                                             |
| `npm run sort:wales`    | Shortcut to sort `data/wales.json`.                                                                                        |

**Tips:**

* Always run the relevant `sort` command after editing a file to keep the alphabetical order consistent.
* Use `npm run validate` before committing to catch formatting or schema issues early.
* The `merge` step is handled by CI; you only need it locally if you want to preview the combined file.
