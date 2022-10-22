import Head from "next/head";
import { useEffect, useRef } from "react";
import ThreejsCanvasBox from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.component";
import { IThreejsCanvasBox } from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.interface";
import CommonLayout from "../../../components/layouts/common-layout/common-layout.component";
import { ThreeCannonObject } from "../../../librarys/three-object-util/three-object-util.library";
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const IndexPage = () => {
  return (
    <>
      <Head>
        <title>threejs-003-glass-material</title>
        <meta name="description" content="threejs-003-glass-material page!" />
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
    camera.position.set(20, 10, 20);
    camera.setFocalLength(20);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    globalCamerasRef.current.push(camera);

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
          new THREE.BoxGeometry(400, 2, 400), // geometry
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
        const floorBox = new CANNON.Box(new CANNON.Vec3(400 / 2, 2 / 2, 400 / 2));
        // const floorBox = new CANNON.Plane();
        const floorBody = new CANNON.Body({
          mass: 0,
          position: new CANNON.Vec3(object.position.x / 2, object.position.y / 2, object.position.z / 2),
          shape: floorBox,
        });
        return floorBody;
      },
    });

    // box add
    const boxItems = new Set<{ position: { x: number; y: number; z: number; }; size: { x: number; y: number; z: number; }, isGlass: boolean; }>();
    boxItems.add({ position: { x: 0, y: 20, z: 3 }, size: { x: 5, y: 5, z: 1 }, isGlass: true });
    boxItems.add({ position: { x: 1, y: 20, z: -3 }, size: { x: 5, y: 5, z: 2 }, isGlass: false });
    boxItems.forEach(item => {
      const boxThreeCannonObject = new ThreeCannonObject({
        world,
        scene,
        threeObject: () => {
          let material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
          if (item.isGlass) {
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.wrapT = THREE.RepeatWrapping;
            texture.wrapS = THREE.RepeatWrapping;
            texture.repeat.set( 1, 3.5 );

            material = new THREE.MeshPhysicalMaterial({
              color: 0xffffff,
              metalness: 0,
              roughness: 0,
              transmission: 1,
              transparent: true,
              alphaMap: texture,
              envMapIntensity: 1,
              ior: 1.5,
              specularIntensity: 1,
				      specularColor: new THREE.Color(0xffffff),
            });
          }

          const box = new THREE.Mesh(
            new THREE.BoxGeometry(item.size.x, item.size.y, item.size.z), // geometry
            material,
          );
          box.position.set(
            item.position.x, item.position.y, item.position.z
          );
          box.castShadow = true;
          box.receiveShadow = true;
          allObjectsRef.current.add(box);
          return box;
        },
        cannonObject: (object) => {
          const cannonBox = new CANNON.Box(new CANNON.Vec3(item.size.x / 2, item.size.y / 2, item.size.z / 2));
          // const cannonBox = new CANNON.Sphere(3);
          const cannonBoxBody = new CANNON.Body({
            mass: 1,
            position: new CANNON.Vec3(object.position.x / 2, object.position.y / 2, object.position.z / 2),
            shape: cannonBox,
          });
          return cannonBoxBody;
        },
      });
      boxThreeCannonObjectsRef.current.add(boxThreeCannonObject);
    });

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

      planeThreeCannonObject.update();
      boxThreeCannonObjectsRef.current.forEach((boxThreeCannonObject) => {
        boxThreeCannonObject.update();
      });
    };

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