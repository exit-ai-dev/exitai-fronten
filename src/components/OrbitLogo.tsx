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

    // 繝槭え繧ｹ縺ｫ蝓ｺ縺･縺剰ｦ門ｷｮ蜉ｹ譫懶ｼ医ｈ繧頑ｻ代ｉ縺具ｼ・    const targetX = pointer.current.x * 0.5;
    const targetY = pointer.current.y * 0.3;

    // 蠕ｮ螯吶↑蜻ｼ蜷ｸ縺ｮ繧医≧縺ｪ蜍輔″
    const breathe = Math.sin(t * 0.8) * 0.1;

    cameraTarget.current.set(targetX, targetY, 5.5 + breathe);
    camera.position.lerp(cameraTarget.current, 0.03);

    // 隕也せ繧ゅｏ縺壹°縺ｫ縺壹ｉ縺・    lookAtTarget.current.set(
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

    // 隍・尅縺ｪ騾溷ｺｦ螟牙喧・医う繝ｼ繧ｸ繝ｳ繧ｰ・・    const speedBase = 0.6;
    const speedVariation1 = 0.15 * Math.sin(t * 0.4);
    const speedVariation2 = 0.08 * Math.sin(t * 1.2);
    const speedVariation3 = 0.05 * Math.sin(t * 0.15);
    const speed = speedBase + speedVariation1 + speedVariation2 + speedVariation3;

    spin.current += delta * speed;

    // 豁ｳ蟾ｮ驕句虚・郁､・焚縺ｮ蜻ｨ譛溘ｒ驥阪・繧具ｼ・    if (outerPivotRef.current) {
      // 髟ｷ蜻ｨ譛溘・繧・ｉ縺・      const tiltX = 0.7 + 0.25 * Math.sin(t * 0.25);
      const tiltZ = 0.2 * Math.sin(t * 0.18);
      outerPivotRef.current.rotation.x = tiltX;
      outerPivotRef.current.rotation.z = tiltZ;
    }

    if (innerPivotRef.current) {
      // 遏ｭ蜻ｨ譛溘・謠ｺ繧峨℃
      const wobbleX = 0.12 * Math.sin(t * 0.9);
      const wobbleZ = 0.15 * Math.sin(t * 0.7 + Math.PI / 4);
      innerPivotRef.current.rotation.x = wobbleX;
      innerPivotRef.current.rotation.z = wobbleZ;
    }

    if (ringRef.current) {
      ringRef.current.rotation.y = spin.current;
      // 繝ｪ繝ｳ繧ｰ閾ｪ菴薙ｂ蠕ｮ螯吶↓蛯ｾ縺・      ringRef.current.rotation.x = 0.08 * Math.sin(t * 0.6);

      // 騾乗・蠎ｦ縺ｮ螟牙喧・域ｿ・￥縺ｪ縺｣縺溘ｊ阮・￥縺ｪ縺｣縺溘ｊ・・      const material = ringRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = 0.7 + 0.2 * Math.sin(t * 0.8);
    }

    if (innerRingRef.current) {
      // 繧､繝ｳ繝翫・繝ｪ繝ｳ繧ｰ縺ｮ騾乗・蠎ｦ螟牙喧・医Γ繧､繝ｳ縺ｨ騾・ｽ咲嶌・・      const material = innerRingRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = 0.4 + 0.25 * Math.sin(t * 0.8 + Math.PI);
    }
  });

  return (
    <group ref={outerPivotRef}>
      <group ref={innerPivotRef}>
        {/* 繝｡繧､繝ｳ繝ｪ繝ｳ繧ｰ - 騾乗・諢溘・縺ゅｋ鮟・*/}
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
        {/* 繧､繝ｳ繝翫・繝ｪ繝ｳ繧ｰ - 縺輔ｉ縺ｫ騾乗・ */}
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
      // 蠕ｮ螯吶↑閼亥虚
      const pulse = 1 + 0.04 * Math.sin(t * 2);
      meshRef.current.scale.setScalar(pulse);

      const material = meshRef.current.material as THREE.MeshStandardMaterial;

      // 逋ｺ蜈峨・蠑ｷ蠎ｦ繧貞､牙喧
      material.emissiveIntensity = 0.5 + 0.2 * Math.sin(t * 1.5);

      // 濶ｲ縺ｮ豼・ｷ｡螟牙喧・郁ｵ､縺ｮ譏主ｺｦ繧貞､牙喧縺輔○繧具ｼ・      const colorIntensity = 0.85 + 0.15 * Math.sin(t * 0.9);
      material.color.setRGB(
        0.9 * colorIntensity,
        0.09 * colorIntensity,
        0.09 * colorIntensity
      );

      // 騾乗・蠎ｦ繧ょｾｮ螯吶↓螟牙喧
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

    // 繝代・繝・ぅ繧ｯ繝ｫ縺ｮ騾乗・蠎ｦ繧呈ｳ｢縺ｮ繧医≧縺ｫ螟牙喧縺輔○繧・    if (materialRef.current) {
      materialRef.current.opacity = 0.25 + 0.2 * Math.sin(t * 1.3);
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles.positions, 3]}
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
      {/* 迺ｰ蠅・・ - 蟆代＠譏弱ｋ繧√〒騾乗・諢溘ｒ蜃ｺ縺・*/}
      <ambientLight intensity={0.4} />

      {/* 繝｡繧､繝ｳ繝ｩ繧､繝・- 譟斐ｉ縺九＞蜈・*/}
      <directionalLight position={[5, 5, 5]} intensity={1.0} color="#ffffff" />

      {/* 繧｢繧ｯ繧ｻ繝ｳ繝医Λ繧､繝・- 騾乗・諢溘ｒ蠑ｷ隱ｿ */}
      <pointLight position={[-3, 2, 4]} intensity={0.6} color="#ff8888" />
      <pointLight position={[3, -2, 3]} intensity={0.5} color="#6b6bff" />
      <pointLight position={[0, -3, 2]} intensity={0.4} color="#ff6b9d" />

      {/* 繝ｪ繝繝ｩ繧､繝・- 霈ｪ驛ｭ繧呈沐繧峨°縺・*/}
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

      {/* 繝昴せ繝医・繝ｭ繧ｻ繝・す繝ｳ繧ｰ蜉ｹ譫・- 繝悶Ν繝ｼ繝繧貞ｼｷ蛹・*/}
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
          ﾃｩxitotrinity
        </div>
      )}
    </div>
  );
}

