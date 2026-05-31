import { useEffect, useRef, useState } from "react";
import { AudioManager } from "../game/core/AudioManager";
import { useGameStore } from "../store/gameStore";

type FaceMood = "idle" | "firing" | "blink";

const expressions: Record<FaceMood, string> = {
  idle: "( Ò_Ó )",
  firing: "( > O < ) !!",
  blink: "( - _ - )"
};

const faceStyles = {
  panel: {
    position: "fixed",
    right: 150,
    bottom: 50,
    minWidth: 132,
    padding: "10px 14px",
    color: "#7df9ff",
    background: "#05090d",
    border: "2px solid rgba(125, 249, 255, 0.7)",
    borderRadius: 8,
    boxShadow: "0 0 18px rgba(125, 249, 255, 0.25)",
    fontFamily: "Consolas, 'Courier New', monospace",
    fontSize: 20,
    fontWeight: 700,
    textAlign: "center",
    letterSpacing: 0,
    pointerEvents: "none",
    userSelect: "none"
  },
  name: {
    display: "block",
    marginTop: 4,
    color: "#8cff9b",
    fontSize: 10,
    fontWeight: 700
  }
} as const;

function getRandomBlinkDelay(): number {
  return 3000 + Math.random() * 2000;
}

export function WeaponFace() {
  const weaponFireToken = useGameStore((state) => state.weaponFireToken);
  const [mood, setMood] = useState<FaceMood>("idle");
  const audioManagerRef = useRef(AudioManager.getInstance());
  const moodRef = useRef<FaceMood>("idle");
  const fireTimeoutRef = useRef<number | null>(null);
  const blinkTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    audioManagerRef.current.registerWeaponSound("scream", "/sounds/caneto/scream.mp3", 0.5);
  }, []);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    if (weaponFireToken === 0) {
      return;
    }

    if (fireTimeoutRef.current !== null) {
      window.clearTimeout(fireTimeoutRef.current);
    }

    audioManagerRef.current.playWeaponSound("scream");
    setMood("firing");
    fireTimeoutRef.current = window.setTimeout(() => {
      setMood("idle");
      fireTimeoutRef.current = null;
    }, 150);
  }, [weaponFireToken]);

  useEffect(() => {
    let blinkResetTimeout: number | null = null;

    const scheduleBlink = (): void => {
      blinkTimeoutRef.current = window.setTimeout(() => {
        if (moodRef.current === "idle") {
          setMood("blink");
          blinkResetTimeout = window.setTimeout(() => {
            setMood("idle");
            scheduleBlink();
          }, 120);

          return;
        }

        scheduleBlink();
      }, getRandomBlinkDelay());
    };

    scheduleBlink();

    return () => {
      if (blinkTimeoutRef.current !== null) {
        window.clearTimeout(blinkTimeoutRef.current);
      }

      if (blinkResetTimeout !== null) {
        window.clearTimeout(blinkResetTimeout);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (fireTimeoutRef.current !== null) {
        window.clearTimeout(fireTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div style={faceStyles.panel} aria-label="Rosto do Caneto">
      {expressions[mood]}
      <span style={faceStyles.name}>CANETO</span>
    </div>
  );
}
