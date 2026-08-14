declare module 'meshline' {
  import * as THREE from 'three';
  export class MeshLineGeometry extends THREE.BufferGeometry {
    setPoints(points: number[] | Float32Array | THREE.Vector3[]): void;
  }
  export class MeshLineMaterial extends THREE.ShaderMaterial {
    resolution: THREE.Vector2;
    lineWidth: number;
    color: THREE.Color;
    map?: THREE.Texture;
    useMap?: number;
    repeat?: THREE.Vector2;
    constructor(params?: {
      color?: string | number | THREE.Color;
      lineWidth?: number;
      resolution?: THREE.Vector2;
      map?: THREE.Texture;
      useMap?: number;
      repeat?: THREE.Vector2;
      transparent?: boolean;
      [k: string]: unknown;
    });
  }
}

