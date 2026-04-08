import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const HologramShaderMaterial = {
  uniforms: {
    time: { value: 0 },
    scanColor: { value: new THREE.Color('#00F2FF') },
    baseColor: { value: new THREE.Color('#0b0e11') }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 scanColor;
    uniform vec3 baseColor;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      // Basic rim lighting
      float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
      rim = smoothstep(0.6, 1.0, rim);

      // Scanning line effect
      float scanLine = sin(vPosition.y * 50.0 - time * 5.0) * 0.5 + 0.5;
      float scanBar = step(0.95, sin(vPosition.y * 5.0 - time * 2.0));

      // Grid effect
      float gridX = step(0.95, sin(vUv.x * 100.0));
      float gridY = step(0.95, sin(vUv.y * 100.0));
      float grid = max(gridX, gridY) * 0.2;

      // Combine effects
      vec3 finalColor = mix(baseColor, scanColor, rim * 0.5 + scanLine * 0.2 + scanBar * 0.8 + grid);

      // Transparency
      float alpha = max(rim, max(scanBar, grid)) * 0.8 + 0.1;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false
};

export const HologramMaterial = () => {
  const materialRef = useRef();

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <shaderMaterial
      ref={materialRef}
      attach="material"
      args={[HologramShaderMaterial]}
    />
  );
};
