import { TIERS } from "../lib/game";

const HEADLINES = { 0: "Dot ball", 1: "Single", 2: "Two", 4: "FOUR!", 6: "SIX!" };

export default function Result({ reveal }) {
  const total = reveal.played_today || 1;
  const typed = reveal.your_guess_text;
  const matched = reveal.your_guess_name;

  let headline = HEADLINES[reveal.your_runs];
  if (reveal.out) headline = "OUT! Timed out";

  // Show what they typed if it was autocorrected or didn't match
  const correctedFrom =
    typed && matched && typed.toLowerCase() !== matched.toLowerCase() ? typed : null;

  return (
    <main>
      <h1>{headline}</h1>
      {matched && (
        <p>
          Your shot: {matched}
          {correctedFrom && <small> (you typed “{correctedFrom}”)</small>}
        </p>
      )}

      <h2>Every valid answer</h2>
      {TIERS.map((tier) => {
        const rows = reveal.board.filter((b) => b.runs === tier.runs);
        if (!rows.length) return null;
        return (
          <section key={tier.runs}>
            <h3>{tier.runs || "•"} {tier.label}</h3>
            <ul>
              {rows.map((b) => (
                <li key={b.player}>
                  {b.name}
                  {b.player === reveal.your_guess && " (you)"}
                  {" · "}
                  {Math.round((b.picks / total) * 100)}%
                  {b.note && <small> · {b.note}</small>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}