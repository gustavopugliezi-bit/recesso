import * as THREE from "three";
import { NetworkManager, type RemotePlayersSnapshot } from "../network/NetworkManager";
import { InputManager } from "./InputManager";
import { PhysicsManager } from "./PhysicsManager";
import { Player } from "./Player";
import { Renderer } from "./Renderer";

export class Engine {
  private readonly renderer: Renderer;
  private readonly inputManager: InputManager;
  private readonly physicsManager = new PhysicsManager();
  private readonly networkManager: NetworkManager;
  private readonly remotePlayers = new Map<string, THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>>();
  private readonly clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private isRunning = false;
  private isDisposed = false;
  private player: Player | null = null;

  public constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.inputManager = new InputManager(canvas);
    this.networkManager = new NetworkManager();
    this.networkManager.onWorldUpdate(this.handleWorldUpdate);

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
    this.inputManager.update();

    // Futuramente: atualizar simulacao de jogo e sincronizacao de rede.
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
        `Logs do Debug: Posição do jogador ${playerId}: [${playerState.x}, ${playerState.y}, ${playerState.z}]`
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

  private getOrCreateRemotePlayerMesh(
    playerId: string
  ): THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> {
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

    this.remotePlayers.set(playerId, mesh);
    this.renderer.scene.add(mesh);
    console.log(`Logs do Debug: Cubo remoto criado para ${playerId}`);

    return mesh;
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
