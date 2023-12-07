export declare namespace IThreeAmmoObjectUtil {
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
    threeJsObject: (objectOptions: ThreeAmmoObjectOptions) => THREE.Object3D<THREE.Object3DEventMap>;
    ammoJsObject: (objectOptions: ThreeAmmoObjectOptions, threeJsObject: THREE.Object3D<THREE.Object3DEventMap>) => Ammo.btRigidBody;
  }

  export interface ThreeAmmoObjectItem {
    name: string;
    isRotationSync?: boolean
    world?: Ammo.btDiscreteDynamicsWorld;
    scene?: THREE.Scene; 
    threeJsObject: THREE.Object3D<THREE.Object3DEventMap>;
    ammoJsObject: Ammo.btRigidBody;
    getAmmoTransfrom: (deltaTime: number, item: ThreeAmmoObjectItem) => Ammo.btTransform;
    tmpTrans: Ammo.btTransform;
  }
}