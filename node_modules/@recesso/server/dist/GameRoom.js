import { ClientEvents, ServerEvents } from "@recesso/shared";
const PLAYER_RADIUS = 0.55;
const PLAYER_HEIGHT = 1.8;
const LAG_COMPENSATION_RADIUS = 0.25;
const MAX_SHOT_DISTANCE = 60;
const CANETO_DAMAGE = 15;
export class GameRoom {
    constructor(io) {
        this.io = io;
        this.players = {};
    }
    handleConnection(socket) {
        console.log(`Jogador conectado: ${socket.id}`);
        this.players[socket.id] = {
            id: socket.id,
            hp: 100,
            x: Math.random() * 4 - 2,
            y: 0.9,
            z: -4,
            rotation: 0
        };
        socket.on(ClientEvents.PLAYER_MOVED, (payload) => {
            this.updatePlayerPosition(socket.id, payload);
        });
        socket.on(ClientEvents.PLAYER_SHOOT, (payload) => {
            this.handlePlayerShoot(socket.id, payload);
        });
        socket.on("disconnect", () => {
            delete this.players[socket.id];
            console.log(`Jogador desconectado: ${socket.id}`);
        });
    }
    emitWorldUpdate() {
        this.io.emit("WORLD_UPDATE", this.createNetworkPlayers());
    }
    updatePlayerPosition(playerId, payload) {
        const player = this.players[playerId];
        if (!player) {
            return;
        }
        player.x = payload.x;
        player.y = payload.y;
        player.z = payload.z;
        player.rotation = payload.rotation;
    }
    handlePlayerShoot(socketId, payload) {
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
            const missDistance = validation.closestMissDistance === null ? "sem alvo valido" : validation.closestMissDistance.toFixed(2);
            console.log(`💨 Tiro falhou. Raio passou a ${missDistance} de distância.`);
            return;
        }
        hitPlayer.hp = Math.max(0, hitPlayer.hp - CANETO_DAMAGE);
        console.log("🎯 HIT VALIDADO! Atirador:", shooterId, "| Alvo:", hitPlayer.id);
        const hitPayload = {
            targetId: hitPlayer.id,
            hp: hitPlayer.hp,
            shooterId
        };
        this.io.emit(ServerEvents.PLAYER_HIT, hitPayload);
    }
    findHitPlayer(shooterId, origin, direction) {
        let closestHit = null;
        let closestMissDistance = null;
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
    createNetworkPlayers() {
        const networkPlayers = {};
        for (const [playerId, player] of Object.entries(this.players)) {
            networkPlayers[playerId] = {
                x: player.x,
                y: player.y,
                z: player.z,
                rotation: player.rotation
            };
        }
        return networkPlayers;
    }
}
function normalize(vector) {
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
function rayIntersectsPlayerCapsule(origin, direction, player) {
    const radius = PLAYER_RADIUS + LAG_COMPENSATION_RADIUS;
    const minY = player.y - PLAYER_HEIGHT / 2;
    const maxY = player.y + PLAYER_HEIGHT / 2;
    const toPlayerX = player.x - origin.x;
    const toPlayerZ = player.z - origin.z;
    const horizontalDirectionLengthSq = direction.x * direction.x + direction.z * direction.z;
    if (horizontalDirectionLengthSq <= Number.EPSILON) {
        return { hit: false, projectedDistance: 0, distanceToPlayer: Number.POSITIVE_INFINITY };
    }
    const projectedDistance = (toPlayerX * direction.x + toPlayerZ * direction.z) / horizontalDirectionLengthSq;
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
