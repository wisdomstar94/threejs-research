import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { IThreeAmmoObjectUtil } from "./three-ammo-object-util.interface";
import * as THREE from 'three';

export class ThreeAmmoObjectManager {
  world: Ammo.btDiscreteDynamicsWorld;
  scene: THREE.Scene;
  objectItems: IThreeAmmoObjectUtil.ThreeAmmoObjectItem[];

  constructor(params: IThreeAmmoObjectUtil.ThreeAmmoObjectManagerConstructorParams) {
    const {
      world,
      scene,
    } = params;
    this.world = world;
    this.scene = scene;
    this.objectItems = [];
  }

  add(params: IThreeAmmoObjectUtil.AddThreeAmmoObjectParams) {
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

    const _ThreeAmmoObject: IThreeAmmoObjectUtil.ThreeAmmoObjectItem = {
      name: params.name,
      isRotationSync: params.isRotationSync,
      world: world,
      scene: scene,
      threeJsObject: threeJsObject,
      ammoJsObject: ammoJsObject,
      getAmmoTransfrom: (deltaTime: number, item: IThreeAmmoObjectUtil.ThreeAmmoObjectItem) => {
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

  getObject(name: string): null | IThreeAmmoObjectUtil.ThreeAmmoObjectItem {
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

export class CharacterControlsAmmo {
  ControlKeys = {
    ArrowTop: 'w',
    ArrowLeft: 'a',
    ArrowRight: 'd',
    ArrowDown: 's',
  };

  model: IThreeAmmoObjectUtil.ThreeAmmoObjectItem;
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
    model: IThreeAmmoObjectUtil.ThreeAmmoObjectItem,
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

