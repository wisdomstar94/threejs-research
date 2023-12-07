"use client"

import { useEffect, useRef } from "react";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as CANNON from 'cannon-es';
import { IThreejsCanvasBox } from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.interface";
import ThreejsCanvasBox from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.component";
import useFromEvent from "../../../hooks/use-from-event/use-from-event";
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { CharacterControlsCannon, ThreeCannonObjectManager } from "../../../librarys/three-cannon-object-util/three-cannon-object-util.library";

export default function Page() {
  const threejsCanvasBoxRef = useRef<IThreejsCanvasBox.RefObject>(null);

  const globalRendererRef = useRef<THREE.WebGLRenderer>();
  const globalCamerasRef = useRef<THREE.PerspectiveCamera[]>([]);
  const globalScenesRef = useRef<THREE.Scene[]>([]);
  // const boxThreeCannonObjectsRef = useRef<Set<ThreeCannonObject>>(new Set<ThreeCannonObject>());
  // const allObjectsRef = useRef<Set<THREE.Object3D<any>>>(new Set<THREE.Object3D<any>>());

  const characterControlsRef = useRef<CharacterControlsCannon>();
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
      if (characterControlsRef.current !== undefined) {
        characterControlsRef.current.model.cannonJsObject.velocity.y = 6;
      }
      // const characterThreeCannonObject = Array.from(boxThreeCannonObjectsRef.current).find(x => x.name === 'character');
      // if (characterThreeCannonObject !== undefined) {
      //   characterThreeCannonObject.cannonObject.velocity.y = 6;
      // }

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

    // threeCannonObjectManager
    const threeCannonObjectManager = new ThreeCannonObjectManager({
      world: world,
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
    // allObjectsRef.current.add(spotLight);

    // plane add
    const planeThreeCannonObject = threeCannonObjectManager.add({
      name: 'plane',
      objectOptions: {
        pos: { x: 0, y: -2.52, z: 0 },
        quat: { x: 0, y: 0, z: 0, w: 1 },
        size: { x: 10, y: 5, z: 10 },
        mass: 0,
      },
      world,
      scene,
      threeJsObject: (objectOptions) => {
        const plane = new THREE.Mesh(
          new THREE.BoxGeometry(objectOptions.size?.x ?? 1, objectOptions.size?.y ?? 1, objectOptions.size?.z ?? 1), // geometry
          new THREE.MeshStandardMaterial({ color: 0xcccccc }), // material
        );
        plane.position.set(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z);
        plane.castShadow = true;
        plane.receiveShadow = true;
        // allObjectsRef.current.add(plane);
        return plane;
      },
      cannonJsObject: (objectOptions, threeJsObject) => {
        const floorBox = new CANNON.Box(new CANNON.Vec3((objectOptions.size?.x ?? 1) / 2, (objectOptions.size?.y ?? 1) / 2, (objectOptions.size?.z ?? 1) / 2));
        const floorBody = new CANNON.Body({
          mass: objectOptions.mass,
          position: new CANNON.Vec3(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z),
          shape: floorBox,
        });
        // floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,0,0), -1);
        floorBody.updateMassProperties();
        return floorBody;
      },
    });

    const leftPlaneThreeCannonObject = threeCannonObjectManager.add({
      name: 'left-plane',
      objectOptions: {
        pos: { x: -5, y: -1, z: 0 },
        quat: { x: 0, y: 0, z: 0, w: 1 },
        size: { x: 1, y: 3, z: 10 },
        mass: 0,
      },
      world,
      scene,
      threeJsObject: (objectOptions) => {
        const plane = new THREE.Mesh(
          new THREE.BoxGeometry(objectOptions.size?.x ?? 1, objectOptions.size?.y ?? 1, objectOptions.size?.z ?? 1), // geometry
          new THREE.MeshStandardMaterial({ color: 0xcccccc }), // material
        );
        plane.position.set(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z);
        plane.castShadow = true;
        plane.receiveShadow = true;
        // allObjectsRef.current.add(plane);
        return plane;
      },
      cannonJsObject: (objectOptions, threeJsObject) => {
        const floorBox = new CANNON.Box(new CANNON.Vec3((objectOptions.size?.x ?? 1) / 2, (objectOptions.size?.y ?? 1) / 2, (objectOptions.size?.z ?? 1) / 2));
        const floorBody = new CANNON.Body({
          mass: objectOptions.mass,
          position: new CANNON.Vec3(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z),
          fixedRotation: true,
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

    const characterThreeCannonObject = threeCannonObjectManager.add({
      name: 'character',
      objectOptions: {
        pos: { x: 0, y: 2, z: 0 },
        quat: { x: 0, y: 0, z: 0, w: 1 },
        size: { x: 1, y: 3, z: 10 },
        mass: 1,
      },
      world,
      scene,
      threeJsObject: (objectOptions) => {
        // allObjectsRef.current.add(model);
        model.position.y = objectOptions.pos.y;
        return model;
      },
      cannonJsObject: (objectOptions, threeJsObject) => {
        const cannonBox = new CANNON.Box(new CANNON.Vec3(0.025, 0.025, 0.025));
        // const cannonBox = new CANNON.Sphere(3);
        const cannonBoxBody = new CANNON.Body({
          mass: objectOptions.mass,
          position: new CANNON.Vec3(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z),
          shape: cannonBox,
        });
        return cannonBoxBody;
      },
    });
    // boxThreeCannonObjectsRef.current.add(characterThreeCannonObject);

    const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap: Map<string, THREE.AnimationAction> = new Map();
    gltfAnimations.filter(a => a.name !== '').forEach((a: THREE.AnimationClip) => {
      animationsMap.set(a.name, mixer.clipAction(a));
    });

    characterControlsRef.current = new CharacterControlsCannon({
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

    // render
    const clock = new THREE.Clock();

    const render = () => {
      let deltaTime = clock.getDelta();
      renderer.clear();
      orbitControls.update();
      threeCannonObjectManager.update(deltaTime);
      if (characterControlsRef.current !== undefined) {
        characterControlsRef.current.update(deltaTime, keyPressedRef.current);
      }
      renderer.render(scene, camera);
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
}