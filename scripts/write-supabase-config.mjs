import { writeFileSync } from "node:fs";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const contents = `window.HAYES_SUPABASE_CONFIG = {
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)}
};
`;

writeFileSync(new URL("../js/supabase-config.js", import.meta.url), contents);
console.log("Wrote js/supabase-config.js");
