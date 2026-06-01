import type { PlayerMovedPayload } from "@recesso/shared";
import RAPIER, { type RigidBody } from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { Caneto } from "../weapons/Caneto";
import { InputManager } from "./InputManager";
import { PhysicsManager } from "./PhysicsManager";

const PLAYER_START_POSITION = { x: 0, y: 3, z: 4 };
const PLAYER_EYE_HEIGHT = 1.25;
const PLAYER_SPEED = 7.5;
const PLAYER_SPRINT_SPEED = 10.5;
const JUMP_IMPULSE = 0.6;
const MOUSE_SENSITIVITY = 0.0022;
const MAX_PITCH = THREE.MathUtils.degToRad(89);

export class Player {
  private readonly body: RigidBody;
  private readonly head = new THREE.Group();
  private readonly weapon = new Caneto();
  private readonly yawQuaternion = new THREE.Quaternion();
  private yaw = Math.PI;
  private pitch = 0;

  public constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly inputManager: InputManager,
    private readonly physicsManager: PhysicsManager,
    private readonly scene: THREE.Scene
  ) {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(PLAYER_START_POSITION.x, PLAYER_START_POSITION.y, PLAYER_START_POSITION.z)
      .lockRotations()
      .setLinearDamping(0.2);

    this.body = this.physicsManager.createRigidBody(bodyDesc);
    this.physicsManager.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3), this.body);

    this.camera.position.set(0, 0, 0);
    this.camera.rotation.set(0, 0, 0);
    this.camera.add(this.weapon.mesh);
    this.head.add(this.camera);
    this.scene.add(this.head);
    this.syncCamera();
  }

  public update(deltaTime: number): void {
    this.updateLook(deltaTime);
    this.updateMovement();
    this.updateJump();
    this.syncCamera();
    this.weapon.update(deltaTime);
  }

  public syncCamera(): void {
    const position = this.body.translation();

    this.head.position.set(position.x, position.y + PLAYER_EYE_HEIGHT, position.z);
    this.head.rotation.set(0, this.yaw, 0);
    this.camera.rotation.set(this.pitch, 0, 0);
    this.head.updateMatrixWorld(true);
  }

  public getNetworkState(): PlayerMovedPayload {
    const position = this.body.translation();

    return {
      x: position.x,
      y: position.y,
      z: position.z,
      rotation: this.yaw
    };
  }

  private updateLook(deltaTime: number): void {
    void deltaTime;

    const { mouseDeltaX, mouseDeltaY } = this.inputManager.currentInputs;

    this.yaw -= mouseDeltaX * MOUSE_SENSITIVITY;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - mouseDeltaY * MOUSE_SENSITIVITY,
      -MAX_PITCH,
      MAX_PITCH
    );

    this.yawQuaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw);
    this.body.setRotation(this.yawQuaternion, true);
  }

  private updateMovement(): void {
    const inputs = this.inputManager.currentInputs;
    const moveX = Number(inputs.right) - Number(inputs.left);
    const moveZ = Number(inputs.backward) - Number(inputs.forward);
    const direction = new THREE.Vector3(moveX, 0, moveZ);
    const currentVelocity = this.body.linvel();

    if (direction.lengthSq() > 0) {
      direction.normalize();
      direction.applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw);
    }

    const speed = inputs.sprint ? PLAYER_SPRINT_SPEED : PLAYER_SPEED;

    this.body.setLinvel(
      {
        x: direction.x * speed,
        y: currentVelocity.y,
        z: direction.z * speed
      },
      true
    );
  }

  private updateJump(): void {
    if (!this.inputManager.currentInputs.jump || !this.isGrounded()) {
      return;
    }

    this.body.applyImpulse({ x: 0, y: JUMP_IMPULSE, z: 0 }, true);
  }

  private isGrounded(): boolean {
    const position = this.body.translation();
    const ray = new RAPIER.Ray(
      { x: position.x, y: position.y, z: position.z },
      { x: 0, y: -1, z: 0 }
    );
    const hit = this.physicsManager.castRay(ray, 0.95, true, this.body);

    return hit !== null;
  }
}
