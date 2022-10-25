import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IThreeCannonObjectUtil } from './three-cannon-object-util.interface';
import * as THREE from 'three';

export class ThreeCannonObjectManager {
  world: CANNON.World;
  scene: THREE.Scene;
  objectItems: IThreeCannonObjectUtil.ThreeCannonObjectItem[];

  constructor(params: IThreeCannonObjectUtil.ThreeCannonObjectManagerConstructorParams) {
    const {
      world,
      scene,
    } = params;
    this.world = world;
    this.scene = scene;
    this.objectItems = [];
  }

  add(params: IThreeCannonObjectUtil.AddThreeCannonObjectParams) {
    if (this.objectItems.filter(x => x.name === params.name).length > 0) {
      throw new Error(`ThreeCannonObject의 name은 고유해야 합니다. "${params.name}" 이라는 name은 중복되었습니다.`);
    }

    const world = params.world ?? this.world;
    const scene = params.scene ?? this.scene;

    const threeJsObject = params.threeJsObject(params.objectOptions);
    scene.add(threeJsObject);

    const cannonJsObject = params.cannonJsObject(params.objectOptions, threeJsObject);
    world.addBody(cannonJsObject);

    const _ThreeCannonObject: IThreeCannonObjectUtil.ThreeCannonObjectItem = {
      name: params.name,
      world: world,
      scene: scene,
      threeJsObject: threeJsObject,
      cannonJsObject: cannonJsObject,
    };

    this.objectItems.push(_ThreeCannonObject);
    return _ThreeCannonObject;
  }

  getObject(name: string): null | IThreeCannonObjectUtil.ThreeCannonObjectItem {
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

export class CharacterControlsCannon {
  ControlKeys = {
    ArrowTop: 'w',
    ArrowLeft: 'a',
    ArrowRight: 'd',
    ArrowDown: 's',
  };

  model: IThreeCannonObjectUtil.ThreeCannonObjectItem;
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
    model: IThreeCannonObjectUtil.ThreeCannonObjectItem,
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
      this.cameraTarget.x = this.model.cannonJsObject.position.x;
      this.cameraTarget.y = this.model.cannonJsObject.position.y;
      this.cameraTarget.z = this.model.cannonJsObject.position.z;
      this.orbitControls.target = this.cameraTarget;
    }
  }

  private updateCameraTarget(moveX: number, moveZ: number) {
    // move camera
    this.camera.position.x += moveX;
    this.camera.position.z += moveZ;

    // update camera target
    this.cameraTarget.x = this.model.cannonJsObject.position.x;
    this.cameraTarget.y = this.model.cannonJsObject.position.y;
    this.cameraTarget.z = this.model.cannonJsObject.position.z;
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