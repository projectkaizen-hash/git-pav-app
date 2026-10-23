import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function EnamelKnot() {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const g = group.current;
    const m = mesh.current;
    if (g) {
      g.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.12;
      g.rotation.y += delta * 0.35;
    }
    if (m) m.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.18;
  });

  return (
    <group ref={group}>
      <mesh ref={mesh}>
        <torusKnotGeometry args={[1.05, 0.34, 160, 32]} />
        <meshPhysicalMaterial
          color="#e7f4f8"
          metalness={0.28}
          roughness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.06}
          iridescence={0.75}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[120, 380]}
        />
      </mesh>
    </group>
  );
}

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const n = 120;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.04;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#7eb8c9" transparent opacity={0.55} />
    </points>
  );
}

export function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 4.4], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      className="h-full w-full"
    >
      <ambientLight intensity={0.5} />
      <spotLight position={[4, 6, 4]} intensity={60} angle={0.42} penumbra={0.85} color="#e8f4f8" />
      <pointLight position={[-3, -1.5, 2.5]} intensity={20} color="#7eb8c9" />
      <directionalLight position={[2, 3, 4]} intensity={1.6} color="#ffffff" />
      <EnamelKnot />
      <Dust />
    </Canvas>
  );
}
