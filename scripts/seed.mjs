// Loads content/ into Supabase.
// Run: node --env-file=.env.seed scripts/seed.mjs
import { readFileSync, readdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
);

const players = JSON.parse(readFileSync("content/players.json", "utf8"));
const ids = new Set(players.map((p) => p.id));

// Check every question file before touching the database
const questions = readdirSync("content/questions")
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const q = JSON.parse(readFileSync(`content/questions/${f}`, "utf8"));
    if (`${q.date}.json` !== f)
      throw new Error(`${f}: date inside says ${q.date}`);
    const seen = new Set();
    for (const a of q.answers) {
      if (!ids.has(a.player))
        throw new Error(`${f}: unknown player "${a.player}"`);
      if (![0, 1, 2, 4, 6].includes(a.runs))
        throw new Error(`${f}: ${a.player} has runs ${a.runs}`);
      if (a.note !== undefined && typeof a.note !== "string")
        throw new Error(`${f}: ${a.player} note must be text`);
      if (seen.has(a.player)) throw new Error(`${f}: ${a.player} listed twice`);
      seen.add(a.player);
    }
    return { date: q.date, prompt: q.prompt, answers: q.answers };
  });

let { error } = await supabase
  .from("players")
  .upsert(players.map(({ id, name, aliases }) => ({ id, name, aliases })));
if (error) throw error;

({ error } = await supabase.from("questions").upsert(questions));
if (error) throw error;

console.log(
  `Seeded ${players.length} players and ${questions.length} questions`,
);
