import * as THREE from "three";
import celShadingSource from "./celShading.glsl?raw";
import cartoonOutlineSource from "./cartoonOutline.glsl?raw";

interface ShaderSections {
  vertexShader: string;
  fragmentShader: string;
}

const OUTLINE_CHILD_NAME = "cartoon-outline";
const lightDirection = new THREE.Vector3(0.35, 0.9, 0.45).normalize();

export function applyCartoonStyle(mesh: THREE.Mesh, color = getMeshColor(mesh)): void {
  const celShader = getShaderSections(celShadingSource);
  const outlineShader = getShaderSections(cartoonOutlineSource);

  disposeMaterial(mesh.material);

  mesh.material = new THREE.ShaderMaterial({
    vertexShader: celShader.vertexShader,
    fragmentShader: celShader.fragmentShader,
    uniforms: {
      baseColor: { value: new THREE.Color(color) },
      lightDirection: { value: lightDirection }
    }
  });

  if (mesh.getObjectByName(OUTLINE_CHILD_NAME)) {
    return;
  }

  const outlineMesh = new THREE.Mesh(
    mesh.geometry,
    new THREE.ShaderMaterial({
      vertexShader: outlineShader.vertexShader,
      fragmentShader: outlineShader.fragmentShader,
      uniforms: {
        outlineThickness: { value: 0.055 },
        outlineColor: { value: new THREE.Color(0x000000) }
      },
      side: THREE.BackSide
    })
  );

  outlineMesh.name = OUTLINE_CHILD_NAME;
  outlineMesh.renderOrder = -1;
  mesh.add(outlineMesh);
}

function getShaderSections(source: string): ShaderSections {
  const vertexMarker = "// vertex";
  const fragmentMarker = "// fragment";
  const vertexStart = source.indexOf(vertexMarker);
  const fragmentStart = source.indexOf(fragmentMarker);

  if (vertexStart === -1 || fragmentStart === -1 || fragmentStart <= vertexStart) {
    throw new Error("Shader source must include // vertex and // fragment sections.");
  }

  return {
    vertexShader: source.slice(vertexStart + vertexMarker.length, fragmentStart).trim(),
    fragmentShader: source.slice(fragmentStart + fragmentMarker.length).trim()
  };
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    for (const item of material) {
      item.dispose();
    }

    return;
  }

  material.dispose();
}

function getMeshColor(mesh: THREE.Mesh): number {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;

  if (material && "color" in material && material.color instanceof THREE.Color) {
    return material.color.getHex();
  }

  return 0xd9c7a3;
}
