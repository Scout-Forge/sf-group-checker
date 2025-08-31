export function toSlug(s) {
  if (typeof s !== "string") return "";
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Nation path special-case helper used by builders
export function nationPathSlug(name) {
  const slug = toSlug(name);
  return slug === "british-scouting-overseas" ? "overseas" : slug;
}

