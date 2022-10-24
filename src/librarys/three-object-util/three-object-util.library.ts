import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { IThreeObjectLibrary } from './three-object-util.interface';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// export class ThreeCannonObject {
//   name: string;
//   world: CANNON.World;
//   scene?: THREE.Scene;
//   threeObject: THREE.Object3D<any>;
//   cannonObject: CANNON.Body;

//   constructor(params: IThreeObjectLibrary.ThreeCannonObjectParams) {
//     this.name = params.name;
//     this.world = params.world;
//     this.scene = params.scene;

//     this.threeObject = params.threeObject();
//     this.cannonObject = params.cannonObject(this.threeObject);

//     // this.cannonObject.position.copy(new CANNON.Vec3(
//     //   this.threeObject.position.x,
//     //   this.threeObject.position.y,
//     //   this.threeObject.position.z,
//     // ));

//     this.world.addBody(this.cannonObject);
//     this.scene?.add(this.threeObject);
//   }

//   update(): void {
//     this.threeObject.position.x = this.cannonObject.position.x;
//     this.threeObject.position.y = this.cannonObject.position.y;
//     this.threeObject.position.z = this.cannonObject.position.z;
//   }
// }

export class ThreeCannonObjectManager {
  world: CANNON.World;
  scene: THREE.Scene;
  objectItems: IThreeObjectLibrary.ThreeCannonObjectItem[];

  constructor(params: IThreeObjectLibrary.ThreeCannonObjectManagerConstructorParams) {
    const {
      world,
      scene,
    } = params;
    this.world = world;
    this.scene = scene;
    this.objectItems = [];
  }

  add(params: IThreeObjectLibrary.AddThreeCannonObjectParams) {
    if (this.objectItems.filter(x => x.name === params.name).length > 0) {
      throw new Error(`ThreeCannonObject의 name은 고유해야 합니다. "${params.name}" 이라는 name은 중복되었습니다.`);
    }

    const world = params.world ?? this.world;
    const scene = params.scene ?? this.scene;

    const threeJsObject = params.threeJsObject(params.objectOptions);
    scene.add(threeJsObject);

    const cannonJsObject = params.cannonJsObject(params.objectOptions, threeJsObject);
    world.addBody(cannonJsObject);

    const _ThreeCannonObject: IThreeObjectLibrary.ThreeCannonObjectItem = {
      name: params.name,
      world: world,
      scene: scene,
      threeJsObject: threeJsObject,
      cannonJsObject: cannonJsObject,
    };

    this.objectItems.push(_ThreeCannonObject);
    return _ThreeCannonObject;
  }

  getObject(name: string): null | IThreeObjectLibrary.ThreeCannonObjectItem {
    const targetObject = this.objectItems.find(x => x.name === name);
    if (targetObject === undefined) {
      return null;
    }
    return targetObject;
  }

  update(deltaTime: number): void {
    // this.world.step(1 / 60, deltaTime, 3);
    this.world.step(deltaTime);

    this.objectItems.forEach((item) => {
      item.threeJsObject.position.x = item.cannonJsObject.position.x;
      item.threeJsObject.position.y = item.cannonJsObject.position.y;
      item.threeJsObject.position.z = item.cannonJsObject.position.z;
    });
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

export class CharacterControlsCannon {
  ControlKeys = {
    ArrowTop: 'w',
    ArrowLeft: 'a',
    ArrowRight: 'd',
    ArrowDown: 's',
  };

  model: IThreeObjectLibrary.ThreeCannonObjectItem;
  mixer: THREE.AnimationMixer;
  animationsMap: Map<string, THREE.AnimationAction> = new Map();
  orbitControls: OrbitControls;
  camera: THREE.PerspectiveCamera;

  toggleRun: boolean = false;
  toggleJump: boolean = false;
  currentAction: string;

  walkDirection = new THREE.Vector3();
  rotateAngle = new THREE.Vector3(0, 1, 0);
  // rotateAngle = new Cannon.btVector3(0, 1, 0);
  rotateQuarternion: THREE.Quaternion = new THREE.Quaternion();
  // rotateQuarternion = new Cannon.btQuaternion(0, 0, 0, 1);
  cameraTarget = new THREE.Vector3();

  fadeDuration: number = 0.2;
  runVelocity = 5;
  walkVelocity = 2;

  constructor(params: {
    model: IThreeObjectLibrary.ThreeCannonObjectItem,
    mixer: THREE.AnimationMixer,
    animationsMap: Map<string, THREE.AnimationAction>,
    orbitControls: OrbitControls,
    camera: THREE.PerspectiveCamera,
    currentAction: string,
  }) {
    const {
      model,
      mixer,
      orbitControls,
      camera,
      currentAction,
      animationsMap,
    } = params;

    this.model = model;
    this.mixer = mixer;
    this.orbitControls = orbitControls;
    this.camera = camera;
    this.currentAction = currentAction;
    this.animationsMap = animationsMap;
    this.animationsMap.forEach((value, key) => {
      if (key === currentAction) {
        value.play();
      }
    });
  }

  switchRunToggle(value?: boolean) {
    if (typeof value === 'boolean') {
      this.toggleRun = value;
      return;  
    }

    this.toggleRun = !this.toggleRun;
  }

  switchJumpToggle(value?: boolean) {
    if (typeof value === 'boolean') {
      this.toggleJump = value;
      return;  
    }

    this.toggleJump = !this.toggleJump;
  }

  update(delta: number, keyPressed: any) {
    // const directionPressed = Object.values(ControlKeys).some(key => keyPressed[key] === true);
    const directionPressed = keyPressed[this.ControlKeys.ArrowDown] || keyPressed[this.ControlKeys.ArrowLeft] || keyPressed[this.ControlKeys.ArrowRight] || keyPressed[this.ControlKeys.ArrowTop];

    let play = ''
    if (this.toggleJump) {
      play = 'Tpose';
    } else if (directionPressed && this.toggleRun) {
      play = 'Run';
    } else if (directionPressed) {
      play = 'Walk';
    } else {
      play = 'Idle';
    }

    if (this.currentAction !== play) {
      const toPlay = this.animationsMap.get(play);
      const current = this.animationsMap.get(this.currentAction);

      current?.fadeOut(this.fadeDuration);
      toPlay?.reset().fadeIn(this.fadeDuration).play();

      this.currentAction = play;
    }

    this.mixer.update(delta);

    if (directionPressed) {
      // calculate towards camera direction
      var angleYCameraDirection = Math.atan2(
        (this.camera.position.x - this.model.cannonJsObject.position.x), 
        (this.camera.position.z - this.model.cannonJsObject.position.z))
      // diagonal movement angle offset
      var directionOffset = this.directionOffset(keyPressed);

      // rotate model 
      this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset);
      this.model.threeJsObject.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

      // calculate direction
      this.camera.getWorldDirection(this.walkDirection);
      this.walkDirection.y = 0;
      this.walkDirection.normalize();
      this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

      // run/walk velocity
      const velocity = this.toggleRun ? this.runVelocity : this.walkVelocity;

      // move model & camera
      const moveX = this.walkDirection.x * velocity * delta;
      const moveZ = this.walkDirection.z * velocity * delta;
      const prevPosition = { ...this.model.cannonJsObject.position };
      this.model.cannonJsObject.position.x += moveX;
      this.model.cannonJsObject.position.z += moveZ;
      setTimeout(() => {
        let _moveX = this.model.cannonJsObject.position.x - prevPosition.x;
        let _moveZ = this.model.cannonJsObject.position.z - prevPosition.z;

        this.updateCameraTarget(_moveX, _moveZ);
      });
    } else if (this.toggleJump) {
      this.cameraTarget.x = this.model.threeJsObject.position.x;
      this.cameraTarget.y = this.model.threeJsObject.position.y;
      this.cameraTarget.z = this.model.threeJsObject.position.z;
      this.orbitControls.target = this.cameraTarget;
    }
  }

  private updateCameraTarget(moveX: number, moveZ: number) {
    // move camera
    this.camera.position.x += moveX;
    this.camera.position.z += moveZ;

    // update camera target
    this.cameraTarget.x = this.model.threeJsObject.position.x;
    this.cameraTarget.y = this.model.threeJsObject.position.y;
    this.cameraTarget.z = this.model.threeJsObject.position.z;
    this.orbitControls.target = this.cameraTarget;
  }

  private directionOffset(keysPressed: any) {
    let directionOffset = 0 // w

    if (keysPressed[this.ControlKeys.ArrowTop]) {
      if (keysPressed[this.ControlKeys.ArrowLeft]) {
        directionOffset = Math.PI / 4 // w+a
      } else if (keysPressed[this.ControlKeys.ArrowRight]) {
        directionOffset = - Math.PI / 4 // w+d
      }
    } else if (keysPressed[this.ControlKeys.ArrowDown]) {
      if (keysPressed[this.ControlKeys.ArrowLeft]) {
        directionOffset = Math.PI / 4 + Math.PI / 2 // s+a
      } else if (keysPressed[this.ControlKeys.ArrowRight]) {
        directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d
      } else {
        directionOffset = Math.PI // s
      }
    } else if (keysPressed[this.ControlKeys.ArrowLeft]) {
      directionOffset = Math.PI / 2 // a
    } else if (keysPressed[this.ControlKeys.ArrowRight]) {
      directionOffset = - Math.PI / 2 // d
    }

    return directionOffset
  }
}

export class CharacterControlsAmmo {
  ControlKeys = {
    ArrowTop: 'w',
    ArrowLeft: 'a',
    ArrowRight: 'd',
    ArrowDown: 's',
  };

  model: IThreeObjectLibrary.ThreeAmmoObjectItem;
  mixer: THREE.AnimationMixer;
  animationsMap: Map<string, THREE.AnimationAction> = new Map();
  orbitControls: OrbitControls;
  camera: THREE.PerspectiveCamera;

  toggleRun: boolean = false;
  toggleJump: boolean = false;
  currentAction: string;

  walkDirection = new THREE.Vector3();
  rotateAngle = new THREE.Vector3(0, 1, 0);
  // rotateAngle = new Ammo.btVector3(0, 1, 0);
  rotateQuarternion: THREE.Quaternion = new THREE.Quaternion();
  // rotateQuarternion = new Ammo.btQuaternion(0, 0, 0, 1);
  cameraTarget = new THREE.Vector3();

  fadeDuration: number = 0.2;
  runVelocity = 5;
  walkVelocity = 2;

  constructor(params: {
    model: IThreeObjectLibrary.ThreeAmmoObjectItem,
    mixer: THREE.AnimationMixer,
    animationsMap: Map<string, THREE.AnimationAction>,
    orbitControls: OrbitControls,
    camera: THREE.PerspectiveCamera,
    currentAction: string,
  }) {
    const {
      model,
      mixer,
      orbitControls,
      camera,
      currentAction,
      animationsMap,
    } = params;

    this.model = model;
    this.mixer = mixer;
    this.orbitControls = orbitControls;
    this.camera = camera;
    this.currentAction = currentAction;
    this.animationsMap = animationsMap;
    this.animationsMap.forEach((value, key) => {
      if (key === currentAction) {
        value.play();
      }
    });
  }

  switchRunToggle(value?: boolean) {
    if (typeof value === 'boolean') {
      this.toggleRun = value;
      return;  
    }

    this.toggleRun = !this.toggleRun;
  }

  switchJumpToggle(value?: boolean) {
    if (typeof value === 'boolean') {
      this.toggleJump = value;
      return;  
    }

    this.toggleJump = !this.toggleJump;
  }

  update(delta: number, keyPressed: any) {
    // const directionPressed = Object.values(ControlKeys).some(key => keyPressed[key] === true);
    const directionPressed = keyPressed[this.ControlKeys.ArrowDown] || keyPressed[this.ControlKeys.ArrowLeft] || keyPressed[this.ControlKeys.ArrowRight] || keyPressed[this.ControlKeys.ArrowTop];

    let play = ''
    if (this.toggleJump) {
      play = 'Tpose';
    } else if (directionPressed && this.toggleRun) {
      play = 'Run';
    } else if (directionPressed) {
      play = 'Walk';
    } else {
      play = 'Idle';
    }

    if (this.currentAction !== play) {
      const toPlay = this.animationsMap.get(play);
      const current = this.animationsMap.get(this.currentAction);

      current?.fadeOut(this.fadeDuration);
      toPlay?.reset().fadeIn(this.fadeDuration).play();

      this.currentAction = play;
    }

    this.mixer.update(delta);

    if (directionPressed) {
      const ammoTransform = this.model.getAmmoTransfrom(delta, this.model);
      const ammoOrigin = ammoTransform.getOrigin();
      const ammoRotation = ammoTransform.getRotation();

      // calculate towards camera direction
      const angleYCameraDirection = Math.atan2(
        (this.camera.position.x - ammoOrigin.x()), 
        (this.camera.position.z - ammoOrigin.z()),
      );
      // diagonal movement angle offset
      const directionOffset = this.directionOffset(keyPressed);

      // rotate model 
      this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset);
      // ammoRotation.setRotation(this.rotateAngle, angleYCameraDirection + directionOffset);
      // this.model.ammoJsObject.setAngularVelocity(this.rotateQuarternion.getAxis());
      // this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset);
      this.model.threeJsObject.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

      // calculate direction
      this.camera.getWorldDirection(this.walkDirection);
      this.walkDirection.y = 0;
      this.walkDirection.normalize();
      this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

      // run/walk velocity
      const velocity = this.toggleRun ? this.runVelocity : this.walkVelocity;

      // move model & camera
      const prevPosition = { 
        x: ammoOrigin.x(),
        y: ammoOrigin.y(),
        z: ammoOrigin.z(),
      };
      const moveX = this.walkDirection.x * velocity * delta;
      const moveZ = this.walkDirection.z * velocity * delta;
      
      // console.log('prevPosition', prevPosition);
      const nextPosition = {
        x: ammoOrigin.x() + moveX,
        z: ammoOrigin.z() + moveZ,
      };
      // console.log('nextPosition', nextPosition);
      // ammoOrigin.setX(nextPosition.x);
      // ammoOrigin.setZ(nextPosition.z);
      // ammoOrigin.setY(5);
      // console.log('moveX', moveX);
      // console.log('moveZ', moveZ);

      const velocity2 = this.model.ammoJsObject.getLinearVelocity();
      let resultantImpulse = velocity2;
      // resultantImpulse.op_mul(1);
      // this.model.ammoJsObject.applyCentralImpulse(resultantImpulse);
      velocity2.setX(velocity2.x() + moveX);
      velocity2.setZ(velocity2.z() + moveZ);
      console.log('setLinearVelocity');
      this.model.ammoJsObject.setLinearVelocity(resultantImpulse);
      // setTimeout(() => {
      //   let _moveX = ammoOrigin.x() - prevPosition.x;
      //   let _moveZ = ammoOrigin.z() - prevPosition.z;
      //   console.log('currentPosition', { x: ammoOrigin.x(), y: ammoOrigin.y(), z: ammoOrigin.z(), });

      //   this.updateCameraTarget(_moveX, _moveZ);
      // });
    } else if (this.toggleJump) {
      this.cameraTarget.x = this.model.threeJsObject.position.x;
      this.cameraTarget.y = this.model.threeJsObject.position.y;
      this.cameraTarget.z = this.model.threeJsObject.position.z;
      this.orbitControls.target = this.cameraTarget;
    }
  }

  private updateCameraTarget(moveX: number, moveZ: number) {
    // move camera
    this.camera.position.x += moveX;
    this.camera.position.z += moveZ;

    // update camera target
    this.cameraTarget.x = this.model.threeJsObject.position.x;
    this.cameraTarget.y = this.model.threeJsObject.position.y;
    this.cameraTarget.z = this.model.threeJsObject.position.z;
    this.orbitControls.target = this.cameraTarget;
  }

  private directionOffset(keysPressed: any) {
    let directionOffset = 0 // w

    if (keysPressed[this.ControlKeys.ArrowTop]) {
      if (keysPressed[this.ControlKeys.ArrowLeft]) {
        directionOffset = Math.PI / 4 // w+a
      } else if (keysPressed[this.ControlKeys.ArrowRight]) {
        directionOffset = - Math.PI / 4 // w+d
      }
    } else if (keysPressed[this.ControlKeys.ArrowDown]) {
      if (keysPressed[this.ControlKeys.ArrowLeft]) {
        directionOffset = Math.PI / 4 + Math.PI / 2 // s+a
      } else if (keysPressed[this.ControlKeys.ArrowRight]) {
        directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d
      } else {
        directionOffset = Math.PI // s
      }
    } else if (keysPressed[this.ControlKeys.ArrowLeft]) {
      directionOffset = Math.PI / 2 // a
    } else if (keysPressed[this.ControlKeys.ArrowRight]) {
      directionOffset = - Math.PI / 2 // d
    }

    return directionOffset
  }
}