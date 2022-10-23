import Head from "next/head";
import { useEffect, useRef } from "react";
import CommonLayout from "../../../components/layouts/common-layout/common-layout.component";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as CANNON from 'cannon-es';
import { IThreejsCanvasBox } from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.interface";
import ThreejsCanvasBox from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.component";
import { ThreeCannonObject } from "../../../librarys/three-object-util/three-object-util.library";
import useFromEvent from "../../../hooks/use-from-event/use-from-event";
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const ControlKeys = {
  ArrowTop: 'w',
  ArrowLeft: 'a',
  ArrowRight: 'd',
  ArrowDown: 's',
};

class CharacterControls {
  model: ThreeCannonObject;
  mixer: THREE.AnimationMixer;
  animationsMap: Map<string, THREE.AnimationAction> = new Map();
  orbitControls: OrbitControls;
  camera: THREE.PerspectiveCamera;

  toggleRun: boolean = false;
  toggleJump: boolean = false;
  currentAction: string;

  walkDirection = new THREE.Vector3();
  rotateAngle = new THREE.Vector3(0, 1, 0);
  rotateQuarternion: THREE.Quaternion = new THREE.Quaternion();
  cameraTarget = new THREE.Vector3();

  fadeDuration: number = 0.2;
  runVelocity = 5;
  walkVelocity = 2;

  // DIRECTIONS = ['w', 'a', 's', 'd'];

  constructor(params: {
    model: ThreeCannonObject,
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
      // calculate towards camera direction
      var angleYCameraDirection = Math.atan2(
              (this.camera.position.x - this.model.cannonObject.position.x), 
              (this.camera.position.z - this.model.cannonObject.position.z))
      // diagonal movement angle offset
      var directionOffset = this.directionOffset(keyPressed);

      // rotate model 
      this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset);
      this.model.threeObject.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

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
      const prevPosition = { ...this.model.cannonObject.position };
      this.model.cannonObject.position.x += moveX;
      this.model.cannonObject.position.z += moveZ;
      setTimeout(() => {
        let _moveX = this.model.cannonObject.position.x - prevPosition.x;
        let _moveZ = this.model.cannonObject.position.z - prevPosition.z;

        this.updateCameraTarget(_moveX, _moveZ);
      });
      
    } else if (this.toggleJump) {
      this.cameraTarget.x = this.model.threeObject.position.x;
      this.cameraTarget.y = this.model.threeObject.position.y;
      this.cameraTarget.z = this.model.threeObject.position.z;
      this.orbitControls.target = this.cameraTarget;
    }
  }

  private updateCameraTarget(moveX: number, moveZ: number) {
    // move camera
    this.camera.position.x += moveX;
    this.camera.position.z += moveZ;

    // update camera target
    this.cameraTarget.x = this.model.threeObject.position.x;
    this.cameraTarget.y = this.model.threeObject.position.y;
    this.cameraTarget.z = this.model.threeObject.position.z;
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
        <title>threejs-005-character-moving</title>
        <meta name="description" content="threejs-005-character-moving page!" />
        <link rel="icon" href="/favicon.ico" />
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
      const characterThreeCannonObject = Array.from(boxThreeCannonObjectsRef.current).find(x => x.name === 'character');
      if (characterThreeCannonObject !== undefined) {
        characterThreeCannonObject.cannonObject.velocity.y = 6;
      }

      setTimeout(() => {
        characterControlsRef.current?.switchJumpToggle(false);
      }, 800);
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

    // cannon
    const world = new CANNON.World();
    world.gravity.set(0, -15.82, 0);
    // world.gravity.set(0, -10, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    // world.solver.addEquation()
    // world.solver = 10
    // world.defaultContactMaterial.contactEquationStiffness = 1e7;
    world.defaultContactMaterial.contactEquationRelaxation = 4;

    // camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    globalCamerasRef.current.push(camera);
    camera.position.set(0, 2, 5);
    camera.setFocalLength(20);
    // camera.lookAt(new THREE.Vector3(0, 0, 0));

    // scene
    const scene = new THREE.Scene();
    globalScenesRef.current.push(scene);

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
    const planeThreeCannonObject = new ThreeCannonObject({
      name: 'plane',
      world,
      scene,
      threeObject: () => {
        const plane = new THREE.Mesh(
          new THREE.BoxGeometry(10, 5, 10), // geometry
          new THREE.MeshStandardMaterial({ color: 0xcccccc }), // material
        );
        plane.position.set(0, -2.52, 0);
        plane.castShadow = true;
        plane.receiveShadow = true;
        allObjectsRef.current.add(plane);
        console.log('plane', plane);
        return plane;
      },
      cannonObject: (object) => {
        const floorBox = new CANNON.Box(new CANNON.Vec3(5, 2.5, 5));
        const floorBody = new CANNON.Body({
          mass: 0,
          position: new CANNON.Vec3(object.position.x, object.position.y - 1 , object.position.z),
          shape: floorBox,
        });
        // floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,0,0), -1);
        floorBody.updateMassProperties();
        return floorBody;
      },
    });

    const leftPlaneThreeCannonObject = new ThreeCannonObject({
      name: 'plane',
      world,
      scene,
      threeObject: () => {
        const plane = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 10), // geometry
          new THREE.MeshStandardMaterial({ color: 0xcccccc }), // material
        );
        plane.position.set(-5.9, -0.4, 0);
        plane.castShadow = true;
        plane.receiveShadow = true;
        allObjectsRef.current.add(plane);
        console.log('plane', plane);
        return plane;
      },
      cannonObject: (object) => {
        const floorBox = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 5));
        const floorBody = new CANNON.Body({
          mass: 0,
          position: new CANNON.Vec3(object.position.x, object.position.y, object.position.z),
          fixedRotation: true,
          shape: floorBox,
        });
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),Math.PI/2);
        return floorBody;
      },
    });

    const orbitControls = new OrbitControls(camera, canvas);
    orbitControls.enableDamping = true;
    orbitControls.enableZoom = false;
    orbitControls.enablePan = false;
    orbitControls.update(); // render 시에도 호출해주어야 함.

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

    const characterThreeCannonObject = new ThreeCannonObject({
      name: 'character',
      world,
      scene,
      threeObject: () => {
        allObjectsRef.current.add(model);
        model.position.y = 2;
        return model;
      },
      cannonObject: (object) => {
        const cannonBox = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
        console.log('object.position', object.position);
        // const cannonBox = new CANNON.Sphere(3);
        const cannonBoxBody = new CANNON.Body({
          mass: 1,
          position: new CANNON.Vec3(object.position.x, object.position.y, object.position.z),
          shape: cannonBox,
        });
        return cannonBoxBody;
      },
    });
    boxThreeCannonObjectsRef.current.add(characterThreeCannonObject);

    const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap: Map<string, THREE.AnimationAction> = new Map();
    gltfAnimations.filter(a => a.name !== '').forEach((a: THREE.AnimationClip) => {
      animationsMap.set(a.name, mixer.clipAction(a));
    });

    characterControlsRef.current = new CharacterControls({
      model: characterThreeCannonObject,
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

    let oldElapsedTime = 0;
    const tick = () => {
      const elapsedTime = clock.getElapsedTime();
      const deltaTime = elapsedTime - oldElapsedTime;
      oldElapsedTime = elapsedTime;

      // Update physics
      world.step(1 / 60, deltaTime, 3);
      // step 은 업데이트 해주는 메소드
      // box.position.copy(new THREE.Vector3(cannonBoxBody.position.x, cannonBoxBody.position.y, cannonBoxBody.position.z));
      // planeThreeCannonObject.update();
      boxThreeCannonObjectsRef.current.forEach((boxThreeCannonObject) => {
        boxThreeCannonObject.update();
      });
    };

    const render = () => {
      let mixerUpdateDelta = clock.getDelta();
      renderer.clear();
      if (characterControlsRef.current !== undefined) {
        characterControlsRef.current.update(mixerUpdateDelta, keyPressedRef.current);
      }
      orbitControls.update();
      // controls.update();
      // millisecondRef.current++;
      renderer.render(scene, camera);
      tick();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
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