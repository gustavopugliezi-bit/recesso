import {
  ClientEvents,
  ServerEvents,
  type PlayerHitPayload,
  type PlayerMovedPayload,
  type PlayerShootPayload
} from "@recesso/shared";
import { io, type Socket } from "socket.io-client";

export interface RemotePlayerState {
  x: number;
  y: number;
  z: number;
  rotation?: number;
}

export type RemotePlayersSnapshot = Record<string, RemotePlayerState>;
export type WorldUpdateHandler = (players: RemotePlayersSnapshot) => void;
export type PlayerHitHandler = (payload: PlayerHitPayload) => void;

export class NetworkManager {
  private readonly socket: Socket;
  private worldUpdateHandler: WorldUpdateHandler | null = null;
  private playerHitHandler: PlayerHitHandler | null = null;

  public constructor() {
    this.socket = io("http://localhost:3000");

    this.socket.on("connect", () => {
      console.log(`Conectado ao servidor! ID: ${this.socket.id}`);
    });

    this.socket.on("WORLD_UPDATE", (data: unknown) => {
      this.worldUpdateHandler?.(this.normalizeWorldUpdate(data));
    });

    this.socket.on(ServerEvents.PLAYER_HIT, (payload: PlayerHitPayload) => {
      this.playerHitHandler?.(payload);
    });
  }

  public getLocalPlayerId(): string | undefined {
    return this.socket.id;
  }

  public emitPlayerMoved(payload: PlayerMovedPayload): void {
    this.socket.emit(ClientEvents.PLAYER_MOVED, payload);
  }

  public emitPlayerShoot(payload: Omit<PlayerShootPayload, "playerId">): void {
    const playerId = this.socket.id;

    if (!playerId) {
      return;
    }

    this.socket.emit(ClientEvents.PLAYER_SHOOT, {
      playerId,
      ...payload
    });
  }

  public onWorldUpdate(handler: WorldUpdateHandler): void {
    this.worldUpdateHandler = handler;
  }

  public onPlayerHit(handler: PlayerHitHandler): void {
    this.playerHitHandler = handler;
  }

  public disconnect(): void {
    this.socket.disconnect();
  }

  private normalizeWorldUpdate(data: unknown): RemotePlayersSnapshot {
    if (this.hasPlayersSnapshot(data)) {
      return data.players;
    }

    if (this.isPlayersSnapshot(data)) {
      return data;
    }

    return {};
  }

  private isPlayersSnapshot(data: unknown): data is RemotePlayersSnapshot {
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return false;
    }

    return Object.values(data).every((value) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
      }

      const playerState = value as Record<string, unknown>;

      return (
        typeof playerState.x === "number" &&
        typeof playerState.y === "number" &&
        typeof playerState.z === "number"
      );
    });
  }

  private hasPlayersSnapshot(data: unknown): data is { players: RemotePlayersSnapshot } {
    return (
      typeof data === "object" &&
      data !== null &&
      "players" in data &&
      this.isPlayersSnapshot((data as { players: unknown }).players)
    );
  }
}
