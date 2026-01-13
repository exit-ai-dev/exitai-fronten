import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MutableRefObject } from "react";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type OrbitLogoProps = {
  size?: number;
  showText?: boolean;
  className?: string;
};

type PointerState = {
  x: number;
  y: number;
};

function useParallaxPointer(): MutableRefObject<PointerState> {
  const pointer = useRef<PointerState>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      pointer.current = { x, y };
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return pointer;
}

function ParallaxCamera({ pointer }: { pointer: MutableRefObject<PointerState> }) {
  const { camera } = useThree();
  const cameraTarget = useRef(new THREE.Vector3(0, 0, 4.6));
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const targetX = pointer.current.x * 0.4;
    const targetY = pointer.current.y * 0.25;
    const breathe = Math.sin(t * 0.6) * 0.08;

    cameraTarget.current.set(targetX, targetY, 4.6 + breathe);
    camera.position.lerp(cameraTarget.current, 0.05);

    lookAtTarget.current.set(targetX * 0.08, targetY * 0.08, 0);
    camera.lookAt(lookAtTarget.current);
  });

  return null;
}

function OrbitRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  const pivotRef = useRef<THREE.Group>(null);
  const spin = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    const speed = 0.5 + 0.12 * Math.sin(t * 0.5) + 0.08 * Math.sin(t * 0.18 + 0.6);
    spin.current += delta * speed;

    if (pivotRef.current) {
      pivotRef.current.rotation.x = 0.7 + 0.2 * Math.sin(t * 0.28);
      pivotRef.current.rotation.z = 0.3 * Math.sin(t * 0.22);
    }

    if (ringRef.current) {
      ringRef.current.rotation.y = spin.current;
      ringRef.current.rotation.x = 0.08 * Math.sin(t * 0.6);
    }
  });

  return (
    <group ref={pivotRef}>
      <mesh ref={ringRef} scale={[1.65, 0.72, 1.1]}>
        <torusGeometry args={[1.05, 0.085, 32, 128]} />
        <meshStandardMaterial color="#141414" metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
}

function CoreSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowColor = useMemo(() => new THREE.Color("#ff2b2b"), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!meshRef.current) return;

    const pulse = 1 + 0.03 * Math.sin(t * 2.1);
    meshRef.current.scale.setScalar(pulse);

    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 0.45 + 0.18 * Math.sin(t * 1.4);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.46, 64, 64]} />
      <meshStandardMaterial
        color="#e01818"
        metalness={0.5}
        roughness={0.1}
        emissive={glowColor}
        emissiveIntensity={0.45}
      />
    </mesh>
  );
}

function LogoScene({ pointer }: { pointer: MutableRefObject<PointerState> }) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 5, 6]} intensity={0.9} color="#ffffff" />
      <pointLight position={[-2.5, 1.5, 4]} intensity={0.55} color="#ff7a7a" />
      <pointLight position={[2.5, -2, 3]} intensity={0.4} color="#6b6bff" />

      <CoreSphere />
      <OrbitRing />
      <ParallaxCamera pointer={pointer} />
    </>
  );
}

export function OrbitLogo({ size = 160, showText = true, className }: OrbitLogoProps) {
  const pointer = useParallaxPointer();

  return (
    <div className={className} style={{ width: size, height: size + (showText ? 28 : 0) }}>
      <div style={{ width: size, height: size }}>
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.6], fov: 40 }} gl={{ alpha: true, antialias: true }}>
          <LogoScene pointer={pointer} />
        </Canvas>
      </div>
      {showText && (
        <div className="mt-2 text-center font-serif text-sm text-slate-800 tracking-wide">
          éxitotrinity
        </div>
      )}
    </div>
  );
}
