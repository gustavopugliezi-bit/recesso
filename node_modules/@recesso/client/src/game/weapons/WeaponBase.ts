import * as THREE from "three";
import { useGameStore } from "../../store/gameStore";

export class WeaponBase {
  protected lastFireTime = 0;
  public readonly mesh = new THREE.Group();

  public constructor(
    public readonly name: string,
    public readonly damage: number,
    public readonly fireRate: number
  ) {}

  public fire(origin: THREE.Vector3, direction: THREE.Vector3, scene: THREE.Scene): boolean {
    const now = performance.now();

    if (now - this.lastFireTime < this.fireRate) {
      return false;
    }

    const { ammo, notifyWeaponFired, shoot } = useGameStore.getState();

    if (ammo <= 0) {
      return false;
    }

    shoot();
    notifyWeaponFired();
    this.lastFireTime = now;
    this.createTracer(origin, direction, scene);

    return true;
  }

  public update(deltaTime: number): void {
    void deltaTime;
  }

  private createTracer(origin: THREE.Vector3, direction: THREE.Vector3, scene: THREE.Scene): void {
    void origin;

    const tracerOrigin = this.mesh.getWorldPosition(new THREE.Vector3());
    const normalizedDirection = direction.clone().normalize();
    const end = tracerOrigin.clone().add(normalizedDirection.multiplyScalar(50));
    const geometry = new THREE.BufferGeometry().setFromPoints([tracerOrigin, end]);
    const material = new THREE.LineBasicMaterial({
      color: 0xfff06a,
      linewidth: 2
    });
    const tracer = new THREE.Line(geometry, material);

    scene.add(tracer);

    window.setTimeout(() => {
      scene.remove(tracer);
      geometry.dispose();
      material.dispose();
    }, 100);
  }
}
