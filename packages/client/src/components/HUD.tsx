import { useGameStore } from "../store/gameStore";
import { WeaponFace } from "./WeaponFace";

const hudStyles = {
  screen: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    fontFamily: "system-ui, sans-serif",
    color: "#ffffff"
  },
  healthPanel: {
    position: "absolute",
    left: 24,
    bottom: 24,
    minWidth: 220,
    padding: 12,
    background: "rgba(12, 16, 24, 0.82)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: 8
  },
  ammoPanel: {
    position: "absolute",
    right: 24,
    bottom: 24,
    minWidth: 220,
    padding: 12,
    textAlign: "right",
    background: "rgba(12, 16, 24, 0.82)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: 8
  },
  healthBar: {
    width: "100%",
    height: 14,
    marginTop: 8,
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.18)",
    borderRadius: 4
  },
  controls: {
    position: "absolute",
    top: 24,
    left: "50%",
    display: "flex",
    gap: 8,
    transform: "translateX(-50%)",
    pointerEvents: "auto"
  },
  button: {
    padding: "8px 12px",
    color: "#10141f",
    background: "#ffffff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 700
  }
} as const;

export function HUD() {
  const health = useGameStore((state) => state.health);
  const ammo = useGameStore((state) => state.ammo);
  const maxAmmo = useGameStore((state) => state.maxAmmo);
  const currentWeapon = useGameStore((state) => state.currentWeapon);
  const takeDamage = useGameStore((state) => state.takeDamage);
  const shoot = useGameStore((state) => state.shoot);
  const reload = useGameStore((state) => state.reload);

  return (
    <div style={hudStyles.screen}>
      <div style={hudStyles.controls}>
        <button style={hudStyles.button} type="button" onClick={() => takeDamage(10)}>
          Tomar Dano
        </button>
        <button style={hudStyles.button} type="button" onClick={shoot}>
          Atirar
        </button>
        <button style={hudStyles.button} type="button" onClick={reload}>
          Recarregar
        </button>
      </div>

      <section style={hudStyles.healthPanel} aria-label="Vida">
        <strong>Health: {health}</strong>
        <div style={hudStyles.healthBar}>
          <div
            style={{
              width: `${health}%`,
              height: "100%",
              background: "#2fd17c"
            }}
          />
        </div>
      </section>

      <section style={hudStyles.ammoPanel} aria-label="Municao">
        <strong>
          Ammo: {ammo} / {maxAmmo}
        </strong>
        <div>{currentWeapon}</div>
      </section>

      <WeaponFace />
    </div>
  );
}
