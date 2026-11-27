import { useEffect, useState } from "react";
import { supabase, ensureSession } from "./lib/supabase";
import { nzToday, secondsLeft, sleep, GRACE_SECONDS } from "./lib/game";
import Home from "./screens/Home";
import Batting from "./screens/Batting";
import Result from "./screens/Result";

export default function App() {
  // loading | home | batting | waiting | result | error
  const [screen, setScreen] = useState("loading");
  const [ball, setBall] = useState(null);     // { prompt, started_at }
  const [reveal, setReveal] = useState(null); // get_reveal() result
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

  // Clock hit zero: wait until the server also counts it as out, then reveal
  async function timeUp(startedAt) {
    setScreen("waiting");
    await sleep(Math.max(0, (secondsLeft(startedAt) + GRACE_SECONDS) * 1000));
    await showReveal();
  }

  // Sends what was typed; the server matches it against today's answers only
  async function play(text) {
    const { data, error } = await supabase.rpc("submit_answer", { p_text: text });
    if (error) throw error;
    if (data.ambiguous || data.unrecognised) return data; // stay on the ball, try again
    if (data.out) await timeUp(ball.started_at);          // arrived too late
    else await showReveal();
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

  if (screen === "loading") return <p>Loading…</p>;
  if (screen === "error") return <p role="alert">{error}</p>;
  if (screen === "home") return <Home onFace={run(face)} />;
  if (screen === "batting")
    return <Batting ball={ball} onPlay={run(play)} onTimeUp={run(timeUp)} />;
  if (screen === "waiting") return <p>Checking the replay…</p>;
  return <Result reveal={reveal} />;
}