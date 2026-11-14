// Nested objects merge key by key; arrays and plain values are replaced.
// Mirrors public.jsonb_deep_merge in the database migration.
export function deepMerge(a, b) {
  if (!isObj(a) || !isObj(b)) return b;
  const out = {...a};
  for (const [k, v] of Object.entries(b)) out[k] = k in a ? deepMerge(a[k], v) : v;
  return out;
}
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
