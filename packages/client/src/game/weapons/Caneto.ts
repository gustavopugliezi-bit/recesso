import * as THREE from "three";
import { AudioManager } from "../core/AudioManager";
import { WeaponBase } from "./WeaponBase";

const REST_POSITION = new THREE.Vector3(0.4, -0.3, -0.8);
const REST_ROTATION = new THREE.Euler(-0.08, -0.22, 0.04);

export class Caneto extends WeaponBase {
  private readonly audioManager = AudioManager.getInstance();

  public constructor() {
    super("Caneto", 15, 200);

    this.audioManager.registerWeaponSound("shoot", "/sounds/caneto/shoot.mp3", 0.55);
    this.audioManager.registerWeaponSound("equip", "/sounds/caneto/equip.mp3", 0.45);
    this.buildMesh();
    this.mesh.position.copy(REST_POSITION);
    this.mesh.rotation.copy(REST_ROTATION);
    this.audioManager.playWeaponSound("equip");
  }

  public override fire(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    scene: THREE.Scene
  ): boolean {
    const didFire = super.fire(origin, direction, scene);

    if (didFire) {
      this.mesh.position.z += 0.12;
      this.mesh.rotation.x += 0.16;
      this.audioManager.playWeaponSound("shoot");
    }

    return didFire;
  }

  public override update(deltaTime: number): void {
    const smoothing = Math.min(deltaTime * 14, 1);

    this.mesh.position.lerp(REST_POSITION, smoothing);
    this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, REST_ROTATION.x, smoothing);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, REST_ROTATION.y, smoothing);
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, REST_ROTATION.z, smoothing);
  }

  private buildMesh(): void {
    const bodyGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.75, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x153a72,
      roughness: 0.45,
      metalness: 0.08
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    body.position.z = -0.08;

    const tipGeometry = new THREE.ConeGeometry(0.04, 0.16, 16);
    const tipMaterial = new THREE.MeshStandardMaterial({
      color: 0xd6d8dc,
      roughness: 0.35,
      metalness: 0.2
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -0.52;

    this.mesh.add(body, tip);
  }
}
