// vertex
varying vec3 vWorldNormal;

void main() {
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// fragment
uniform vec3 baseColor;
uniform vec3 lightDirection;

varying vec3 vWorldNormal;

void main() {
  float lightAmount = dot(normalize(vWorldNormal), normalize(lightDirection));
  float lightBand = step(0.55, lightAmount);
  float midBand = step(0.1, lightAmount);
  float shade = 0.45 + (midBand * 0.25) + (lightBand * 0.3);
  vec3 color = baseColor * shade;

  gl_FragColor = vec4(color, 1.0);
}
