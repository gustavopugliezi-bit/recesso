import type { PlayerHitPayload, PlayerMovedPayload } from "@recesso/shared";
import * as THREE from "three";
import { MapLoader } from "../managers/MapLoader";
import { NetworkManager, type RemotePlayersSnapshot } from "../network/NetworkManager";
import { applyCartoonStyle } from "../shaders/ShaderManager";
import { InputManager } from "./InputManager";
import { PhysicsManager } from "./PhysicsManager";
import { Player } from "./Player";
import { Renderer } from "./Renderer";

export class Engine {
  private readonly renderer: Renderer;
  private readonly inputManager: InputManager;
  private readonly physicsManager = new PhysicsManager();
  private readonly mapLoader: MapLoader;
  private readonly networkManager: NetworkManager;
  private readonly remotePlayers = new Map<string, THREE.Mesh<THREE.BoxGeometry, THREE.Material>>();
  private readonly rayOrigin = new THREE.Vector3();
  private readonly rayDirection = new THREE.Vector3();
  private readonly clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private isRunning = false;
  private isDisposed = false;
  private player: Player | null = null;
  private lastSentPlayerState: PlayerMovedPayload | null = null;

  public constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.inputManager = new InputManager(canvas);
    this.mapLoader = new MapLoader(this.renderer.scene);
    this.networkManager = new NetworkManager();
    this.networkManager.onWorldUpdate(this.handleWorldUpdate);
    this.networkManager.onPlayerHit(this.handlePlayerHit);

    window.addEventListener("resize", this.handleResize);
    this.handleResize();
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    await this.physicsManager.init();

    if (this.isDisposed) {
      this.physicsManager.dispose();
      return;
    }

    this.physicsManager.createGround(this.renderer.groundMesh);
    // Exemplo para quando o asset existir:
    // void this.mapLoader.loadMap("/maps/sala-304.glb");
    this.player = new Player(
      this.renderer.camera,
      this.inputManager,
      this.physicsManager,
      this.renderer.scene
    );

    this.isRunning = true;
    this.clock.start();
    this.animationFrameId = window.requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.isDisposed = true;
    this.isRunning = false;

    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener("resize", this.handleResize);
    this.networkManager.disconnect();
    this.disposeRemotePlayers();
    this.inputManager.dispose();
    this.physicsManager.dispose();
    this.renderer.dispose();
  }

  private readonly loop = (): void => {
    if (!this.isRunning) {
      return;
    }

    const deltaTime = this.clock.getDelta();

    this.update(deltaTime);
    this.renderer.render();

    this.animationFrameId = window.requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number): void {
    this.player?.update(deltaTime);
    this.physicsManager.step(deltaTime);
    this.player?.syncCamera();
    this.syncLocalPlayerToServer();
    this.handleShootInput();
    this.inputManager.update();

    // Futuramente: atualizar simulacao de jogo e sincronizacao de rede.
  }

  private syncLocalPlayerToServer(): void {
    if (!this.player || !this.networkManager.getLocalPlayerId()) {
      return;
    }

    const playerState = this.player.getNetworkState();

    if (!this.hasPlayerStateChanged(playerState)) {
      return;
    }

    this.networkManager.emitPlayerMoved(playerState);
    this.lastSentPlayerState = playerState;
  }

  private hasPlayerStateChanged(nextState: PlayerMovedPayload): boolean {
    if (!this.lastSentPlayerState) {
      return true;
    }

    return (
      Math.abs(this.lastSentPlayerState.x - nextState.x) > 0.001 ||
      Math.abs(this.lastSentPlayerState.y - nextState.y) > 0.001 ||
      Math.abs(this.lastSentPlayerState.z - nextState.z) > 0.001 ||
      Math.abs(this.lastSentPlayerState.rotation - nextState.rotation) > 0.001
    );
  }

  private handleShootInput(): void {
    if (!this.inputManager.currentInputs.shootPressed) {
      return;
    }

    this.renderer.camera.getWorldPosition(this.rayOrigin);
    this.renderer.camera.getWorldDirection(this.rayDirection);
    this.networkManager.emitPlayerShoot({
      origin: {
        x: this.rayOrigin.x,
        y: this.rayOrigin.y,
        z: this.rayOrigin.z
      },
      direction: {
        x: this.rayDirection.x,
        y: this.rayDirection.y,
        z: this.rayDirection.z
      }
    });
  }

  private readonly handleWorldUpdate = (players: RemotePlayersSnapshot): void => {
    const localPlayerId = this.networkManager.getLocalPlayerId();
    const activeRemotePlayerIds = new Set<string>();
    const playerEntries = Object.entries(players);

    console.log(
      `Logs do Debug: Recebi ${playerEntries.length} jogadores. Meu mapa remotePlayers tem ${this.remotePlayers.size} itens.`
    );

    for (const [playerId, playerState] of playerEntries) {
      console.log(
        `Logs do Debug: Posicao do jogador ${playerId}: [${playerState.x}, ${playerState.y}, ${playerState.z}]`
      );

      if (playerId === localPlayerId) {
        continue;
      }

      activeRemotePlayerIds.add(playerId);

      const mesh = this.getOrCreateRemotePlayerMesh(playerId);
      mesh.position.set(playerState.x, playerState.y, playerState.z);
      mesh.rotation.y = playerState.rotation ?? 0;
    }

    for (const [playerId, mesh] of this.remotePlayers) {
      if (activeRemotePlayerIds.has(playerId)) {
        continue;
      }

      this.renderer.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      this.remotePlayers.delete(playerId);
    }
  };

  private readonly handlePlayerHit = (payload: PlayerHitPayload): void => {
    const localPlayerId = this.networkManager.getLocalPlayerId();

    if (payload.targetId === localPlayerId) {
      this.flashDamageOverlay();
      return;
    }

    if (payload.shooterId === localPlayerId) {
      console.log(`Acertaste o jogador ${payload.targetId}`);
    }

    const targetMesh = this.remotePlayers.get(payload.targetId);

    if (targetMesh) {
      this.flashRemotePlayer(targetMesh);
    }
  };

  private getOrCreateRemotePlayerMesh(playerId: string): THREE.Mesh<THREE.BoxGeometry, THREE.Material> {
    const existingMesh = this.remotePlayers.get(playerId);

    if (existingMesh) {
      return existingMesh;
    }

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.8, 0.7),
      new THREE.MeshBasicMaterial({
        color: 0xff305c
      })
    );
    mesh.position.set(0, 0.9, 0);
    mesh.name = `remote-player-${playerId}`;
    applyCartoonStyle(mesh, 0xff305c);

    this.remotePlayers.set(playerId, mesh);
    this.renderer.scene.add(mesh);
    console.log(`Logs do Debug: Cubo remoto criado para ${playerId}`);

    return mesh;
  }

  private flashRemotePlayer(mesh: THREE.Mesh<THREE.BoxGeometry, THREE.Material>): void {
    const material = mesh.material;

    if (!(material instanceof THREE.ShaderMaterial)) {
      return;
    }

    const colorUniform = material.uniforms.baseColor;
    const previousColor = (colorUniform.value as THREE.Color).clone();

    colorUniform.value = new THREE.Color(0xffffff);

    window.setTimeout(() => {
      colorUniform.value = previousColor;
    }, 100);
  }

  private flashDamageOverlay(): void {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.background = "rgba(255, 0, 0, 0.28)";
    overlay.style.zIndex = "9999";
    document.body.appendChild(overlay);

    window.setTimeout(() => {
      overlay.remove();
    }, 140);
  }

  private disposeRemotePlayers(): void {
    for (const mesh of this.remotePlayers.values()) {
      this.renderer.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }

    this.remotePlayers.clear();
  }

  private readonly handleResize = (): void => {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.renderer.resize(width, height);
  };
}
