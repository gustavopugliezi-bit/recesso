// vertex
uniform float outlineThickness;

void main() {
  vec3 expandedPosition = position + normal * outlineThickness;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(expandedPosition, 1.0);
}

// fragment
uniform vec3 outlineColor;

void main() {
  gl_FragColor = vec4(outlineColor, 1.0);
}
