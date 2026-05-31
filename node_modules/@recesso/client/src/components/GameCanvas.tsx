import { useEffect, useRef } from "react";
import { Engine } from "../game/core/Engine";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const engine = new Engine(canvas);
    void engine.start();

    return () => {
      engine.stop();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}
