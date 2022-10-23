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

class CharacterControls {
  model: THREE.Group;
  mixer: THREE.AnimationMixer;
  animationsMap: Map<string, THREE.AnimationAction> = new Map();
  orbitControls: OrbitControls;
  camera: THREE.PerspectiveCamera;

  toggleRun: boolean = false;
  currentAction: string;

  walkDirection = new THREE.Vector3();
  rotateAngle = new THREE.Vector3(0, 1, 0);
  rotateQuarternion: THREE.Quaternion = new THREE.Quaternion();
  cameraTarget = new THREE.Vector3();

  fadeDuration: number = 0.2;
  runVelocity = 5;
  walkVelocity = 2;

  DIRECTIONS = ['w', 'a', 's', 'd'];

  constructor(params: {
    model: THREE.Group,
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

  update(delta: number, keyPressed: any) {
    const directionPressed = this.DIRECTIONS.some(key => keyPressed[key] === true);

    let play = ''
    if (directionPressed && this.toggleRun) {
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

    if (this.currentAction == 'Run' || this.currentAction == 'Walk') {
      // calculate towards camera direction
      var angleYCameraDirection = Math.atan2(
              (this.camera.position.x - this.model.position.x), 
              (this.camera.position.z - this.model.position.z))
      // diagonal movement angle offset
      var directionOffset = this.directionOffset(keyPressed);

      // rotate model
      this.rotateQuarternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset);
      this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

      // calculate direction
      this.camera.getWorldDirection(this.walkDirection);
      this.walkDirection.y = 0;
      this.walkDirection.normalize();
      this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

      // run/walk velocity
      const velocity = this.currentAction == 'Run' ? this.runVelocity : this.walkVelocity;

      // move model & camera
      const moveX = this.walkDirection.x * velocity * delta;
      const moveZ = this.walkDirection.z * velocity * delta;
      this.model.position.x += moveX;
      this.model.position.z += moveZ;
      this.updateCameraTarget(moveX, moveZ);
    }
  }

  private updateCameraTarget(moveX: number, moveZ: number) {
    // move camera
    this.camera.position.x += moveX;
    this.camera.position.z += moveZ;

    // update camera target
    this.cameraTarget.x = this.model.position.x;
    this.cameraTarget.y = this.model.position.y;
    this.cameraTarget.z = this.model.position.z;
    this.orbitControls.target = this.cameraTarget;
  }

  private directionOffset(keysPressed: any) {
    let directionOffset = 0 // w

    if (keysPressed['w']) {
        if (keysPressed['a']) {
            directionOffset = Math.PI / 4 // w+a
        } else if (keysPressed['d']) {
            directionOffset = - Math.PI / 4 // w+d
        }
    } else if (keysPressed['s']) {
        if (keysPressed['a']) {
            directionOffset = Math.PI / 4 + Math.PI / 2 // s+a
        } else if (keysPressed['d']) {
            directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d
        } else {
            directionOffset = Math.PI // s
        }
    } else if (keysPressed['a']) {
        directionOffset = Math.PI / 2 // a
    } else if (keysPressed['d']) {
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
  const millisecondRef = useRef<number>(0);
  const boxThreeCannonObjectsRef = useRef<Set<ThreeCannonObject>>(new Set<ThreeCannonObject>());
  const allObjectsRef = useRef<Set<THREE.Object3D<any>>>(new Set<THREE.Object3D<any>>());

  const characterControlsRef = useRef<CharacterControls>();
  const keyPressedRef = useRef<{ [key: string]: boolean }>({});
  // const keyDisplayQueue = useRef<KeyDisplay>();

  useEffect(() => {
    init();
  }, []);

  useFromEvent(typeof document !== 'undefined' ? document : undefined, 'keydown', (event: KeyboardEvent) => {
    const key = event.key;
    if (key === 'Shift' && characterControlsRef.current) {
      characterControlsRef.current?.switchRunToggle(true);
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
    // renderer.setSize(800, 500); 
    globalRendererRef.current = renderer;

    // cannon
    const world = new CANNON.World();
    world.gravity.set(0, -15.82, 0);

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
      world,
      scene,
      threeObject: () => {
        const plane = new THREE.Mesh(
          new THREE.BoxGeometry(400, 1, 400), // geometry
          new THREE.MeshStandardMaterial({ color: 0xcccccc }), // material
        );
        plane.position.set(0, -1, 0);
        plane.castShadow = true;
        plane.receiveShadow = true;
        allObjectsRef.current.add(plane);
        console.log('plane', plane);
        return plane;
      },
      cannonObject: (object) => {
        const floorBox = new CANNON.Box(new CANNON.Vec3(400, 1, 400));
        const floorBody = new CANNON.Body({
          mass: 0,
          position: new CANNON.Vec3(object.position.x, object.position.y, object.position.z),
          shape: floorBox,
        });
        return floorBody;
      },
    });

    const orbitControls = new OrbitControls(camera, canvas);
    orbitControls.enableDamping = true;
    orbitControls.enableZoom = false;
    orbitControls.enablePan = false;
    orbitControls.update(); // render 시에도 호출해주어야 함.
    orbitControls.keys = {
      LEFT: 'ArrowLeft', //left arrow
      UP: 'ArrowUp', // up arrow
      RIGHT: 'ArrowRight', // right arrow
      BOTTOM: 'ArrowDown' // down arrow
    };

    // character add
    // const boxThreeCannonObject = new ThreeCannonObject({
    //   world,
    //   scene,
    //   threeObject: () => {
    //     const box = new THREE.Mesh(
    //       new THREE.BoxGeometry(5, 5, 5), // geometry
    //       new THREE.MeshStandardMaterial({ color: 0xff0000 }), // material
    //     );
    //     box.position.set(
    //       // getRandomNumber({ min: -10, max: 10 }),
    //       0,
    //       // getRandomNumber({ min: 40, max: 80 }),
    //       15,
    //       0
    //       // getRandomNumber({ min: -10, max: 10 }),
    //     );
    //     box.castShadow = true;
    //     box.receiveShadow = true;
    //     allObjectsRef.current.add(box);
    //     return box;
    //   },
    //   cannonObject: (object) => {
    //     const cannonBox = new CANNON.Box(new CANNON.Vec3(2.5, 2.5, 2.5));
    //     // const cannonBox = new CANNON.Sphere(3);
    //     const cannonBoxBody = new CANNON.Body({
    //       mass: 1,
    //       position: new CANNON.Vec3(object.position.x, object.position.y, object.position.z),
    //       shape: cannonBox,
    //     });
    //     return cannonBoxBody;
    //   },
    // });
    // boxThreeCannonObjectsRef.current.add(boxThreeCannonObject);
    const gltf = await new Promise<GLTF>(function(resolve, reject) {
      new GLTFLoader().load('/threejs-objects/Soldier.glb', function (gltf) {
        resolve(gltf);
      });
    }); 

    // new GLTFLoader().load('/threejs-objects/Soldier.glb', function (gltf) {
    const model = gltf.scene;
    model.traverse(function (object: any) {
      if (object.isMesh) {
        object.castShadow = true;
      }
      scene.add(model);
    });

    const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap: Map<string, THREE.AnimationAction> = new Map();
    gltfAnimations.filter(a => a.name !== 'TPose').forEach((a: THREE.AnimationClip) => {
      animationsMap.set(a.name, mixer.clipAction(a));
    });

    characterControlsRef.current = new CharacterControls({
      model,
      mixer,
      animationsMap,
      orbitControls,
      camera,
      currentAction: 'Idle',
    });
    // });

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
      planeThreeCannonObject.update();
      boxThreeCannonObjectsRef.current.forEach((boxThreeCannonObject) => {
        boxThreeCannonObject.update();
      });
    };

    // anime({
    //   targets: [boxThreeCannonObject.threeObject.position],
    //   y: boxThreeCannonObject.threeObject.position.y - 150,
    //   duration: 4000,
    //   loop: false,
    // });

    const render = () => {
      let mixerUpdateDelta = clock.getDelta();

      requestAnimationFrame(render);
      tick();
      if (characterControlsRef.current !== undefined) {
        characterControlsRef.current.update(mixerUpdateDelta, keyPressedRef.current);
      }
      orbitControls.update();
      // controls.update();
      renderer.clear();
      millisecondRef.current++;
      renderer.render(scene, camera);
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