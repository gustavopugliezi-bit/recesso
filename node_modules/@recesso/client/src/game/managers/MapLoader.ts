import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { applyCartoonStyle } from "../shaders/ShaderManager";

export interface LoadedMap {
  root: THREE.Group;
  interactiveObjects: THREE.Mesh[];
  colliders: THREE.Mesh[];
}

export class MapLoader {
  private readonly loader = new GLTFLoader();
  private readonly interactiveObjects: THREE.Mesh[] = [];
  private readonly colliders: THREE.Mesh[] = [];

  public constructor(private readonly scene: THREE.Scene) {}

  public enableDracoDecoder(decoderPath = "/draco/"): void {
    const dracoLoader = new DRACOLoader();

    dracoLoader.setDecoderPath(decoderPath);
    this.loader.setDRACOLoader(dracoLoader);
  }

  public async loadMap(mapUrl: string): Promise<LoadedMap> {
    console.log(`[MapLoader] A carregar mapa: ${mapUrl}`);

    const gltf = await this.loadGltf(mapUrl);

    this.interactiveObjects.length = 0;
    this.colliders.length = 0;
    this.prepareSceneGraph(gltf);
    this.scene.add(gltf.scene);

    console.log(
      `[MapLoader] Mapa carregado. Interativos: ${this.interactiveObjects.length}. Colliders: ${this.colliders.length}.`
    );

    return {
      root: gltf.scene,
      interactiveObjects: [...this.interactiveObjects],
      colliders: [...this.colliders]
    };
  }

  public getInteractiveObjects(): THREE.Mesh[] {
    return [...this.interactiveObjects];
  }

  public getColliders(): THREE.Mesh[] {
    return [...this.colliders];
  }

  private loadGltf(mapUrl: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        mapUrl,
        resolve,
        (event) => {
          if (event.total > 0) {
            const progress = Math.round((event.loaded / event.total) * 100);
            console.log(`[MapLoader] Progresso ${mapUrl}: ${progress}%`);
            return;
          }

          console.log(`[MapLoader] A carregar ${mapUrl}: ${event.loaded} bytes`);
        },
        (error) => {
          console.error(`[MapLoader] Falha ao carregar mapa ${mapUrl}`, error);
          reject(error);
        }
      );
    });
  }

  private prepareSceneGraph(gltf: GLTF): void {
    gltf.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }

      child.castShadow = true;
      child.receiveShadow = true;

      if (child.name.startsWith("COLLIDER_")) {
        child.visible = false;
        this.colliders.push(child);
        return;
      }

      if (child.name.startsWith("EXPLOSIVE_")) {
        this.interactiveObjects.push(child);
      }

      applyCartoonStyle(child);
    });
  }
}
