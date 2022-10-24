import Head from "next/head";
import { useEffect, useRef } from "react";
import CommonLayout from "../../../components/layouts/common-layout/common-layout.component";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IThreejsCanvasBox } from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.interface";
import ThreejsCanvasBox from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.component";
import useFromEvent from "../../../hooks/use-from-event/use-from-event";
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { CharacterControlsAmmo, ThreeAmmoObjectManager } from "../../../librarys/three-ammo-object-util/three-ammo-object-util.library";

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
  const allObjectsRef = useRef<Set<THREE.Object3D<any>>>(new Set<THREE.Object3D<any>>());

  const characterControlsRef = useRef<CharacterControlsAmmo>();
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

    characterControlsRef.current = new CharacterControlsAmmo({
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