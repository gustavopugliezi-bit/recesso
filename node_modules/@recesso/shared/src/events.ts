export const ClientEvents = {
  JOIN_GAME: "client:join_game",
  PLAYER_INPUT: "client:player_input",
  PLAYER_MOVED: "client:player_moved",
  WEAPON_FIRE: "client:weapon_fire"
} as const;

export const ServerEvents = {
  GAME_STATE_UPDATE: "server:game_state_update",
  PLAYER_JOINED: "server:player_joined",
  PLAYER_LEFT: "server:player_left",
  WORLD_UPDATE: "server:world_update",
  PLAYER_HIT: "server:player_hit"
} as const;

export type ClientEventName = (typeof ClientEvents)[keyof typeof ClientEvents];
export type ServerEventName = (typeof ServerEvents)[keyof typeof ServerEvents];
