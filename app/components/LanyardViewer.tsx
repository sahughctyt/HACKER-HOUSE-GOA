'use client';

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  Suspense,
  useMemo,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import { paint, type Design } from '@/lib/render';
import { renderCardBack } from '@/lib/render/cardBack';
import type { LoadedPhoto } from '@/lib/image';

// ─── Constants ───────────────────────────────────────────────────────────
const NODE_COUNT = 10;
const SEGMENT_LEN = 0.15;
const CARD_W = 1.15;
const CARD_H = CARD_W * (1350 / 1080);

interface LanyardViewerProps {
  design: Design;
  photo: LoadedPhoto | null;
  onUploadClick?: () => void;
}


// ─── Draw Stylized Devnagari 'ग' Symbol for Lanyard Strap Pattern ───────
function drawLanyardPatternSymbol(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const drawPath = () => {
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.lineTo(-4, 3);
    ctx.arc(-7, 3, 3, 0, Math.PI * 2, true);

    ctx.moveTo(4, -10);
    ctx.lineTo(4, 10);

    ctx.moveTo(-10, -10);
    ctx.lineTo(8, -10);
  };

  ctx.strokeStyle = '#FEE101';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawPath();
  ctx.stroke();

  ctx.strokeStyle = '#FF6B00';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.restore();
}

// ─── Generate Woven Brand Symbol Ribbon Texture ──────────────────────────
function buildLanyardStrapTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Dark charcoal woven fabric base
  ctx.fillStyle = '#181818';
  ctx.fillRect(0, 0, 1024, 128);

  // Top edge: Electric Yellow
  ctx.fillStyle = '#FEE101';
  ctx.fillRect(0, 0, 1024, 12);

  // Bottom edge: Neon Orange
  ctx.fillStyle = '#FF6B00';
  ctx.fillRect(0, 116, 1024, 12);

  // Inner white hairline pinstripes
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = 0.3;
  ctx.fillRect(0, 14, 1024, 2);
  ctx.fillRect(0, 112, 1024, 2);
  ctx.globalAlpha = 1.0;

  // Woven texture lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 2;
  for (let y = 18; y < 110; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Draw repeating brand symbols & text
  const tileWidth = 256;
  for (let x = 0; x < 1024; x += tileWidth) {
    // Stylized 'ग' symbol
    drawLanyardPatternSymbol(ctx, x + 40, 64, 2.2);

    // 'HH GOA 2026' text
    ctx.font = '900 24px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('HH GOA 2026', x + 85, 72);

    // Neon star separator
    ctx.fillStyle = '#FEE101';
    ctx.font = '22px sans-serif';
    ctx.fillText('✦', x + 235, 72);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(5, 1);
  tex.needsUpdate = true;
  return tex;
}

// ─── Card Mesh Component ──────────────────────────────────────────────────
function CardMesh({
  frontTex,
  backTex,
  cardGroupRef,
}: {
  frontTex: THREE.CanvasTexture | null;
  backTex: THREE.CanvasTexture | null;
  cardGroupRef: React.RefObject<THREE.Group | null>;
}) {
  useFrame(() => {
    if (frontTex) frontTex.needsUpdate = true;
    if (backTex) backTex.needsUpdate = true;
  });

  return (
    <group ref={cardGroupRef}>
      {/* Acrylic border / bevel */}
      <mesh castShadow position={[0, -CARD_H / 2 + 0.05, 0]}>
        <boxGeometry args={[CARD_W + 0.02, CARD_H + 0.02, 0.012]} />
        <meshStandardMaterial color="#111c16" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Swivel Clasp & Ring at top slot */}
      <mesh position={[0, 0.02, 0.01]}>
        <boxGeometry args={[0.14, 0.06, 0.025]} />
        <meshStandardMaterial color="#252525" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* D-Ring loop */}
      <mesh position={[0, 0.06, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.06, 0.012, 8, 16]} />
        <meshStandardMaterial color="#FFD000" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Front face */}
      {frontTex && (
        <mesh position={[0, -CARD_H / 2 + 0.05, 0.007]}>
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshBasicMaterial map={frontTex} side={THREE.FrontSide} toneMapped={false} />
        </mesh>
      )}

      {/* Back face */}
      {backTex && (
        <mesh position={[0, -CARD_H / 2 + 0.05, -0.007]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshBasicMaterial map={backTex} side={THREE.FrontSide} toneMapped={false} />
        </mesh>
      )}

    </group>
  );
}

// ─── 3D Synchronized Physics & Rope Scene ─────────────────────────────────
function PhysicsRopeScene({
  frontTex,
  backTex,
  lanyardTex,
  pointerNDC,
  isDragging,
  flipTrigger,
  resetTrigger,
}: {
  frontTex: THREE.CanvasTexture | null;
  backTex: THREE.CanvasTexture | null;
  lanyardTex: THREE.CanvasTexture | null;
  pointerNDC: React.MutableRefObject<{ x: number; y: number }>;
  isDragging: React.MutableRefObject<boolean>;
  flipTrigger: number;
  resetTrigger: number;
}) {
  const { camera, size } = useThree();

  // MeshLine & Material refs for rope
  const ropeMeshRef = useRef<THREE.Mesh>(null);
  const geomRef = useRef<MeshLineGeometry | null>(null);
  const matRef = useRef<MeshLineMaterial | null>(null);

  // Card Group ref
  const cardGroupRef = useRef<THREE.Group | null>(null);

  // Physics Verlet Nodes setup
  const nodes = useRef<
    { pos: THREE.Vector3; oldPos: THREE.Vector3 }[]
  >([]);

  // Rotation & Flip springs
  const rot = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const rotVel = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const targetFlipY = useRef(0);

  // Initialize node positions & MeshLine material once
  useEffect(() => {
    if (nodes.current.length === 0) {
      const list = [];
      const topY = 2.4;
      for (let i = 0; i < NODE_COUNT; i++) {
        const p = new THREE.Vector3(0, topY - i * SEGMENT_LEN, 0);
        list.push({ pos: p.clone(), oldPos: p.clone() });
      }
      nodes.current = list;
    }

    if (!geomRef.current) {
      geomRef.current = new MeshLineGeometry();
    }

    if (!matRef.current) {
      matRef.current = new MeshLineMaterial({
        color: '#ffffff',
        lineWidth: 0.11,
        map: lanyardTex ?? undefined,
        useMap: lanyardTex ? 1 : 0,
        repeat: new THREE.Vector2(4, 1),
        resolution: new THREE.Vector2(size.width, size.height),
        transparent: true,
      });
    }
  }, [lanyardTex]);

  // Update MeshLine resolution & re-center physics nodes smoothly on screen resize
  useEffect(() => {
    if (matRef.current) {
      matRef.current.resolution.set(size.width, size.height);
    }
    // Re-center rope node positions when resizing viewport
    isDragging.current = false;
    const list = nodes.current;
    if (list.length > 0) {
      const topY = 2.4;
      for (let i = 0; i < NODE_COUNT; i++) {
        list[i].pos.x *= 0.5;
        list[i].pos.y = topY - i * SEGMENT_LEN;
      }
    }
  }, [size]);


  // Handle Flip button trigger
  useEffect(() => {
    if (flipTrigger > 0) {
      targetFlipY.current += Math.PI;
      rotVel.current.y += 12;
      rotVel.current.x += (Math.random() - 0.5) * 6;
    }
  }, [flipTrigger]);

  // Handle Reset button trigger
  useEffect(() => {
    if (resetTrigger > 0) {
      targetFlipY.current = 0;
      rot.current = { x: 0, y: 0, z: 0 };
      rotVel.current = { x: 0, y: 0, z: 0 };
      const topY = 2.4;
      for (let i = 0; i < NODE_COUNT; i++) {
        const p = new THREE.Vector3(0, topY - i * SEGMENT_LEN, 0);
        nodes.current[i].pos.copy(p);
        nodes.current[i].oldPos.copy(p);
      }
    }
  }, [resetTrigger]);

  // Main 60FPS Physics & Mesh Synchronized Loop
  useFrame(({ clock }, delta) => {
    const list = nodes.current;
    if (list.length === 0) return;

    // Dynamically adjust camera Z on viewport resize without page refresh
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const targetZ = aspect < 1.0 ? 3.55 + Math.max(0, (0.95 - aspect) * 2.2) : 3.55;
    if (Math.abs(cam.position.z - targetZ) > 0.005) {
      cam.position.z = THREE.MathUtils.lerp(cam.position.z, targetZ, 0.15);
      cam.updateProjectionMatrix();
    }

    const dt = Math.min(delta, 0.03);
    const t = clock.getElapsedTime();


    // 1. Verlet Integration for Rope Nodes (Fast, snappy gravity & crisp damping)
    const gravity = new THREE.Vector3(0, -24, 0);
    const damping = 0.94;

    for (let i = 1; i < NODE_COUNT; i++) {
      const node = list[i];
      const vel = node.pos.clone().sub(node.oldPos).multiplyScalar(damping);
      node.oldPos.copy(node.pos);

      // Add gravity & velocity
      node.pos.add(vel).addScaledVector(gravity, dt * dt);
    }

    // Top Anchor (Node 0) moves with gentle idle sway
    const topY = 2.4;
    list[0].pos.set(
      Math.sin(t * 0.9) * 0.12 + Math.cos(t * 1.4) * 0.05,
      topY + Math.sin(t * 1.5) * 0.03,
      0
    );

    // 2. Interactive Pointer Dragging on Bottom Node (Fast, instant follow)
    if (isDragging.current) {
      const cam = camera as THREE.PerspectiveCamera;
      const vFov = cam.fov * (Math.PI / 180);
      const dist = Math.abs(cam.position.z);
      const worldH = 2 * Math.tan(vFov / 2) * dist;
      const worldW = worldH * cam.aspect;

      const targetX = pointerNDC.current.x * worldW * 0.85;
      const targetY = -pointerNDC.current.y * worldH * 0.85;

      const lastNode = list[NODE_COUNT - 1];
      lastNode.pos.x += (targetX - lastNode.pos.x) * 0.82;
      lastNode.pos.y += (targetY - lastNode.pos.y) * 0.82;
      lastNode.pos.z = 0.15;
    }

    // 3. Enforce Distance Constraints (8 Relaxation Passes)
    for (let pass = 0; pass < 8; pass++) {
      list[0].pos.set(
        Math.sin(t * 0.9) * 0.12 + Math.cos(t * 1.4) * 0.05,
        topY + Math.sin(t * 1.5) * 0.03,
        0
      );

      for (let i = 0; i < NODE_COUNT - 1; i++) {
        const nA = list[i];
        const nB = list[i + 1];
        const deltaVec = nB.pos.clone().sub(nA.pos);
        const currentDist = deltaVec.length();

        if (currentDist > 0.0001) {
          const diff = (currentDist - SEGMENT_LEN) / currentDist;
          const correction = deltaVec.multiplyScalar(diff * 0.5);

          if (i !== 0) nA.pos.add(correction);
          nB.pos.sub(correction);
        }
      }
    }

    // 4. Card Transform & Fast Snappy Spring Physics
    const cardGroup = cardGroupRef.current;
    if (cardGroup) {
      const cardNode = list[NODE_COUNT - 1];
      const prevNode = list[NODE_COUNT - 2];

      cardGroup.position.copy(cardNode.pos);

      // Swing direction vectors
      const dx = cardNode.pos.x - prevNode.pos.x;
      const dz = cardNode.pos.z - prevNode.pos.z;

      const targetZ = -Math.max(-1.4, Math.min(1.4, dx * 2.5));
      const targetX = Math.max(-1.2, Math.min(1.2, dz * 2.5));

      // Fast, high-speed spring physics for snappy card tilt
      const springStiffness = 165;
      const springDamping = 16;

      const forceZ = -springStiffness * (rot.current.z - targetZ) - springDamping * rotVel.current.z;
      rotVel.current.z += forceZ * dt;
      rot.current.z += rotVel.current.z * dt;

      const forceX = -springStiffness * (rot.current.x - targetX) - springDamping * rotVel.current.x;
      rotVel.current.x += forceX * dt;
      rot.current.x += rotVel.current.x * dt;

      const forceY = -springStiffness * (rot.current.y - targetFlipY.current) - springDamping * rotVel.current.y;
      rotVel.current.y += forceY * dt;
      rot.current.y += rotVel.current.y * dt;

      cardGroup.rotation.set(rot.current.x, rot.current.y, rot.current.z);
    }



    // 5. SYNCHRONIZED ROPE MESHLINE UPDATE (Locks bottom rope point to exact D-Ring world position)
    if (geomRef.current && matRef.current && ropeMeshRef.current) {
      const pts = list.map((n) => n.pos.clone());

      // Lock bottom rope point to D-Ring world position on card group
      if (cardGroup) {
        const ringWorldPos = new THREE.Vector3(0, 0.06, 0.01);
        cardGroup.localToWorld(ringWorldPos);
        pts[pts.length - 1].copy(ringWorldPos);
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      const cp = curve.getPoints(pts.length * 6);
      geomRef.current.setPoints(cp.flatMap((p) => [p.x, p.y, p.z]));

      if (ropeMeshRef.current.geometry !== geomRef.current)
        ropeMeshRef.current.geometry = geomRef.current;
      if (ropeMeshRef.current.material !== matRef.current)
        ropeMeshRef.current.material = matRef.current;
    }
  });

  return (
    <>
      {/* Top Anchor Ring */}
      <mesh position={[0, 2.4, 0]}>
        <torusGeometry args={[0.045, 0.016, 8, 16]} />
        <meshStandardMaterial color="#FFD000" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Woven Brand Pattern Ribbon Rope */}
      <mesh ref={ropeMeshRef} />

      {/* Card Mesh Group */}
      <CardMesh
        frontTex={frontTex}
        backTex={backTex}
        cardGroupRef={cardGroupRef}
      />
    </>
  );
}

// ─── Vibrant Neon Glow Stage Lighting ─────────────────────────────────────
function NeonLights() {
  const yellowLightRef = useRef<THREE.PointLight>(null);
  const pinkLightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (yellowLightRef.current) {
      yellowLightRef.current.intensity = 1.2 + Math.sin(t * 1.5) * 0.3;
    }
    if (pinkLightRef.current) {
      pinkLightRef.current.intensity = 1.4 + Math.cos(t * 1.8) * 0.3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.65} />

      <directionalLight
        position={[3, 8, 5]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <pointLight
        ref={yellowLightRef}
        position={[-2.8, 1.2, -1.2]}
        intensity={1.4}
        color="#FEE101"
        distance={8}
      />

      <pointLight
        ref={pinkLightRef}
        position={[2.8, -0.8, -1.2]}
        intensity={1.6}
        color="#FF007A"
        distance={8}
      />

      <pointLight
        position={[0, -2.0, -1.5]}
        intensity={0.8}
        color="#FF6B00"
        distance={6}
      />
    </>
  );
}

// ─── Adaptive Camera for Responsive Stage ─────────────────────────────────
function AdaptiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const cam = camera as THREE.PerspectiveCamera;
    if (aspect < 1.0) {
      cam.position.z = 3.55 + (1.0 - aspect) * 1.5;
    } else {
      cam.position.z = 3.55;
    }
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

// ─── Main Public Component ────────────────────────────────────────────────
export function LanyardViewer({ design, photo, onUploadClick }: LanyardViewerProps) {

  const [frontTex, setFrontTex] = useState<THREE.CanvasTexture | null>(null);
  const [backTex, setBackTex] = useState<THREE.CanvasTexture | null>(null);
  const [lanyardTex, setLanyardTex] = useState<THREE.CanvasTexture | null>(null);

  const [flipTrigger, setFlipTrigger] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);

  const isDragging = useRef(false);
  const pointerNDC = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Build lanyard texture once on mount
  useEffect(() => {
    const tex = buildLanyardStrapTexture();
    if (tex) setLanyardTex(tex);
  }, []);

  // Paint front canvas when design or photo changes
  useEffect(() => {
    const fc = document.createElement('canvas');
    fc.width = 1080;
    fc.height = 1350;
    const ctx = fc.getContext('2d');
    if (ctx) {
      paint(ctx, design, photo?.bitmap ?? null, 1080);
      const tex = new THREE.CanvasTexture(fc);
      tex.colorSpace = THREE.SRGBColorSpace;
      setFrontTex(tex);
    }
  }, [design, photo]);

  // Render back canvas
  useEffect(() => {
    const bc = renderCardBack(design.seed, design.name, design.role);
    const tex = new THREE.CanvasTexture(bc);
    tex.colorSpace = THREE.SRGBColorSpace;
    setBackTex(tex);
  }, [design.seed, design.name, design.role]);

  const toggleFlip = useCallback(() => {
    setFlipTrigger((c) => c + 1);
  }, []);

  const resetView = useCallback(() => {
    setResetTrigger((c) => c + 1);
  }, []);

  // Window pointer & touch listeners for smooth continuous mobile drag
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging.current) {
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        if (touch) {
          const container = document.querySelector('.threed-stage-wrap');
          if (container) {
            const rect = container.getBoundingClientRect();
            pointerNDC.current = {
              x: ((touch.clientX - rect.left) / rect.width) * 2 - 1,
              y: ((touch.clientY - rect.top) / rect.height) * 2 - 1,
            };
          }
        }
      }
    };

    const handleUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div
      className="threed-stage-wrap"
      onPointerDown={(e) => {
        isDragging.current = true;
        const rect = e.currentTarget.getBoundingClientRect();
        pointerNDC.current = {
          x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
          y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
        };
      }}
      onPointerMove={(e) => {
        if (isDragging.current) {
          const rect = e.currentTarget.getBoundingClientRect();
          pointerNDC.current = {
            x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
            y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
          };
        }
      }}
      onDoubleClick={toggleFlip}
      style={{ touchAction: 'none', cursor: isDragging.current ? 'grabbing' : 'grab' }}
    >
      {/* Three.js R3F Canvas with Vibrant Neon Stage Background */}
      <Canvas
        camera={{ position: [0, 0, 3.55], fov: 40 }}
        style={{ background: 'transparent' }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <AdaptiveCamera />
        <NeonLights />
        <Suspense fallback={null}>
          <PhysicsRopeScene
            frontTex={frontTex}
            backTex={backTex}
            lanyardTex={lanyardTex}
            pointerNDC={pointerNDC}
            isDragging={isDragging}
            flipTrigger={flipTrigger}
            resetTrigger={resetTrigger}
          />
        </Suspense>
      </Canvas>


      {/* 3D Interactive Control Buttons */}
      <div className="threed-controls-bar">
        {onUploadClick && (
          <button
            type="button"
            onClick={onUploadClick}
            className="threed-ctrl-btn threed-ctrl-btn-yellow"
            title={photo ? 'Change photo' : 'Upload photo'}
          >
            📷 {photo ? 'CHANGE' : 'UPLOAD'}
          </button>
        )}
        <button
          type="button"
          onClick={toggleFlip}
          className="threed-ctrl-btn threed-ctrl-btn-pink"
          title="Flip card"
        >
          🔄 FLIP
        </button>
        <button
          type="button"
          onClick={resetView}
          className="threed-ctrl-btn threed-ctrl-btn-ghost"
          title="Reset view"
        >
          🎯 RESET
        </button>
      </div>

    </div>
  );
}
