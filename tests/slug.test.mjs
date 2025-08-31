import assert from "node:assert/strict";
import { toSlug, nationPathSlug } from "../tools/slug.js";

function t(name, fn) {
  try {
    fn();
    console.log("✓", name);
  } catch (err) {
    console.error("✗", name);
    console.error(err.message);
    process.exitCode = 1;
  }
}

// Basic cases
t("lowercases and trims", () => {
  assert.equal(toSlug("  Hello World  "), "hello-world");
});

t("ampersand becomes 'and'", () => {
  assert.equal(toSlug("A & B"), "a-and-b");
  // No separators around & when contiguous: '&' becomes 'and'
  assert.equal(toSlug("A&B&C"), "aandbandc");
});

t("removes non a-z0-9 and collapses hyphens", () => {
  assert.equal(toSlug("Foo__Bar"), "foo-bar");
  assert.equal(toSlug("--Hello--World--"), "hello-world");
});

t("handles punctuation and diacritics conservatively", () => {
  // diacritics are stripped to separators by the regex
  assert.equal(toSlug("Café-au-lait"), "caf-au-lait");
  assert.equal(toSlug("Rock & Roll!"), "rock-and-roll");
});

t("empty and non-string inputs", () => {
  assert.equal(toSlug(""), "");
  // @ts-ignore
  assert.equal(toSlug(null), "");
  // @ts-ignore
  assert.equal(toSlug(undefined), "");
});

// nationPathSlug special-case
t("nationPathSlug maps BSO to 'overseas'", () => {
  assert.equal(nationPathSlug("British Scouting Overseas"), "overseas");
  assert.equal(nationPathSlug("british scouting overseas"), "overseas");
});

t("nationPathSlug leaves others alone", () => {
  assert.equal(nationPathSlug("England"), "england");
  assert.equal(nationPathSlug("Northern Ireland"), "northern-ireland");
});

if (process.exitCode) {
  process.exit(process.exitCode);
} else {
  console.log("All slug tests passed.");
}
