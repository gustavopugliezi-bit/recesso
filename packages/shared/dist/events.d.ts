export declare const ClientEvents: {
    readonly JOIN_GAME: "client:join_game";
    readonly PLAYER_INPUT: "client:player_input";
    readonly PLAYER_MOVED: "client:player_moved";
    readonly PLAYER_SHOOT: "client:player_shoot";
    readonly WEAPON_FIRE: "client:weapon_fire";
};
export declare const ServerEvents: {
    readonly GAME_STATE_UPDATE: "server:game_state_update";
    readonly PLAYER_JOINED: "server:player_joined";
    readonly PLAYER_LEFT: "server:player_left";
    readonly WORLD_UPDATE: "server:world_update";
    readonly PLAYER_HIT: "server:player_hit";
};
export type ClientEventName = (typeof ClientEvents)[keyof typeof ClientEvents];
export type ServerEventName = (typeof ServerEvents)[keyof typeof ServerEvents];
//# sourceMappingURL=events.d.ts.map