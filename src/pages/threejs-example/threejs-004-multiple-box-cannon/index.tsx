import Head from "next/head";
import { useEffect, useRef } from "react";
import CommonLayout from "../../../components/layouts/common-layout/common-layout.component";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as CANNON from 'cannon-es';
import { IThreejsCanvasBox } from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.interface";
import ThreejsCanvasBox from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.component";
import { ThreeCannonObject } from "../../../librarys/three-object-util/three-object-util.library";
import { getRandomNumber } from "../../../librarys/random-util/random-util.library";

const IndexPage = () => {
  return (
    <>
      <Head>
        <title>threejs-004-multiple-box-cannon</title>
        <meta name="description" content="threejs-004-multiple-box-cannon page!" />
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

    for (let i = 0; i < 50; i++) {
      // box add
      setTimeout(() => {
        const boxThreeCannonObject = new ThreeCannonObject({
          name: 'boxes',
          world,
          scene,
          threeObject: () => {
            const box = new THREE.Mesh(
              new THREE.BoxGeometry(5, 5, 5), // geometry
              new THREE.MeshStandardMaterial({ color: 0xff0000 }), // material
            );
            box.position.set(
              getRandomNumber({ min: -10, max: 10 }),
              // getRandomNumber({ min: 40, max: 80 }),
              50,
              getRandomNumber({ min: -10, max: 10 }),
            );
            box.castShadow = true;
            box.receiveShadow = true;
            allObjectsRef.current.add(box);
            return box;
          },
          cannonObject: (object) => {
            const cannonBox = new CANNON.Box(new CANNON.Vec3(2.5, 2.5, 2.5));
            // const cannonBox = new CANNON.Sphere(3);
            const cannonBoxBody = new CANNON.Body({
              mass: 1,
              position: new CANNON.Vec3(object.position.x, object.position.y, object.position.z),
              shape: cannonBox,
            });
            return cannonBoxBody;
          },
        });
        boxThreeCannonObjectsRef.current.add(boxThreeCannonObject);
      }, 1000 * i);
    }

    // helpers
    const orbitControls = new OrbitControls(camera, canvas);
    orbitControls.update(); // render 시에도 호출해주어야 함.

    const axesHelper = new THREE.AxesHelper(150);
    scene.add(axesHelper);

    const clock = new THREE.Clock();
    let oldElapsedTime = 0;

    // render
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
      requestAnimationFrame(render);
      tick();
      renderer.clear();
      millisecondRef.current++;
      renderer.render(scene, camera);
    };
    requestAnimationFrame(render);
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
};  

export default IndexPage;