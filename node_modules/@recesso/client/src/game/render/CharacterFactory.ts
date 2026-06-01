import type { CharacterArchetype, NetworkPlayerState, SchoolWeapon, TeamName } from "@recesso/shared";
import * as THREE from "three";
import { applyCartoonStyle } from "../shaders/ShaderManager";

export interface CharacterRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weapon: THREE.Group;
  face: THREE.Group;
}

const CHARACTER_NAMES: Record<CharacterArchetype, string> = {
  nerd: "O NERD",
  popular: "A POPULAR",
  footballer: "O JOGADOR",
  strongman: "O MAROMBEIRO",
  "pick-me": "A PICK ME"
};

const ARCHETYPE_COLORS: Record<CharacterArchetype, { skin: number; hair: number; accent: number; shoe: number }> = {
  nerd: { skin: 0xc58a50, hair: 0x0f0f0d, accent: 0x154734, shoe: 0x6b4726 },
  popular: { skin: 0xc78b54, hair: 0x4b2d18, accent: 0xf09ab9, shoe: 0xf2e5d7 },
  footballer: { skin: 0xb7773c, hair: 0x11100e, accent: 0x0f5a3d, shoe: 0x111111 },
  strongman: { skin: 0xc08a52, hair: 0x12110f, accent: 0x1f6b4a, shoe: 0x1f6b4a },
  "pick-me": { skin: 0xc9874f, hair: 0x11100e, accent: 0xf0a2bf, shoe: 0x151515 }
};

const TEAM_COLORS: Record<TeamName, number> = {
  "EQUIPE LAPIS": 0x1c74c9,
  "EQUIPE BORRACHA": 0xc5372d
};

export function createCharacterModel(
  archetype: CharacterArchetype,
  weaponName: SchoolWeapon,
  team: TeamName
): CharacterRig {
  const colors = ARCHETYPE_COLORS[archetype];
  const root = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  const weapon = createWeaponModel(weaponName);
  const face = new THREE.Group();

  root.name = `character-${archetype}`;
  root.userData.characterRig = true;
  root.add(body, head, leftArm, rightArm, leftLeg, rightLeg);

  body.position.y = 1.05;
  head.position.y = 1.88;
  leftArm.position.set(-0.42, 1.35, 0);
  rightArm.position.set(0.42, 1.35, 0);
  leftLeg.position.set(-0.2, 0.5, 0);
  rightLeg.position.set(0.2, 0.5, 0);

  addTorso(body, archetype, colors.accent, team);
  addHead(head, archetype, colors);
  addArm(leftArm, colors.skin, colors.accent, archetype === "strongman" ? 1.32 : 1);
  addArm(rightArm, colors.skin, colors.accent, archetype === "strongman" ? 1.35 : 1);
  addLeg(leftLeg, colors.skin, colors.accent, colors.shoe, archetype);
  addLeg(rightLeg, colors.skin, colors.accent, colors.shoe, archetype);

  weapon.position.set(0.18, -0.42, 0.24);
  weapon.rotation.set(0.7, -0.25, -0.45);
  rightArm.add(weapon);

  face.name = "reactive-face";
  addFace(face, archetype);
  face.position.set(0, 0.03, 0.32);
  head.add(face);

  const label = createBillboardLabel(CHARACTER_NAMES[archetype], TEAM_COLORS[team], 0.95, 0.22);
  label.position.y = 2.75;
  root.add(label);

  addArchetypeDetails(root, body, head, archetype, colors);

  return { root, body, head, leftArm, rightArm, leftLeg, rightLeg, weapon, face };
}

export function updateCharacterRig(rig: CharacterRig, state: NetworkPlayerState, time: number): void {
  rig.root.position.set(state.x, state.y - 0.86, state.z);
  rig.root.rotation.y = state.rotation;

  const gait = Math.sin(time * 8 + state.x + state.z);
  const bob = Math.abs(Math.sin(time * 6 + state.x * 0.2)) * 0.08;

  rig.body.position.y = 1.05 + bob;
  rig.head.position.y = 1.88 + bob;
  rig.head.rotation.z = Math.sin(time * 4 + state.z) * 0.08;
  rig.leftArm.rotation.x = gait * 0.6;
  rig.rightArm.rotation.x = -gait * 0.35 - 0.35;
  rig.leftLeg.rotation.x = -gait * 0.5;
  rig.rightLeg.rotation.x = gait * 0.5;
  rig.weapon.rotation.z = -0.45 + Math.sin(time * 10) * 0.12;

  const moodScale = 1 + Math.sin(time * 12 + state.x) * 0.04;
  rig.face.scale.set(moodScale, moodScale, moodScale);
}

export function flashCharacterRig(rig: CharacterRig): void {
  const materials: THREE.ShaderMaterial[] = [];

  rig.root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
      materials.push(child.material);
    }
  });

  const previousColors = materials.map((material) => (material.uniforms.baseColor.value as THREE.Color).clone());

  materials.forEach((material) => {
    material.uniforms.baseColor.value = new THREE.Color(0xffffff);
  });

  window.setTimeout(() => {
    materials.forEach((material, index) => {
      material.uniforms.baseColor.value = previousColors[index];
    });
  }, 120);
}

export function disposeCharacterRig(rig: CharacterRig): void {
  rig.root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.geometry.dispose();

    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
      return;
    }

    child.material.dispose();
  });
}

function addTorso(body: THREE.Group, archetype: CharacterArchetype, accent: number, team: TeamName): void {
  const shirt = toonMesh(new THREE.BoxGeometry(0.64, 0.72, 0.28), 0xf4eee3);
  shirt.scale.x = archetype === "strongman" ? 1.2 : 1;
  body.add(shirt);

  const collar = toonMesh(new THREE.BoxGeometry(0.7, 0.08, 0.31), accent);
  collar.position.y = 0.33;
  body.add(collar);

  const shorts = toonMesh(new THREE.BoxGeometry(0.7, 0.32, 0.32), 0x123f31);
  shorts.position.y = -0.5;
  body.add(shorts);

  if (archetype === "footballer") {
    const number = createTextPlane("100", 0x0f5a3d, 0.34, 0.18, "transparent");
    number.position.set(0, 0.08, 0.151);
    body.add(number);
  }

  if (archetype === "nerd") {
    const bow = toonMesh(new THREE.TorusGeometry(0.08, 0.03, 8, 16), accent);
    bow.rotation.z = Math.PI / 2;
    bow.position.set(0, 0.26, 0.18);
    body.add(bow);
  }

  const teamPatch = toonMesh(new THREE.BoxGeometry(0.2, 0.14, 0.02), TEAM_COLORS[team]);
  teamPatch.position.set(-0.2, 0.12, 0.16);
  body.add(teamPatch);
}

function addHead(head: THREE.Group, archetype: CharacterArchetype, colors: { skin: number; hair: number; accent: number }): void {
  const face = toonMesh(new THREE.SphereGeometry(0.32, 24, 18), colors.skin);
  face.scale.set(0.92, 1.08, 0.86);
  head.add(face);

  for (let index = 0; index < 7; index += 1) {
    const curl = toonMesh(new THREE.SphereGeometry(0.14, 12, 10), colors.hair);
    const angle = (index / 7) * Math.PI * 1.2 + 0.2;
    curl.position.set(Math.cos(angle) * 0.2, 0.25 + Math.sin(angle) * 0.06, 0.02 + Math.sin(index) * 0.12);
    curl.scale.set(1.2, 0.8, 1);
    head.add(curl);
  }

  if (archetype === "nerd") {
    const leftLens = toonMesh(new THREE.TorusGeometry(0.12, 0.012, 8, 20), 0x0a0a0a);
    const rightLens = leftLens.clone();
    leftLens.position.set(-0.12, 0.02, 0.29);
    rightLens.position.set(0.12, 0.02, 0.29);
    head.add(leftLens, rightLens);
    const bridge = toonMesh(new THREE.BoxGeometry(0.1, 0.025, 0.02), 0x0a0a0a);
    bridge.position.set(0, 0.02, 0.29);
    head.add(bridge);
  }

  if (archetype === "popular") {
    const ponytail = toonMesh(new THREE.SphereGeometry(0.18, 14, 12), colors.hair);
    ponytail.position.set(0.28, 0.08, -0.18);
    ponytail.scale.set(0.8, 1.5, 0.8);
    head.add(ponytail);
    const bow = toonMesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16), colors.accent);
    bow.rotation.z = Math.PI / 2;
    bow.position.set(0.03, 0.34, 0.14);
    head.add(bow);
  }

  if (archetype === "strongman") {
    const cap = toonMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 24), 0xf1e6d0);
    cap.position.y = 0.33;
    cap.rotation.z = -0.15;
    head.add(cap);
    const brim = toonMesh(new THREE.BoxGeometry(0.34, 0.07, 0.18), colors.accent);
    brim.position.set(0.12, 0.31, 0.24);
    brim.rotation.z = -0.15;
    head.add(brim);
  }

  if (archetype === "pick-me") {
    for (const x of [-0.24, 0.24]) {
      const bun = toonMesh(new THREE.SphereGeometry(0.16, 14, 12), colors.hair);
      bun.position.set(x, 0.25, -0.02);
      head.add(bun);
    }
  }
}

function addFace(face: THREE.Group, archetype: CharacterArchetype): void {
  const eyeScale = archetype === "strongman" ? 1.18 : 1;

  for (const x of [-0.1, 0.1]) {
    const eye = toonMesh(new THREE.SphereGeometry(0.055, 12, 8), 0xffffff);
    eye.position.set(x, 0.04, 0);
    eye.scale.y = 1.7 * eyeScale;
    face.add(eye);

    const pupil = toonMesh(new THREE.SphereGeometry(0.025, 8, 6), 0x090909);
    pupil.position.set(x + 0.012, 0.02, 0.045);
    face.add(pupil);
  }

  const smile = toonMesh(new THREE.TorusGeometry(0.12, 0.014, 8, 24, Math.PI), 0x15110f);
  smile.position.set(0, -0.11, 0.04);
  smile.rotation.z = Math.PI;
  face.add(smile);
}

function addArm(arm: THREE.Group, skin: number, accent: number, muscleScale: number): void {
  const sleeve = toonMesh(new THREE.CapsuleGeometry(0.12 * muscleScale, 0.22, 8, 12), 0xf4eee3);
  sleeve.rotation.z = Math.PI / 2;
  sleeve.position.x = 0.05;
  arm.add(sleeve);

  const forearm = toonMesh(new THREE.CapsuleGeometry(0.1 * muscleScale, 0.38, 8, 12), skin);
  forearm.rotation.z = Math.PI / 2;
  forearm.position.set(0.22, -0.16, 0);
  arm.add(forearm);

  const wrist = toonMesh(new THREE.TorusGeometry(0.1 * muscleScale, 0.018, 8, 14), accent);
  wrist.position.set(0.42, -0.16, 0);
  wrist.rotation.x = Math.PI / 2;
  arm.add(wrist);
}

function addLeg(
  leg: THREE.Group,
  skin: number,
  accent: number,
  shoe: number,
  archetype: CharacterArchetype
): void {
  const sockColor = archetype === "popular" || archetype === "pick-me" ? 0xf6eee0 : 0xffffff;
  const thigh = toonMesh(new THREE.CapsuleGeometry(0.11, 0.28, 8, 12), skin);
  thigh.position.y = 0.08;
  leg.add(thigh);

  const sock = toonMesh(new THREE.CapsuleGeometry(0.1, archetype === "footballer" ? 0.44 : 0.36, 8, 12), sockColor);
  sock.position.y = -0.3;
  leg.add(sock);

  const stripe = toonMesh(new THREE.TorusGeometry(0.1, 0.012, 8, 14), accent);
  stripe.position.y = -0.12;
  stripe.rotation.x = Math.PI / 2;
  leg.add(stripe);

  const foot = toonMesh(new THREE.BoxGeometry(0.24, 0.14, 0.42), shoe);
  foot.position.set(0, -0.63, 0.08);
  leg.add(foot);
}

function addArchetypeDetails(
  root: THREE.Group,
  body: THREE.Group,
  head: THREE.Group,
  archetype: CharacterArchetype,
  colors: { skin: number; hair: number; accent: number; shoe: number }
): void {
  if (archetype === "nerd") {
    const backpack = toonMesh(new THREE.BoxGeometry(0.5, 0.7, 0.18), 0x6b4726);
    backpack.position.set(0, 1.12, -0.24);
    root.add(backpack);

    const book = toonMesh(new THREE.BoxGeometry(0.28, 0.42, 0.07), 0x205d47);
    book.position.set(-0.56, 1.0, 0.1);
    book.rotation.z = 0.22;
    root.add(book);
  }

  if (archetype === "popular") {
    const phone = toonMesh(new THREE.BoxGeometry(0.17, 0.28, 0.035), 0xf09ab9);
    phone.position.set(0.72, 1.55, 0.2);
    phone.rotation.z = -0.18;
    root.add(phone);
  }

  if (archetype === "footballer") {
    const ball = toonMesh(new THREE.SphereGeometry(0.18, 16, 12), 0xf2efe8);
    ball.position.set(0.55, 0.85, -0.08);
    root.add(ball);
    const seam = toonMesh(new THREE.TorusGeometry(0.19, 0.012, 8, 20), 0x111111);
    seam.position.copy(ball.position);
    seam.rotation.x = Math.PI / 2;
    root.add(seam);
  }

  if (archetype === "strongman") {
    const necklace = toonMesh(new THREE.TorusGeometry(0.18, 0.012, 8, 18), 0xd8b650);
    necklace.position.set(0, 1.34, 0.18);
    root.add(necklace);
  }

  if (archetype === "pick-me") {
    const backpack = toonMesh(new THREE.BoxGeometry(0.42, 0.58, 0.16), colors.accent);
    backpack.position.set(0.24, 1.1, -0.25);
    root.add(backpack);
  }

  void body;
  void head;
}

function createWeaponModel(weaponName: SchoolWeapon): THREE.Group {
  const weapon = new THREE.Group();
  weapon.name = `weapon-${weaponName}`;

  if (weaponName === "Lapis Junior") {
    const shaft = toonMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.65, 6), 0xd9a326);
    shaft.rotation.z = Math.PI / 2;
    weapon.add(shaft);
    const tip = toonMesh(new THREE.ConeGeometry(0.055, 0.16, 6), 0x2b2118);
    tip.position.x = 0.4;
    tip.rotation.z = -Math.PI / 2;
    weapon.add(tip);
    const eraser = toonMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), 0xc94e45);
    eraser.position.x = -0.37;
    eraser.rotation.z = Math.PI / 2;
    weapon.add(eraser);
    return weapon;
  }

  if (weaponName === "Caneta Azul") {
    const pen = toonMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.68, 12), 0x266ec9);
    pen.rotation.z = Math.PI / 2;
    weapon.add(pen);
    const cap = toonMesh(new THREE.ConeGeometry(0.055, 0.13, 12), 0xf1f1e8);
    cap.position.x = 0.4;
    cap.rotation.z = -Math.PI / 2;
    weapon.add(cap);
    return weapon;
  }

  if (weaponName === "Borracha") {
    const eraser = toonMesh(new THREE.BoxGeometry(0.58, 0.24, 0.24), 0xf3d6d8);
    weapon.add(eraser);
    const band = toonMesh(new THREE.BoxGeometry(0.22, 0.26, 0.26), 0x2b6bb8);
    weapon.add(band);
    return weapon;
  }

  if (weaponName === "Regua") {
    const ruler = toonMesh(new THREE.BoxGeometry(0.85, 0.11, 0.04), 0xe8d56a);
    weapon.add(ruler);
    for (let index = 0; index < 5; index += 1) {
      const tick = toonMesh(new THREE.BoxGeometry(0.012, 0.08, 0.045), 0x1b1510);
      tick.position.x = -0.32 + index * 0.16;
      weapon.add(tick);
    }
    return weapon;
  }

  const highlighter = toonMesh(new THREE.BoxGeometry(0.62, 0.18, 0.18), 0xe6f04f);
  weapon.add(highlighter);
  const cap = toonMesh(new THREE.BoxGeometry(0.16, 0.2, 0.2), 0xf0a2bf);
  cap.position.x = 0.38;
  weapon.add(cap);

  return weapon;
}

function toonMesh<TGeometry extends THREE.BufferGeometry>(geometry: TGeometry, color: number): THREE.Mesh<TGeometry, THREE.Material> {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));

  applyCartoonStyle(mesh, color);

  return mesh;
}

function createBillboardLabel(text: string, color: number, width: number, height: number): THREE.Sprite {
  const texture = createLabelTexture(text, color, 512, 128);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    })
  );

  sprite.scale.set(width, height, 1);
  sprite.renderOrder = 10;

  return sprite;
}

function createTextPlane(
  text: string,
  color: number,
  width: number,
  height: number,
  background: number | "transparent" = 0xf2d9a6
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const texture = createLabelTexture(text, color, 512, 256, background);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true
    })
  );

  return mesh;
}

function createLabelTexture(
  text: string,
  color: number,
  width: number,
  height: number,
  background: number | "transparent" = 0x0f1010
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  if (background !== "transparent") {
    context.fillStyle = `#${background.toString(16).padStart(6, "0")}`;
    context.fillRect(0, 0, width, height);
  }

  context.lineWidth = 10;
  context.strokeStyle = "#11100e";
  context.strokeRect(8, 8, width - 16, height - 16);
  context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  context.font = `900 ${Math.round(height * 0.42)}px Arial Black, Impact, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.strokeStyle = "#11100e";
  context.lineWidth = 5;
  context.strokeText(text, width / 2, height / 2);
  context.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}
