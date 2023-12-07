"use client"

import { useEffect, useRef, useState } from "react";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IThreejsCanvasBox } from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.interface";
import ThreejsCanvasBox from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.component";
import { getRandomNumber } from "../../../librarys/random-util/random-util.library";
import { ThreeAmmoObjectManager } from "../../../librarys/three-ammo-object-util/three-ammo-object-util.library";
import Script from "next/script";

export default function Page() {
  const threejsCanvasBoxRef = useRef<IThreejsCanvasBox.RefObject>(null);

  const globalRendererRef = useRef<THREE.WebGLRenderer>();
  const globalCamerasRef = useRef<THREE.PerspectiveCamera[]>([]);
  const globalScenesRef = useRef<THREE.Scene[]>([]);
  const allObjectsRef = useRef<Set<THREE.Object3D<any>>>(new Set<THREE.Object3D<any>>());

  const [isAmmoLoaded, setIsAmmoLoaded] = useState(false);

  useEffect(() => {
    if (isAmmoLoaded === false) return;
    console.log('@window.Ammo', window.Ammo);
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAmmoLoaded]);

  useEffect(() => {
    setIsAmmoLoaded(window.Ammo !== undefined);
  }, []);

  function setupPhysicsWorld() {
    console.log('setupPhysicsWorld');
    const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    const overlappingPairCache = new Ammo.btDbvtBroadphase() as any;
    const solver = new Ammo.btSequentialImpulseConstraintSolver();

    const physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));
    return physicsWorld;
  }

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

    // ammo.js world
    if (typeof Ammo === 'function') {
      await Ammo();
    }
    const physicsWorld = setupPhysicsWorld();
    console.log('physicsWorld', physicsWorld);

    // camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    globalCamerasRef.current.push(camera);
    camera.position.set(0, 2, 5);
    camera.setFocalLength(20);

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
    }

    // add ball
    {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          console.log('i', i);

          const random = {
            pos: {
              x: getRandomNumber({ min: -1, max: 1 }),
              y: getRandomNumber({ min: 1, max: 1 }),
              z: getRandomNumber({ min: -1, max: 1 }),
            },
          };

          const ballObject = threeAmmoObjectManager.add({
            name: 'ball' + i,
            objectOptions: {
              pos: random.pos,
              radius: 0.1,
              quat: { x: 0, y: 0, z: 0, w: 1 },
              mass: 1,
            },
            threeJsObject(objectOptions) {
              const ball = new THREE.Mesh(new THREE.SphereGeometry(objectOptions.radius ?? 1), new THREE.MeshPhongMaterial({color: 0xff0505}));
              ball.position.set(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z);
              ball.castShadow = true;
              ball.receiveShadow = true;
              return ball;
            },
            ammoJsObject(objectOptions, threeJsObject) {
              const transform = new Ammo.btTransform();
              transform.setIdentity();
              transform.setOrigin(new Ammo.btVector3(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z));
              transform.setRotation(new Ammo.btQuaternion( objectOptions.quat.x, objectOptions.quat.y, objectOptions.quat.z, objectOptions.quat.w));
              const motionState = new Ammo.btDefaultMotionState(transform);

              const colShape = new Ammo.btSphereShape(objectOptions.radius ?? 1);
              colShape.setMargin(0.05);

              const localInertia = new Ammo.btVector3(0, 0, 0);
              colShape.calculateLocalInertia(objectOptions.mass, localInertia);

              const rbInfo = new Ammo.btRigidBodyConstructionInfo(objectOptions.mass, motionState, colShape, localInertia);
              const body = new Ammo.btRigidBody(rbInfo);
              return body;
            },
          });
        }, i * 300);
      }
    }

    // orbitControls
    const orbitControls = new OrbitControls(camera, canvas);
    orbitControls.enableDamping = true;
    orbitControls.enableZoom = false;
    orbitControls.enablePan = false;
    orbitControls.update(); // render 시에도 호출해주어야 함.

    // helpers
    const axesHelper = new THREE.AxesHelper(150);
    scene.add(axesHelper);

    // render
    const clock = new THREE.Clock();

    const render = () => {
      let deltaTime = clock.getDelta();
      renderer.clear();
      orbitControls.update();
      renderer.render(scene, camera);
      threeAmmoObjectManager.update( deltaTime );
      requestAnimationFrame(render);
    };
    render();
  }

  return (
    <>
      <Script src="/js/ammo.js" onLoad={() => setIsAmmoLoaded(true)}></Script>
      <ThreejsCanvasBox
        __style={{ width: '80%', height: '80%' }}
        ref={threejsCanvasBoxRef}
        __rendererRef={globalRendererRef}
        __camerasRef={globalCamerasRef}
        __scenesRef={globalScenesRef} />
    </>
  );
}