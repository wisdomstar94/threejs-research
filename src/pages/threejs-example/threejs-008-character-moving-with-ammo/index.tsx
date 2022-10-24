import Head from "next/head";
import { useEffect, useRef } from "react";
import CommonLayout from "../../../components/layouts/common-layout/common-layout.component";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as CANNON from 'cannon-es';
import { IThreejsCanvasBox } from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.interface";
import ThreejsCanvasBox from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.component";
import { ThreeAmmoObjectManager, ThreeCannonObject } from "../../../librarys/three-object-util/three-object-util.library";
import useFromEvent from "../../../hooks/use-from-event/use-from-event";
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { IThreeObjectLibrary } from "../../../librarys/three-object-util/three-object-util.interface";

const ControlKeys = {
  ArrowTop: 'w',
  ArrowLeft: 'a',
  ArrowRight: 'd',
  ArrowDown: 's',
};

class CharacterControls {
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

  // DIRECTIONS = ['w', 'a', 's', 'd'];

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
    const directionPressed = keyPressed[ControlKeys.ArrowDown] || keyPressed[ControlKeys.ArrowLeft] || keyPressed[ControlKeys.ArrowRight] || keyPressed[ControlKeys.ArrowTop];

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

    if (keysPressed[ControlKeys.ArrowTop]) {
      if (keysPressed[ControlKeys.ArrowLeft]) {
        directionOffset = Math.PI / 4 // w+a
      } else if (keysPressed[ControlKeys.ArrowRight]) {
        directionOffset = - Math.PI / 4 // w+d
      }
    } else if (keysPressed[ControlKeys.ArrowDown]) {
      if (keysPressed[ControlKeys.ArrowLeft]) {
        directionOffset = Math.PI / 4 + Math.PI / 2 // s+a
      } else if (keysPressed[ControlKeys.ArrowRight]) {
        directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d
      } else {
        directionOffset = Math.PI // s
      }
    } else if (keysPressed[ControlKeys.ArrowLeft]) {
      directionOffset = Math.PI / 2 // a
    } else if (keysPressed[ControlKeys.ArrowRight]) {
      directionOffset = - Math.PI / 2 // d
    }

    return directionOffset
  }
}

const IndexPage = () => {
  return (
    <>
      <Head>
        <title>threejs-008-character-moving-with-ammo</title>
        <meta name="description" content="threejs-008-character-moving-with-ammo page!" />
        <link rel="icon" href="/favicon.ico" />
        <script src="/js/ammo.js" async />
      </Head>

      <CommonLayout>
        <PageContents />
      </CommonLayout>
    </>
  );
};

const PageContents = () => {
  const threejsCanvasBoxRef = useRef<IThreejsCanvasBox.RefObject>(null);

  const globalRendererRef = useRef<THREE.WebGLRenderer>();
  const globalCamerasRef = useRef<THREE.PerspectiveCamera[]>([]);
  const globalScenesRef = useRef<THREE.Scene[]>([]);
  const boxThreeCannonObjectsRef = useRef<Set<ThreeCannonObject>>(new Set<ThreeCannonObject>());
  const allObjectsRef = useRef<Set<THREE.Object3D<any>>>(new Set<THREE.Object3D<any>>());

  const characterControlsRef = useRef<CharacterControls>();
  const keyPressedRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    init();
  }, []);

  useFromEvent(typeof document !== 'undefined' ? document : undefined, 'keydown', (event: KeyboardEvent) => {
    const key = event.key;
    if (key === 'Shift' && characterControlsRef.current) {
      characterControlsRef.current?.switchRunToggle(true);
    } else if (key === ' ') {
      if (characterControlsRef.current?.toggleJump) {
        return;
      }

      keyPressedRef.current[key.toLowerCase()] = true;
      characterControlsRef.current?.switchJumpToggle(true);
      let jumpImpulse = new Ammo.btVector3( 0, 5, 0 );
      jumpImpulse.op_mul(1);
      // characterControlsRef?.current?.model?.ammoJsObject?.setLinearVelocity(jumpImpulse);
      characterControlsRef?.current?.model?.ammoJsObject?.applyCentralImpulse(jumpImpulse);

      setTimeout(() => {
        characterControlsRef.current?.switchJumpToggle(false);
      }, 900);
    } else {
      keyPressedRef.current[key.toLowerCase()] = true;
    }
  });

  useFromEvent(typeof document !== 'undefined' ? document : undefined, 'keyup', (event: KeyboardEvent) => {
    const key = event.key;

    console.log('event', event);

    if (key === 'Shift') {
      characterControlsRef.current?.switchRunToggle(false);
    } else {
      keyPressedRef.current[key.toLowerCase()] = false;
    }
  });

  async function init() {
    const canvas = threejsCanvasBoxRef.current?.getCanvas();
    if (canvas === null || canvas === undefined) {
      console.log('canvas is null or undefined');
      return;
    }

    // renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas: canvas });
    renderer.autoClear = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = Math.pow(0.9, 4.0);
    renderer.setClearColor(0xffffff, 0);
    globalRendererRef.current = renderer;

    // ammo init
    if (typeof Ammo === 'function') {
      await Ammo();
    }
    const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    const overlappingPairCache = new Ammo.btDbvtBroadphase() as any;
    const solver = new Ammo.btSequentialImpulseConstraintSolver();
    const physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));

    // camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    globalCamerasRef.current.push(camera);
    camera.position.set(0, 2, 5);
    camera.setFocalLength(20);
    // camera.lookAt(new THREE.Vector3(0, 0, 0));

    // scene
    const scene = new THREE.Scene();
    globalScenesRef.current.push(scene);

    // threeAmmoObjectManager
    const threeAmmoObjectManager = new ThreeAmmoObjectManager({
      world: physicsWorld,
      scene: scene,
    });

    // light
    const worldLight = new THREE.AmbientLight(0xffffff, 1);
	  scene.add(worldLight);

    const spotLight = new THREE.SpotLight(0xFFFFFF, 2);
		spotLight.position.set(50, 50, 50);
		spotLight.castShadow = true;
    spotLight.angle = 0.7;
    const obj = new THREE.Object3D();
    obj.position.set(0, 0, 0);
    scene.add(obj);
    spotLight.target = obj;
    spotLight.shadow.radius = 4;
    spotLight.shadow.blurSamples = 10;
    spotLight.shadow.bias = -0.00001;
    spotLight.shadow.mapSize.width = 1024 * 10;
    spotLight.shadow.mapSize.height = 1024 * 10;
    // spotLight.lookAt(new THREE.Vector3(30, 30, 30));
    scene.add(spotLight);
    allObjectsRef.current.add(spotLight);

    // plane add
    {
      const planeObject = threeAmmoObjectManager.add({
        name: 'plane',
        objectOptions: {
          pos: { x: 0, y: 0, z: 0 },
          quat: { x: 0, y: 0, z: 0, w: 1 },
          size: { x: 10, y: 0.5, z: 10 },
          mass: 0,
        },
        threeJsObject(objectOptions) {
          const blockPlane = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhongMaterial({color: 0xa0afa4}));
          blockPlane.position.set(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z);
          blockPlane.scale.set(objectOptions.size?.x ?? 1, objectOptions.size?.y ?? 1, objectOptions.size?.z ?? 1);
          blockPlane.castShadow = true;
          blockPlane.receiveShadow = true;
          return blockPlane;
        },
        ammoJsObject(objectOptions, threeJsObject) {
          const transform = new Ammo.btTransform();
          transform.setIdentity();
          transform.setOrigin(new Ammo.btVector3(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z));
          transform.setRotation( new Ammo.btQuaternion(objectOptions.quat.x, objectOptions.quat.y, objectOptions.quat.z, objectOptions.quat.w));
          const motionState = new Ammo.btDefaultMotionState(transform);

          const colShape = new Ammo.btBoxShape( new Ammo.btVector3( (objectOptions.size?.x ?? 1) * 0.5, (objectOptions.size?.y ?? 1) * 0.5, (objectOptions.size?.z ?? 1) * 0.5 ) );
          colShape.setMargin(0.05);

          const localInertia = new Ammo.btVector3(0, 0, 0);
          colShape.calculateLocalInertia(objectOptions.mass, localInertia);

          const rbInfo = new Ammo.btRigidBodyConstructionInfo(objectOptions.mass, motionState, colShape, localInertia);
          const body = new Ammo.btRigidBody(rbInfo);
          return body;
        },
      });

      const leftObject = threeAmmoObjectManager.add({
        name: 'left-plane',
        objectOptions: {
          pos: { x: -5, y: -1, z: 0 },
          quat: { x: 0, y: 0, z: 0, w: 1 },
          size: { x: 1, y: 3, z: 10 },
          mass: 0,
        },
        threeJsObject(objectOptions) {
          const blockPlane = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhongMaterial({color: 0xa0afa4}));
          blockPlane.position.set(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z);
          blockPlane.scale.set(objectOptions.size?.x ?? 1, objectOptions.size?.y ?? 1, objectOptions.size?.z ?? 1);
          blockPlane.castShadow = true;
          blockPlane.receiveShadow = true;
          return blockPlane;
        },
        ammoJsObject(objectOptions, threeJsObject) {
          const transform = new Ammo.btTransform();
          transform.setIdentity();
          transform.setOrigin(new Ammo.btVector3(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z));
          transform.setRotation( new Ammo.btQuaternion(objectOptions.quat.x, objectOptions.quat.y, objectOptions.quat.z, objectOptions.quat.w));
          const motionState = new Ammo.btDefaultMotionState(transform);

          const colShape = new Ammo.btBoxShape( new Ammo.btVector3( (objectOptions.size?.x ?? 1) * 0.5, (objectOptions.size?.y ?? 1) * 0.5, (objectOptions.size?.z ?? 1) * 0.5 ) );
          colShape.setMargin(0.05);

          const localInertia = new Ammo.btVector3(0, 0, 0);
          colShape.calculateLocalInertia(objectOptions.mass, localInertia);

          const rbInfo = new Ammo.btRigidBodyConstructionInfo(objectOptions.mass, motionState, colShape, localInertia);
          const body = new Ammo.btRigidBody(rbInfo);
          return body;
        },
      });
    }

    const orbitControls = new OrbitControls(camera, canvas);
    orbitControls.enableDamping = true;
    orbitControls.enableZoom = false;
    orbitControls.enablePan = false;
    orbitControls.update(); // render 시에도 호출해주어야 함.

    // character
    const gltf = await new Promise<GLTF>(function(resolve, reject) {
      new GLTFLoader().load('/threejs-objects/Soldier.glb', function (gltf) {
        resolve(gltf);
      });
    }); 
    console.log('@gltf', gltf);

    const model = gltf.scene;
    model.traverse(function (object: any) {
      if (object.isMesh) {
        object.castShadow = true;
      }
      scene.add(model);
    });

    
    const characterObject = threeAmmoObjectManager.add({
      name: 'character',
      isRotationSync: false,
      objectOptions: {
        pos: { x: 0, y: 2, z: 0 },
        quat: { x: 0, y: 0, z: 0, w: 1 },
        mass: 1,
      },
      threeJsObject(objectOptions) {
        model.position.set(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z);
        model.castShadow = true;
        model.receiveShadow = true;
        return model;
      },
      ammoJsObject(objectOptions, threeJsObject) {
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z));
        transform.setRotation(new Ammo.btQuaternion( objectOptions.quat.x, objectOptions.quat.y, objectOptions.quat.z, objectOptions.quat.w));
        const motionState = new Ammo.btDefaultMotionState(transform);

        // const box = new Ammo.btBoxShape(new Ammo.btVector3(0.05, 0.05, 0.05));
        const box = new Ammo.btSphereShape(0.05);
        // const box = new Ammo.btCylinderShape(new Ammo.btVector3(0.3, 0.3, 0.3));
        box.setMargin(0.05);

        const localInertia = new Ammo.btVector3(0, 0, 0);
        box.calculateLocalInertia(objectOptions.mass, localInertia);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(objectOptions.mass, motionState, box, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);
        // body.setCollisionFlags(2);
        return body;
      },
    });
    
    const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap: Map<string, THREE.AnimationAction> = new Map();
    gltfAnimations.filter(a => a.name !== '').forEach((a: THREE.AnimationClip) => {
      animationsMap.set(a.name, mixer.clipAction(a));
    });

    characterControlsRef.current = new CharacterControls({
      model: characterObject,
      mixer,
      animationsMap,
      orbitControls,
      camera,
      currentAction: 'Idle',
    });

    // helpers
    const axesHelper = new THREE.AxesHelper(150);
    scene.add(axesHelper);

    // const controls = new PointerLockControls(camera, canvas);
    // controls.addEventListener(''

    // characterControlsRef.current = new CharacterControls({
    //   model: boxThreeCannonObject,
    //   orbitControls,
    //   camera,
    //   currentAction: 'Idle',
    // });

    // render
    const clock = new THREE.Clock();

    const render = () => {
      const deltaTime = clock.getDelta();
      renderer.clear();
      orbitControls.update();
      if (characterControlsRef.current !== undefined) {
        characterControlsRef.current.update(deltaTime, keyPressedRef.current);
      }
      renderer.render(scene, camera);
      threeAmmoObjectManager.update(deltaTime);
      requestAnimationFrame(render);
    };
    render();
  }

  return (
    <>
      <ThreejsCanvasBox
        __style={{ width: '80%', height: '80%' }}
        ref={threejsCanvasBoxRef}
        __rendererRef={globalRendererRef}
        __camerasRef={globalCamerasRef}
        __scenesRef={globalScenesRef} />
    </>
  );
};  

export default IndexPage;