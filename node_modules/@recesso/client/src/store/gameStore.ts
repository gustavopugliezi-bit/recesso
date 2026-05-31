import { create } from "zustand";

interface GameStore {
  health: number;
  ammo: number;
  maxAmmo: number;
  currentWeapon: string;
  score: number;
  weaponFireToken: number;
  takeDamage: (amount: number) => void;
  shoot: () => void;
  reload: () => void;
  changeWeapon: (weaponName: string) => void;
  notifyWeaponFired: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  health: 100,
  ammo: 30,
  maxAmmo: 30,
  currentWeapon: "Caneto",
  score: 0,
  weaponFireToken: 0,
  takeDamage: (amount) =>
    set((state) => ({
      health: Math.max(0, state.health - amount)
    })),
  shoot: () =>
    set((state) => ({
      ammo: state.ammo > 0 ? state.ammo - 1 : state.ammo
    })),
  reload: () =>
    set((state) => ({
      ammo: state.maxAmmo
    })),
  changeWeapon: (weaponName) =>
    set({
      currentWeapon: weaponName
    }),
  notifyWeaponFired: () =>
    set((state) => ({
      weaponFireToken: state.weaponFireToken + 1
    }))
}));
