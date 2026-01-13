import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
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
  const cameraTarget = useRef(new THREE.Vector3(0, 0, 5.5));
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // マウスに基づく視差効果（より滑らか）
    const targetX = pointer.current.x * 0.5;
    const targetY = pointer.current.y * 0.3;

    // 微妙な呼吸のような動き
    const breathe = Math.sin(t * 0.8) * 0.1;

    cameraTarget.current.set(targetX, targetY, 5.5 + breathe);
    camera.position.lerp(cameraTarget.current, 0.03);

    // 視点もわずかにずらす
    lookAtTarget.current.set(
      targetX * 0.1,
      targetY * 0.1,
      0
    );
    camera.lookAt(lookAtTarget.current);
  });

  return null;
}

function OrbitRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const outerPivotRef = useRef<THREE.Group>(null);
  const innerPivotRef = useRef<THREE.Group>(null);
  const spin = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // 複雑な速度変化（イージング）
    const speedBase = 0.6;
    const speedVariation1 = 0.15 * Math.sin(t * 0.4);
    const speedVariation2 = 0.08 * Math.sin(t * 1.2);
    const speedVariation3 = 0.05 * Math.sin(t * 0.15);
    const speed = speedBase + speedVariation1 + speedVariation2 + speedVariation3;

    spin.current += delta * speed;

    // 歳差運動（複数の周期を重ねる）
    if (outerPivotRef.current) {
      // 長周期のゆらぎ
      const tiltX = 0.7 + 0.25 * Math.sin(t * 0.25);
      const tiltZ = 0.2 * Math.sin(t * 0.18);
      outerPivotRef.current.rotation.x = tiltX;
      outerPivotRef.current.rotation.z = tiltZ;
    }

    if (innerPivotRef.current) {
      // 短周期の揺らぎ
      const wobbleX = 0.12 * Math.sin(t * 0.9);
      const wobbleZ = 0.15 * Math.sin(t * 0.7 + Math.PI / 4);
      innerPivotRef.current.rotation.x = wobbleX;
      innerPivotRef.current.rotation.z = wobbleZ;
    }

    if (ringRef.current) {
      ringRef.current.rotation.y = spin.current;
      // リング自体も微妙に傾く
      ringRef.current.rotation.x = 0.08 * Math.sin(t * 0.6);

      // 透明度の変化（濃くなったり薄くなったり）
      const material = ringRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = 0.7 + 0.2 * Math.sin(t * 0.8);
    }

    if (innerRingRef.current) {
      // インナーリングの透明度変化（メインと逆位相）
      const material = innerRingRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = 0.4 + 0.25 * Math.sin(t * 0.8 + Math.PI);
    }
  });

  return (
    <group ref={outerPivotRef}>
      <group ref={innerPivotRef}>
        {/* メインリング - 透明感のある黒 */}
        <mesh ref={ringRef} scale={[1.7, 0.75, 1.15]}>
          <torusGeometry args={[1.05, 0.085, 32, 128]} />
          <meshStandardMaterial
            color="#1a1a1a"
            metalness={0.9}
            roughness={0.3}
            envMapIntensity={0.8}
            transparent
            opacity={0.7}
          />
        </mesh>
        {/* インナーリング - さらに透明 */}
        <mesh ref={innerRingRef} scale={[1.52, 0.67, 1.03]} rotation={[0, 0, 0]}>
          <torusGeometry args={[1.05, 0.04, 24, 128]} />
          <meshStandardMaterial
            color="#2a2a2a"
            metalness={0.7}
            roughness={0.4}
            transparent
            opacity={0.4}
          />
        </mesh>
      </group>
    </group>
  );
}

function CoreSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowColor = useMemo(() => new THREE.Color("#ff2b2b"), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      // 微妙な脈動
      const pulse = 1 + 0.04 * Math.sin(t * 2);
      meshRef.current.scale.setScalar(pulse);

      const material = meshRef.current.material as THREE.MeshStandardMaterial;

      // 発光の強度を変化
      material.emissiveIntensity = 0.5 + 0.2 * Math.sin(t * 1.5);

      // 色の濃淡変化（赤の明度を変化させる）
      const colorIntensity = 0.85 + 0.15 * Math.sin(t * 0.9);
      material.color.setRGB(
        0.9 * colorIntensity,
        0.09 * colorIntensity,
        0.09 * colorIntensity
      );

      // 透明度も微妙に変化
      material.opacity = 0.95 + 0.05 * Math.sin(t * 1.2);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.48, 64, 64]} />
      <meshStandardMaterial
        color="#e61818"
        metalness={0.5}
        roughness={0.1}
        emissive={glowColor}
        emissiveIntensity={0.5}
        transparent
        opacity={0.95}
      />
    </mesh>
  );
}

function Particles() {
  const particlesRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const count = 60;

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 1.5;

      positions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
      positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      positions[i * 3 + 2] = radius * Math.cos(theta);

      scales[i] = Math.random() * 0.5 + 0.5;
    }

    return { positions, scales };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.05;
      particlesRef.current.rotation.x = Math.sin(t * 0.2) * 0.1;
    }

    // パーティクルの透明度を波のように変化させる
    if (materialRef.current) {
      materialRef.current.opacity = 0.25 + 0.2 * Math.sin(t * 1.3);
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.025}
        color="#ff6666"
        transparent
        opacity={0.25}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function LogoScene({ pointer }: { pointer: MutableRefObject<PointerState> }) {
  return (
    <>
      {/* 環境光 - 少し明るめで透明感を出す */}
      <ambientLight intensity={0.4} />

      {/* メインライト - 柔らかい光 */}
      <directionalLight position={[5, 5, 5]} intensity={1.0} color="#ffffff" />

      {/* アクセントライト - 透明感を強調 */}
      <pointLight position={[-3, 2, 4]} intensity={0.6} color="#ff8888" />
      <pointLight position={[3, -2, 3]} intensity={0.5} color="#6b6bff" />
      <pointLight position={[0, -3, 2]} intensity={0.4} color="#ff6b9d" />

      {/* リムライト - 輪郭を柔らかく */}
      <spotLight
        position={[0, 5, -5]}
        angle={0.6}
        penumbra={1}
        intensity={0.4}
        color="#ffffff"
      />

      <CoreSphere />
      <OrbitRing />
      <Particles />
      <ParallaxCamera pointer={pointer} />

      {/* ポストプロセッシング効果 - ブルームを強化 */}
      <EffectComposer>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.95}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export function OrbitLogo({ size = 160, showText = true, className }: OrbitLogoProps) {
  const pointer = useParallaxPointer();

  return (
    <div className={className} style={{ width: size, height: size + (showText ? 28 : 0) }}>
      <div style={{ width: size, height: size, background: 'transparent' }}>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 4], fov: 40 }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent' }}
        >
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
