import RAPIER, {
  type Collider,
  type ColliderDesc,
  type Ray,
  type RayColliderHit,
  type RigidBody,
  type RigidBodyDesc,
  type World
} from "@dimforge/rapier3d-compat";
import * as THREE from "three";

interface PhysicsBinding {
  body: RigidBody;
  mesh: THREE.Mesh;
}

export class PhysicsManager {
  private world: World | null = null;
  private readonly bindings: PhysicsBinding[] = [];

  public async init(): Promise<void> {
    await RAPIER.init();

    this.world = new RAPIER.World({
      x: 0,
      y: -9.81,
      z: 0
    });
  }

  public step(deltaTime: number): void {
    const world = this.getWorld();

    world.timestep = Math.min(deltaTime, 1 / 30);
    world.step();
    this.syncMeshes();
  }

  public createGround(mesh: THREE.Mesh): void {
    const world = this.getWorld();
    const geometry = mesh.geometry;
    const groundThickness = 0.2;
    const groundSize = this.getGroundSize(mesh, geometry);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      mesh.position.x,
      mesh.position.y - groundThickness / 2,
      mesh.position.z
    );
    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      groundSize.width / 2,
      groundThickness / 2,
      groundSize.depth / 2
    );

    world.createCollider(colliderDesc, body);
  }

  public createRigidBody(desc: RigidBodyDesc): RigidBody {
    return this.getWorld().createRigidBody(desc);
  }

  public createCollider(desc: ColliderDesc, body: RigidBody): Collider {
    return this.getWorld().createCollider(desc, body);
  }

  public castRay(
    ray: Ray,
    maxToi: number,
    solid: boolean,
    excludeRigidBody?: RigidBody
  ): RayColliderHit | null {
    return this.getWorld().castRay(
      ray,
      maxToi,
      solid,
      undefined,
      undefined,
      undefined,
      excludeRigidBody
    );
  }

  public createTestFallingObject(scene: THREE.Scene): THREE.Mesh {
    const world = this.getWorld();
    const size = 1;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({
      color: 0xe4572e,
      roughness: 0.5
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 10, 0);
    scene.add(mesh);

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 10, 0);
    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2);

    world.createCollider(colliderDesc, body);
    this.bindRigidBodyToMesh(body, mesh);

    return mesh;
  }

  public bindRigidBodyToMesh(body: RigidBody, mesh: THREE.Mesh): void {
    this.bindings.push({ body, mesh });
  }

  public dispose(): void {
    this.bindings.length = 0;
    this.world?.free();
    this.world = null;
  }

  private syncMeshes(): void {
    for (const { body, mesh } of this.bindings) {
      const position = body.translation();
      const rotation = body.rotation();

      mesh.position.set(position.x, position.y, position.z);
      mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
  }

  private getWorld(): World {
    if (!this.world) {
      throw new Error("PhysicsManager.init() must be called before using physics.");
    }

    return this.world;
  }

  private getGroundSize(
    mesh: THREE.Mesh,
    geometry: THREE.BufferGeometry
  ): { width: number; depth: number } {
    if (geometry instanceof THREE.PlaneGeometry) {
      return {
        width: geometry.parameters.width * mesh.scale.x,
        depth: geometry.parameters.height * mesh.scale.y
      };
    }

    geometry.computeBoundingBox();
    const box = geometry.boundingBox;

    if (!box) {
      return { width: 1, depth: 1 };
    }

    const size = new THREE.Vector3();
    box.getSize(size);

    return {
      width: size.x * mesh.scale.x,
      depth: size.z * mesh.scale.z
    };
  }
}
