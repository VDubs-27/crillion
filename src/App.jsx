import { useEffect, useState } from "react";
import { supabase, ensureSession } from "./lib/supabase";
import { nzToday, secondsLeft, sleep, GRACE_SECONDS, SHOT_ANIMATION_MS } from "./lib/game";
import Home from "./screens/Home";
import Batting from "./screens/Batting";
import Result from "./screens/Result";

export default function App() {
  // loading | home | batting | result | error
  const [screen, setScreen] = useState("loading");
  const [ball, setBall] = useState(null);     // { prompt, started_at }
  const [reveal, setReveal] = useState(null); // get_reveal() result
  const [shot, setShot] = useState(null);     // outcome being animated: 0–6 or "out"
  const [error, setError] = useState(null);

  // Runs an async action and sends any error to the error screen
  const run = (fn) => (...args) =>
    fn(...args).catch((e) => {
      setError(e?.message ?? String(e));
      setScreen("error");
    });

  async function showReveal() {
    const { data, error } = await supabase.rpc("get_reveal");
    if (error) throw error;
    setReveal(data);
    setScreen("result");
  }

  // Starts (or resumes) today's ball. Calling it twice is safe.
  async function face() {
    const { data, error } = await supabase.rpc("start_ball");
    if (error) throw error;
    if (data.finished) return showReveal();
    setBall(data);
    setScreen("batting");
  }

  // Plays the batter animation while fetching the reveal, then shows the result.
  // waitMs delays the fetch (a timed-out ball isn't out on the server until 23s).
  async function animateThenReveal(outcome, waitMs = 0) {
    setShot(outcome);
    const fetchReveal = (async () => {
      await sleep(waitMs);
      const { data, error } = await supabase.rpc("get_reveal");
      if (error) throw error;
      return data;
    })();
    const [data] = await Promise.all([fetchReveal, sleep(SHOT_ANIMATION_MS)]);
    setReveal(data);
    setScreen("result");
  }

  // Clock hit zero: the batter's bowled while the server catches up
  async function timeUp(startedAt) {
    const waitMs = Math.max(0, (secondsLeft(startedAt) + GRACE_SECONDS) * 1000);
    await animateThenReveal("out", waitMs);
  }

  // Asks the server who the typed text matches, without playing it
  async function check(text) {
    const { data, error } = await supabase.rpc("check_answer", { p_text: text });
    if (error) throw error;
    return data;
  }

  // Sends what was typed; the server matches it against today's answers only
  async function play(text) {
    const { data, error } = await supabase.rpc("submit_answer", { p_text: text });
    if (error) throw error;
    if (data.ambiguous || data.unrecognised) return data; // stay on the ball, try again
    if (data.out) await timeUp(ball.started_at);          // arrived too late
    else await animateThenReveal(data.runs);
    return data;
  }

  // On load: sign in and work out where today's ball is up to
  useEffect(() => {
    run(async () => {
      await ensureSession();
      const today = await supabase
        .from("plays")
        .select("started_at, answered_at")
        .eq("date", nzToday())
        .maybeSingle();
      if (today.error) throw today.error;

      const p = today.data;
      if (!p) return setScreen("home");                          // not faced yet
      if (p.answered_at || secondsLeft(p.started_at) < -GRACE_SECONDS) return showReveal(); // done
      return face();                                               // mid-ball: resume the clock
    })();
  }, []);

  if (screen === "loading")
    return (
      <main className="screen screen--center">
        <p className="label blink">Rolling the pitch…</p>
      </main>
    );
  if (screen === "error")
    return (
      <main className="screen screen--center">
        <section className="panel panel--out">
          <p className="label">Rain delay</p>
          <p className="shot" role="alert">{error}</p>
        </section>
        <button type="button" className="btn" onClick={() => window.location.reload()}>Try again</button>
      </main>
    );
  if (screen === "home") return <Home onFace={run(face)} />;
  if (screen === "batting")
    return <Batting ball={ball} shot={shot} onCheck={run(check)} onPlay={run(play)} onTimeUp={run(timeUp)} />;
  return <Result reveal={reveal} />;
}