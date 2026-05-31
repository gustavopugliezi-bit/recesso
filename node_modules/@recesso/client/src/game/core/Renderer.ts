import * as THREE from "three";

export class Renderer {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly groundMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;

  private readonly renderer: THREE.WebGLRenderer;

  public constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x87ceeb);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.camera.position.set(0, 2, 6);
    this.camera.lookAt(0, 0, 0);

    this.setupLighting();
    this.groundMesh = this.createGroundMesh();
    this.setupTestEnvironment();
  }

  public resize(width: number, height: number): void {
    const safeHeight = Math.max(height, 1);

    this.camera.aspect = width / safeHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, safeHeight, false);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(4, 8, 5);
    this.scene.add(directionalLight);
  }

  private setupTestEnvironment(): void {
    this.scene.add(this.groundMesh);

    const grid = new THREE.GridHelper(40, 40, 0xffffff, 0x4f7d48);
    grid.position.y = 0.01;
    this.scene.add(grid);
  }

  private createGroundMesh(): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> {
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x78b66b,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;

    return ground;
  }
}
