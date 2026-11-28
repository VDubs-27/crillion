import { useEffect, useRef, useState } from "react";
import { secondsLeft } from "../lib/game";
import ShotAnimation from "../components/ShotAnimation";

const letters = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function Batting({ ball, shot, onCheck, onPlay, onTimeUp }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil(secondsLeft(ball.started_at))));
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(null); // { name, typed } waiting for confirmation
  const [busy, setBusy] = useState(false);
  const done = useRef(false); // stops the timer and a submit both firing
  const inputRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      const s = secondsLeft(ball.started_at);
      setLeft(Math.max(0, Math.ceil(s)));
      if (s <= 0 && !done.current) {
        done.current = true;
        clearInterval(id);
        onTimeUp(ball.started_at);
      }
    }, 200);
    return () => clearInterval(id);
  }, [ball.started_at, onTimeUp]);

  // When "Did you mean …?" appears, select the suggested name so
  // Enter confirms it and typing anything replaces it
  useEffect(() => {
    if (pending) inputRef.current?.select();
  }, [pending]);

  function retry(msg) {
    setMessage(msg);
    setBusy(false);
    setTimeout(() => inputRef.current?.select(), 0); // ready to retype
  }

  function handleResult(result) {
    if (result?.ambiguous) return retry("More than one player fits. Add their surname.");
    if (result?.unrecognised) return retry("Not recognised. Try again.");
  }

  async function submit(value) {
    done.current = true;
    setBusy(true);
    const result = await onPlay(value);
    if (result?.ambiguous || result?.unrecognised) {
      done.current = false; // shot not used up
      setPending(null);
      handleResult(result);
    }
  }

  // Enter pressed (or Play shot clicked)
  async function handleSubmit(e) {
    e.preventDefault();
    if (done.current || busy) return;
    const value = text.trim();

    // Enter on the suggested name confirms it. Sends what was originally
    // typed so the result can still show "you typed …"
    if (pending && pending.name === value) return submit(pending.typed);

    if (letters(value).length < 3) return setMessage("Type at least 3 letters.");

    setBusy(true);
    const result = await onCheck(value);
    if (!result || result.out) return; // clock ran out; the timer handles it
    if (!result.match) return handleResult(result);

    // Typed the full name: play straight away
    if (result.exact) return submit(value);

    // Partial name or typo: fill in the full name and confirm first
    setText(result.name);
    setPending({ name: result.name, typed: value });
    setMessage("");
    setBusy(false);
  }

  const low = left <= 5;
  const clock = `0:${String(left).padStart(2, "0")}`;

  return (
    <main className="screen">
      <section className={`panel panel--led timer${low ? " is-low" : ""}`}>
        <p className="label">Ball arrives in</p>
        <div className="timer__digits" aria-live="polite" aria-label={`${left} seconds left`}>{clock}</div>
        <div className="timer__bar" aria-hidden="true">
          {Array.from({ length: 20 }, (_, i) => <i key={i} className={i < left ? "on" : ""} />)}
        </div>
      </section>

      <section className="panel">
        <h1 className="prompt">{ball.prompt}</h1>
      </section>

      <form className="field grow" onSubmit={handleSubmit}>
        <label className="label" htmlFor="answer">Your shot</label>
        <input
          id="answer"
          ref={inputRef}
          className="input"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Type a name"
          value={text}
          disabled={busy || shot !== null}
          onChange={(e) => {
            setText(e.target.value);
            setMessage("");
            setPending(null); // editing cancels the "Did you mean …?"
          }}
        />
        {shot === null && pending && (
          <p className="status status--suggest" role="status">
            Did you mean {pending.name}? Press Enter to play it, or type to change it.
          </p>
        )}
        {shot === null && message && <p className="status status--warn" role="status">{message}</p>}

        {shot !== null && <ShotAnimation outcome={shot} />}

        <div className="spacer" />
        {shot === null && (
          <button type="submit" className={`btn${pending ? " btn--confirm" : ""}`} disabled={busy}>
            {pending ? "Confirm shot" : "Play shot"}
          </button>
        )}
      </form>
    </main>
  );
}