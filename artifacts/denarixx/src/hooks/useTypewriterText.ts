import { useEffect, useState } from "react";

export function useTypewriterText(text: string, speed = 12) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");

    if (!text) return;

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, speed);

    return () => window.clearInterval(timer);
  }, [text, speed]);

  return displayed;
}
