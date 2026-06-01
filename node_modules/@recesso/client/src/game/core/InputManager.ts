export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  isShooting: boolean;
  shootPressed: boolean;
  mouseDeltaX: number;
  mouseDeltaY: number;
}

export class InputManager {
  public readonly currentInputs: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    isShooting: false,
    shootPressed: false,
    mouseDeltaX: 0,
    mouseDeltaY: 0
  };

  private readonly canvas: HTMLCanvasElement;

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("click", this.handleCanvasClick);
  }

  public update(): void {
    this.currentInputs.mouseDeltaX = 0;
    this.currentInputs.mouseDeltaY = 0;
    this.currentInputs.shootPressed = false;
  }

  public dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("click", this.handleCanvasClick);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.setKeyState(event.code, true);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.setKeyState(event.code, false);
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== this.canvas) {
      return;
    }

    this.currentInputs.mouseDeltaX += event.movementX;
    this.currentInputs.mouseDeltaY += event.movementY;
  };

  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.currentInputs.isShooting = true;
      this.currentInputs.shootPressed = true;
    }
  };

  private readonly handleMouseUp = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.currentInputs.isShooting = false;
    }
  };

  private readonly handleCanvasClick = (): void => {
    void this.canvas.requestPointerLock();
  };

  private setKeyState(code: string, isPressed: boolean): void {
    switch (code) {
      case "KeyW":
        this.currentInputs.forward = isPressed;
        break;
      case "KeyS":
        this.currentInputs.backward = isPressed;
        break;
      case "KeyA":
        this.currentInputs.left = isPressed;
        break;
      case "KeyD":
        this.currentInputs.right = isPressed;
        break;
      case "Space":
        this.currentInputs.jump = isPressed;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.currentInputs.sprint = isPressed;
        break;
      default:
        break;
    }
  }
}
