import {
  ClientEvents,
  ServerEvents,
  type CharacterArchetype,
  type NetworkPlayers,
  type PlayerHitPayload,
  type PlayerMovedPayload,
  type PlayerShootPayload,
  type SchoolWeapon,
  type TeamName,
  type Vector3
} from "@recesso/shared";
import type { Server, Socket } from "socket.io";

interface ServerPlayer {
  id: string;
  hp: number;
  x: number;
  y: number;
  z: number;
  rotation: number;
  archetype: CharacterArchetype;
  weapon: SchoolWeapon;
  team: TeamName;
  isNpc?: boolean;
  phase?: number;
}

interface ShotValidationResult {
  player: ServerPlayer | null;
  closestMissDistance: number | null;
}

const PLAYER_RADIUS = 0.55;
const PLAYER_HEIGHT = 1.8;
const LAG_COMPENSATION_RADIUS = 0.25;
const MAX_SHOT_DISTANCE = 60;
const CANETO_DAMAGE = 15;
const CAFETERIA_BOUNDS = {
  minX: -16,
  maxX: 16,
  minZ: -10,
  maxZ: 8
};

const COMBATANTS: Array<{
  archetype: CharacterArchetype;
  weapon: SchoolWeapon;
  team: TeamName;
  x: number;
  z: number;
}> = [
  { archetype: "nerd", weapon: "Lapis Junior", team: "EQUIPE LAPIS", x: -10, z: -1 },
  { archetype: "popular", weapon: "Caneta Azul", team: "EQUIPE BORRACHA", x: -4, z: -3 },
  { archetype: "footballer", weapon: "Borracha", team: "EQUIPE LAPIS", x: 3, z: -2 },
  { archetype: "strongman", weapon: "Regua", team: "EQUIPE LAPIS", x: 0, z: 2 },
  { archetype: "pick-me", weapon: "Marca-Texto", team: "EQUIPE BORRACHA", x: 10, z: -1 }
];

export class GameRoom {
  private readonly players: Record<string, ServerPlayer> = {};
  private nextJoinIndex = 0;

  public constructor(private readonly io: Server) {
    this.seedNpcCombatants();
  }

  public handleConnection(socket: Socket): void {
    console.log(`Jogador conectado: ${socket.id}`);

    const archetypeIndex = this.nextJoinIndex % COMBATANTS.length;
    const combatant = COMBATANTS[archetypeIndex];

    this.nextJoinIndex += 1;

    this.players[socket.id] = {
      id: socket.id,
      hp: 100,
      x: combatant.x,
      y: 0.9,
      z: combatant.z + 3,
      rotation: 0,
      archetype: combatant.archetype,
      weapon: combatant.weapon,
      team: combatant.team
    };

    socket.on(ClientEvents.PLAYER_MOVED, (payload: PlayerMovedPayload) => {
      this.updatePlayerPosition(socket.id, payload);
    });

    socket.on(ClientEvents.PLAYER_SHOOT, (payload: PlayerShootPayload) => {
      this.handlePlayerShoot(socket.id, payload);
    });

    socket.on("disconnect", () => {
      delete this.players[socket.id];
      console.log(`Jogador desconectado: ${socket.id}`);
    });
  }

  public emitWorldUpdate(): void {
    this.updateNpcCombatants(Date.now() / 1000);
    this.io.emit("WORLD_UPDATE", this.createNetworkPlayers());
  }

  private updatePlayerPosition(playerId: string, payload: PlayerMovedPayload): void {
    const player = this.players[playerId];

    if (!player) {
      return;
    }

    if (player.isNpc) {
      return;
    }

    player.x = clamp(payload.x, CAFETERIA_BOUNDS.minX, CAFETERIA_BOUNDS.maxX);
    player.y = clamp(payload.y, 0.6, 2.6);
    player.z = clamp(payload.z, CAFETERIA_BOUNDS.minZ, CAFETERIA_BOUNDS.maxZ);
    player.rotation = payload.rotation;
  }

  private handlePlayerShoot(socketId: string, payload: PlayerShootPayload): void {
    console.log("🔫 Tiro disparado pelo jogador:", socketId);

    const shooterId = this.players[socketId] ? socketId : payload.playerId;
    const shooter = this.players[shooterId];

    if (!shooter) {
      console.log("💨 Tiro falhou. Atirador desconhecido.");
      return;
    }

    const direction = normalize(payload.direction);

    if (!direction) {
      console.log("💨 Tiro falhou. Direcao invalida.");
      return;
    }

    const validation = this.findHitPlayer(shooterId, payload.origin, direction);
    const hitPlayer = validation.player;

    if (!hitPlayer) {
      const missDistance =
        validation.closestMissDistance === null ? "sem alvo valido" : validation.closestMissDistance.toFixed(2);

      console.log(`💨 Tiro falhou. Raio passou a ${missDistance} de distância.`);
      return;
    }

    hitPlayer.hp = Math.max(0, hitPlayer.hp - CANETO_DAMAGE);

    console.log("🎯 HIT VALIDADO! Atirador:", shooterId, "| Alvo:", hitPlayer.id);

    const hitPayload: PlayerHitPayload = {
      targetId: hitPlayer.id,
      hp: hitPlayer.hp,
      shooterId
    };

    this.io.emit(ServerEvents.PLAYER_HIT, hitPayload);
  }

  private findHitPlayer(
    shooterId: string,
    origin: Vector3,
    direction: Vector3
  ): ShotValidationResult {
    let closestHit: { player: ServerPlayer; distance: number } | null = null;
    let closestMissDistance: number | null = null;

    for (const player of Object.values(this.players)) {
      if (player.id === shooterId || player.hp <= 0) {
        continue;
      }

      const result = rayIntersectsPlayerCapsule(origin, direction, player);
      closestMissDistance =
        closestMissDistance === null
          ? result.distanceToPlayer
          : Math.min(closestMissDistance, result.distanceToPlayer);

      if (!result.hit || result.projectedDistance > MAX_SHOT_DISTANCE) {
        continue;
      }

      if (!closestHit || result.projectedDistance < closestHit.distance) {
        closestHit = { player, distance: result.projectedDistance };
      }
    }

    return {
      player: closestHit?.player ?? null,
      closestMissDistance
    };
  }

  private createNetworkPlayers(): NetworkPlayers {
    const networkPlayers: NetworkPlayers = {};

    for (const [playerId, player] of Object.entries(this.players)) {
      networkPlayers[playerId] = {
        x: player.x,
        y: player.y,
        z: player.z,
        rotation: player.rotation,
        archetype: player.archetype,
        weapon: player.weapon,
        team: player.team,
        hp: player.hp,
        isNpc: player.isNpc
      };
    }

    return networkPlayers;
  }

  private seedNpcCombatants(): void {
    for (let index = 0; index < COMBATANTS.length; index += 1) {
      const combatant = COMBATANTS[index];

      this.players[`npc-${combatant.archetype}`] = {
        id: `npc-${combatant.archetype}`,
        hp: 100,
        x: combatant.x,
        y: 0.9,
        z: combatant.z,
        rotation: 0,
        archetype: combatant.archetype,
        weapon: combatant.weapon,
        team: combatant.team,
        isNpc: true,
        phase: index * 1.37
      };
    }
  }

  private updateNpcCombatants(timeSeconds: number): void {
    for (const player of Object.values(this.players)) {
      if (!player.isNpc) {
        continue;
      }

      const phase = player.phase ?? 0;
      const home = COMBATANTS.find((combatant) => combatant.archetype === player.archetype);

      if (!home) {
        continue;
      }

      player.x = clamp(home.x + Math.sin(timeSeconds * 0.9 + phase) * 1.2, CAFETERIA_BOUNDS.minX, CAFETERIA_BOUNDS.maxX);
      player.z = clamp(home.z + Math.cos(timeSeconds * 0.7 + phase) * 0.9, CAFETERIA_BOUNDS.minZ, CAFETERIA_BOUNDS.maxZ);
      player.rotation = Math.atan2(Math.sin(timeSeconds + phase), Math.cos(timeSeconds * 0.8 + phase));
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(vector: Vector3): Vector3 | null {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  if (length <= Number.EPSILON) {
    return null;
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function rayIntersectsPlayerCapsule(
  origin: Vector3,
  direction: Vector3,
  player: ServerPlayer
): { hit: boolean; projectedDistance: number; distanceToPlayer: number } {
  const radius = PLAYER_RADIUS + LAG_COMPENSATION_RADIUS;
  const minY = player.y - PLAYER_HEIGHT / 2;
  const maxY = player.y + PLAYER_HEIGHT / 2;
  const toPlayerX = player.x - origin.x;
  const toPlayerZ = player.z - origin.z;
  const horizontalDirectionLengthSq = direction.x * direction.x + direction.z * direction.z;

  if (horizontalDirectionLengthSq <= Number.EPSILON) {
    return { hit: false, projectedDistance: 0, distanceToPlayer: Number.POSITIVE_INFINITY };
  }

  const projectedDistance =
    (toPlayerX * direction.x + toPlayerZ * direction.z) / horizontalDirectionLengthSq;

  if (projectedDistance < 0) {
    return {
      hit: false,
      projectedDistance,
      distanceToPlayer: Math.hypot(toPlayerX, toPlayerZ)
    };
  }

  const closestX = origin.x + direction.x * projectedDistance;
  const closestZ = origin.z + direction.z * projectedDistance;
  const distanceToAxis = Math.hypot(player.x - closestX, player.z - closestZ);

  if (distanceToAxis > radius) {
    return { hit: false, projectedDistance, distanceToPlayer: distanceToAxis };
  }

  const yAtClosestPoint = origin.y + direction.y * projectedDistance;
  const verticalMargin = radius;

  if (yAtClosestPoint < minY - verticalMargin || yAtClosestPoint > maxY + verticalMargin) {
    return { hit: false, projectedDistance, distanceToPlayer: distanceToAxis };
  }

  return { hit: true, projectedDistance, distanceToPlayer: distanceToAxis };
}
