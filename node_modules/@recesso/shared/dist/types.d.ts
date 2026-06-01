export interface Vector3 {
    x: number;
    y: number;
    z: number;
}
export interface PlayerState {
    id: string;
    position: Vector3;
    rotation: Vector3;
    health: number;
    currentWeapon: string;
}
export interface GameState {
    players: Record<string, PlayerState>;
}
export interface PlayerInput {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
    shoot: boolean;
    pitch: number;
    yaw: number;
}
export interface NetworkPlayerState {
    x: number;
    y: number;
    z: number;
    rotation: number;
    archetype: CharacterArchetype;
    weapon: SchoolWeapon;
    team: TeamName;
    hp: number;
    isNpc?: boolean;
}
export type NetworkPlayers = Record<string, NetworkPlayerState>;
export interface PlayerMovedPayload {
    x: number;
    y: number;
    z: number;
    rotation: number;
}
export interface WorldUpdatePayload {
    players: NetworkPlayers;
}
export interface PlayerShootPayload {
    playerId: string;
    origin: Vector3;
    direction: Vector3;
}
export interface PlayerHitPayload {
    targetId: string;
    hp: number;
    shooterId: string;
}
export type CharacterArchetype = "nerd" | "popular" | "footballer" | "strongman" | "pick-me";
export type SchoolWeapon = "Lapis Junior" | "Caneta Azul" | "Borracha" | "Regua" | "Marca-Texto";
export type TeamName = "EQUIPE LAPIS" | "EQUIPE BORRACHA";
//# sourceMappingURL=types.d.ts.map