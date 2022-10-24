import * as CANNON from 'cannon-es';

export declare namespace IThreeObjectLibrary {
  export type CannonObjectType = 'box' | 'sphere';

  export interface ThreeCannonObjectParams {
    name: string;
    world: CANNON.World;
    scene: THREE.Scene | undefined;
    threeObject: () => THREE.Object3D<any>;
    cannonObject: (object: THREE.Object3D<any>) => CANNON.Body;
  }

  export interface GetObjectRequireParams {
    event: MouseEvent | null;
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    canvasElement: HTMLCanvasElement;
  }

  export interface GetObjectFromExternalParams {
    path: string;
  }

  export interface GetTextureFromExternalParams {
    path: string;
    manager?: THREE.LoadingManager;
  }








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






  

  export interface ThreeAmmoObjectManagerConstructorParams {
    world: Ammo.btDiscreteDynamicsWorld;
    scene: THREE.Scene; 
  }

  export interface ThreeAmmoObjectOptions {
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

  export interface AddThreeAmmoObjectParams {
    objectOptions: ThreeAmmoObjectOptions;
    name: string;
    isRotationSync?: boolean
    world?: Ammo.btDiscreteDynamicsWorld;
    scene?: THREE.Scene; 
    threeJsObject: (objectOptions: ThreeAmmoObjectOptions) => THREE.Object3D<THREE.Event>;
    ammoJsObject: (objectOptions: ThreeAmmoObjectOptions, threeJsObject: THREE.Object3D<THREE.Event>) => Ammo.btRigidBody;
  }

  export interface ThreeAmmoObjectItem {
    name: string;
    isRotationSync?: boolean
    world?: Ammo.btDiscreteDynamicsWorld;
    scene?: THREE.Scene; 
    threeJsObject: THREE.Object3D<THREE.Event>;
    ammoJsObject: Ammo.btRigidBody;
    getAmmoTransfrom: (deltaTime: number, item: ThreeAmmoObjectItem) => Ammo.btTransform;
    tmpTrans: Ammo.btTransform;
  }
}
