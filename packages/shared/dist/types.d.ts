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
}
export type NetworkPlayers = Record<string, NetworkPlayerState>;
export interface PlayerMovedPayload extends NetworkPlayerState {
}
export interface WorldUpdatePayload {
    players: NetworkPlayers;
}
//# sourceMappingURL=types.d.ts.map