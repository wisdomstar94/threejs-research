"use client"

import { useEffect, useRef } from "react";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as CANNON from 'cannon-es';
import { IThreejsCanvasBox } from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.interface";
import ThreejsCanvasBox from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.component";
import { getRandomNumber } from "../../../librarys/random-util/random-util.library";
import { ThreeCannonObjectManager } from "../../../librarys/three-cannon-object-util/three-cannon-object-util.library";

export default function Page() {
  const threejsCanvasBoxRef = useRef<IThreejsCanvasBox.RefObject>(null);

  const globalRendererRef = useRef<THREE.WebGLRenderer>();
  const globalCamerasRef = useRef<THREE.PerspectiveCamera[]>([]);
  const globalScenesRef = useRef<THREE.Scene[]>([]);

  useEffect(() => {
    const canvas = threejsCanvasBoxRef.current?.getCanvas();
    if (canvas === null || canvas === undefined) {
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
    camera.position.set(100, 40, 100);
    camera.setFocalLength(20);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // scene
    const scene = new THREE.Scene();
    globalScenesRef.current.push(scene);

    // threeCannonObjectManager
    const threeCannonObjectManager = new ThreeCannonObjectManager({
      world,
      scene,
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

    // plane add
    const planeThreeCannonObject = threeCannonObjectManager.add({
      name: 'plane',
      objectOptions: {
        pos: { x: 0, y: -1, z: 0 },
        size: { x: 400, y: 1, z: 400 },
        quat: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0,
      },
      threeJsObject: (objectOptions) => {
        const plane = new THREE.Mesh(
          new THREE.BoxGeometry(objectOptions.size?.x ?? 400, objectOptions.size?.y ?? 1, objectOptions.size?.z ?? 400), // geometry
          new THREE.MeshStandardMaterial({ color: 0xcccccc }), // material
        );
        plane.position.set(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z);
        plane.castShadow = true;
        plane.receiveShadow = true;
        return plane;
      },
      cannonJsObject: (objectOptions, threeJsObject) => {
        const floorBox = new CANNON.Box(new CANNON.Vec3((objectOptions.size?.x ?? 400) / 2, (objectOptions.size?.y ?? 1) / 2, (objectOptions.size?.z ?? 400) / 2));
        const floorBody = new CANNON.Body({
          mass: objectOptions.mass,
          position: new CANNON.Vec3(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z),
          shape: floorBox,
        });
        return floorBody;
      },
    });

    for (let i = 0; i < 50; i++) {
      // box add
      setTimeout(() => {
        const boxThreeCannonObject = threeCannonObjectManager.add({
          name: 'box' + i,
          objectOptions: {
            pos: { x: getRandomNumber({ min: -10, max: 10 }), y: 50, z: getRandomNumber({ min: -10, max: 10 }) },
            size: { x: 5, y: 5, z: 5 },
            quat: { x: 0, y: 0, z: 0, w: 1 },
            mass: 1,
          },
          threeJsObject: (objectOptions) => {
            const box = new THREE.Mesh(
              new THREE.BoxGeometry(objectOptions.size?.x ?? 5, objectOptions.size?.y ?? 5, objectOptions.size?.z ?? 5), // geometry
              new THREE.MeshStandardMaterial({ color: 0xff0000 }), // material
            );
            box.position.set(
              objectOptions.pos.x,
              objectOptions.pos.y,
              objectOptions.pos.z,
            );
            box.castShadow = true;
            box.receiveShadow = true;
            return box;
          },
          cannonJsObject: (objectOptions, threeJsObject) => {
            const cannonBox = new CANNON.Box(new CANNON.Vec3((objectOptions.size?.x ?? 5) / 2, (objectOptions.size?.y ?? 5) / 2, (objectOptions.size?.z ?? 5) / 2));
            // const cannonBox = new CANNON.Sphere(3);
            const cannonBoxBody = new CANNON.Body({
              mass: objectOptions.mass,
              position: new CANNON.Vec3(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z),
              shape: cannonBox,
            });
            return cannonBoxBody;
          },
        });
      }, 1000 * i);
    }

    // helpers
    const orbitControls = new OrbitControls(camera, canvas);
    orbitControls.update(); // render 시에도 호출해주어야 함.

    const axesHelper = new THREE.AxesHelper(150);
    scene.add(axesHelper);

    const clock = new THREE.Clock();

    // render
    const render = () => {
      renderer.clear();
      let deltaTime = clock.getDelta();
      threeCannonObjectManager.update(deltaTime);
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };
    render();
  }, []);

  return (
    <>
      <ThreejsCanvasBox
        ref={threejsCanvasBoxRef}
        __rendererRef={globalRendererRef}
        __camerasRef={globalCamerasRef}
        __scenesRef={globalScenesRef} />
    </>
  );
}