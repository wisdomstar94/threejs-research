import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { IThreeObjectLibrary } from './three-object-util.interface';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class ThreeCannonObject {
  name: string;
  world: CANNON.World;
  scene?: THREE.Scene;
  threeObject: THREE.Object3D<any>;
  cannonObject: CANNON.Body;

  constructor(params: IThreeObjectLibrary.ThreeCannonObjectParams) {
    this.name = params.name;
    this.world = params.world;
    this.scene = params.scene;

    this.threeObject = params.threeObject();
    this.cannonObject = params.cannonObject(this.threeObject);

    // this.cannonObject.position.copy(new CANNON.Vec3(
    //   this.threeObject.position.x,
    //   this.threeObject.position.y,
    //   this.threeObject.position.z,
    // ));

    this.world.addBody(this.cannonObject);
    this.scene?.add(this.threeObject);
  }

  update(): void {
    this.threeObject.position.x = this.cannonObject.position.x;
    this.threeObject.position.y = this.cannonObject.position.y;
    this.threeObject.position.z = this.cannonObject.position.z;
  }
}

export class ThreeAmmoObjectManager {
  world: Ammo.btDiscreteDynamicsWorld;
  scene: THREE.Scene;
  objectItems: IThreeObjectLibrary.ThreeAmmoObjectItem[];

  constructor(params: IThreeObjectLibrary.ThreeAmmoObjectManagerConstructorParams) {
    const {
      world,
      scene,
    } = params;
    this.world = world;
    this.scene = scene;
    this.objectItems = [];
  }

  add(params: IThreeObjectLibrary.AddThreeAmmoObjectParams) {
    if (this.objectItems.filter(x => x.name === params.name).length > 0) {
      throw new Error(`ThreeAmmoObject의 name은 고유해야 합니다. "${params.name}" 이라는 name은 중복되었습니다.`);
    }

    const world = params.world ?? this.world;
    const scene = params.scene ?? this.scene;

    const threeJsObject = params.threeJsObject(params.objectOptions);
    scene.add(threeJsObject);

    const ammoJsObject = params.ammoJsObject(params.objectOptions, threeJsObject);
    world.addRigidBody(ammoJsObject);

    const tmpTrans = new Ammo.btTransform();

    const _ThreeAmmoObject: IThreeObjectLibrary.ThreeAmmoObjectItem = {
      name: params.name,
      isRotationSync: params.isRotationSync,
      world: world,
      scene: scene,
      threeJsObject: threeJsObject,
      ammoJsObject: ammoJsObject,
      getAmmoTransfrom: (deltaTime: number, item: IThreeObjectLibrary.ThreeAmmoObjectItem) => {
        this.world.stepSimulation(deltaTime, 10);
        const ms = item.ammoJsObject.getMotionState();
        if (ms) {
          ms.getWorldTransform(tmpTrans);
        }
        return tmpTrans;
      },
      tmpTrans: tmpTrans,
    };

    this.objectItems.push(_ThreeAmmoObject);
    return _ThreeAmmoObject;
  }

  getObject(name: string): null | IThreeObjectLibrary.ThreeAmmoObjectItem {
    const targetObject = this.objectItems.find(x => x.name === name);
    if (targetObject === undefined) {
      return null;
    }
    return targetObject;
  }

  update(deltaTime: number): void {
    // Step world
    this.world.stepSimulation(deltaTime, 10);

    // console.log('update', deltaTime);

    // Update rigid bodies
    // for (const item of this.objectItems) {
    this.objectItems.forEach((item) => {
      let objThree = item.threeJsObject;
      let objAmmo = item.ammoJsObject;
      let ms = objAmmo.getMotionState();
      if (ms) {
        ms.getWorldTransform(item.tmpTrans);
        let p = item.tmpTrans.getOrigin();
        let q = item.tmpTrans.getRotation();
        // console.log('objThree', objThree);
        // console.log(JSON.stringify(p));
        // console.log({ x: p.x(), y: p.y(), z: p.z() });
        if (item.name === 'ball3') {
          // console.log({ x: p.x(), y: p.y(), z: p.z() });
        }

        objThree.position.set(p.x(), p.y(), p.z());
        if (item.isRotationSync !== false) {
          objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
        }
      }
    });
  }
}

const getIntersects = (params: IThreeObjectLibrary.GetObjectRequireParams) => {
  if (params.event === null) {
    return [];
  }
  params.event.preventDefault();

  //  Statement  raycaster  and  mouse  Variable
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const rect = params.canvasElement.getBoundingClientRect();

  //  Click the location with the mouse , To calculate the  raycaster  The location of the desired point , Focus on the screen , Range  -1  To  1
  mouse.x = ( ( params.event.clientX - rect.left ) / ( rect.right - rect.left ) ) * 2 - 1;
  mouse.y = - ( ( params.event.clientY - rect.top ) / ( rect.bottom - rect.top) ) * 2 + 1;

  // Location by mouse click ( Two dimensional coordinates ) And the matrix of the current camera
  raycaster.setFromCamera(mouse, params.camera);

  //  To obtain and raycaster A collection of arrays where rays intersect , The elements are sorted by distance , The closer it is, the more forward it is
  const intersects = raycaster.intersectObjects(params.scene.children);

  // Returns an array of selected objects
  return intersects;
};

export const getObjectFromMouseEvent = (params: IThreeObjectLibrary.GetObjectRequireParams): null | THREE.Object3D<THREE.Event> => {
  if (params.event === null) {
    return null;
  }

  const intersects = getIntersects({
    event: params.event,
    camera: params.camera,
    scene: params.scene,
    canvasElement: params.canvasElement,
  });

  if (intersects.length > 0) {
    const object = intersects[0].object;
    return object;
  }

  return null;
};

export const getObjectFromExternal = (params: IThreeObjectLibrary.GetObjectFromExternalParams) => {
  return new Promise<GLTF>(function(resolve, reject) {
    const loader = new GLTFLoader();
    loader.load(params.path, function (gltf) {
      console.log('???', gltf);
      resolve(gltf);
    });
  });
};

export const getTextureFromExternal = (params: IThreeObjectLibrary.GetTextureFromExternalParams) => {
  return new Promise<THREE.Texture>(function(resolve, reject) {
    const texture = new THREE.TextureLoader(params.manager);
    texture.load(params.path, function (texture) {
      resolve(texture);
    });
  });
};
