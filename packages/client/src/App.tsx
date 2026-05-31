import { GAME_TICK_RATE, type PlayerState } from "@recesso/shared";
import { GameCanvas } from "./components/GameCanvas";
import { HUD } from "./components/HUD";

// Teste rapido (mock) para ver se o TypeScript e o editor reconhecem:
const mockPlayer: PlayerState = {
  id: "123",
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  health: 100,
  currentWeapon: "Caneco"
};

export function App() {
  console.log("Jogador de teste tipado:", mockPlayer);
  console.log("Client tick rate:", GAME_TICK_RATE);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <GameCanvas />
      <HUD />
    </div>
  );
}
