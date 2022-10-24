import * as CANNON from 'cannon-es';

export declare namespace IThreeCannonObjectUtil {
  export interface ThreeCannonObjectManagerConstructorParams {
    world: CANNON.World;
    scene: THREE.Scene; 
  }

  export interface ThreeCannonObjectOptions {
    pos: {
      x: number;
      y: number;
      z: number;
    };
    size?: {
      x: number;
      y: number;
      z: number;
    };
    radius?: number;
    quat: {
      x: number;
      y: number;
      z: number;
      w: number;
    };
    mass: number;
  }

  export interface AddThreeCannonObjectParams {
    objectOptions: ThreeCannonObjectOptions;
    name: string;
    isRotationSync?: boolean
    world?: CANNON.World;
    scene?: THREE.Scene; 
    threeJsObject: (objectOptions: ThreeCannonObjectOptions) => THREE.Object3D<THREE.Event>;
    cannonJsObject: (objectOptions: ThreeCannonObjectOptions, threeJsObject: THREE.Object3D<THREE.Event>) => CANNON.Body;
  }

  export interface ThreeCannonObjectItem {
    name: string;
    world?: CANNON.World;
    scene?: THREE.Scene; 
    threeJsObject: THREE.Object3D<THREE.Event>;
    cannonJsObject: CANNON.Body;
  }
}