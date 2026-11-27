import { useEffect, useRef, useState } from "react";
import { secondsLeft } from "../lib/game";

const letters = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function Batting({ ball, onPlay, onTimeUp }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil(secondsLeft(ball.started_at))));
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
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

  // Runs when Enter is pressed. Matching happens on the server,
  // against today's answers only, so the answer key never reaches the browser.
  async function handleSubmit(e) {
    e.preventDefault();
    if (done.current || sending) return;
    if (letters(text).length < 3) return setMessage("Type at least 3 letters.");

    done.current = true;
    setSending(true);
    const result = await onPlay(text.trim());
    // Shot not used up: let them try again while the clock runs
    if (result?.ambiguous || result?.unrecognised) {
      done.current = false;
      setSending(false);
      setMessage(
        result.ambiguous
          ? "More than one player fits. Add their surname."
          : "Not recognised. Try again."
      );
      setTimeout(() => inputRef.current?.select(), 0); // ready to retype
    }
  }

  return (
    <main>
      <p aria-live="polite">{left}s</p>
      <h2>{ball.prompt}</h2>

      <form onSubmit={handleSubmit}>
        <label htmlFor="answer">Your shot</label>
        <input
          id="answer"
          ref={inputRef}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="go"
          value={text}
          disabled={sending}
          onChange={(e) => {
            setText(e.target.value);
            setMessage("");
          }}
        />
        <button type="submit" disabled={sending}>Play shot</button>
      </form>

      {message && <p role="status">{message}</p>}
    </main>
  );
}