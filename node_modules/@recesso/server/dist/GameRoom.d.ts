import type { Server, Socket } from "socket.io";
export declare class GameRoom {
    private readonly io;
    private readonly players;
    constructor(io: Server);
    handleConnection(socket: Socket): void;
    emitWorldUpdate(): void;
    private updatePlayerPosition;
    private handlePlayerShoot;
    private findHitPlayer;
    private createNetworkPlayers;
}
//# sourceMappingURL=GameRoom.d.ts.map