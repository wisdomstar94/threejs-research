import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import ThreejsCanvasBox from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.component";
import CommonLayout from "../../../components/layouts/common-layout/common-layout.component";
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { ThreeCannonObject } from "../../../librarys/three-object-util/three-object-util.library";
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IThreejsCanvasBox } from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.interface";
import useAddEventListener from "../../../hooks/use-add-event-listener/use-add-event-listener.hook";
import useAddResizeEventListener from "../../../hooks/use-add-resize-event-listener/use-add-resize-event-listener.hook";

const IndexPage = () => {
  return (
    <>
      <Head>
        <title>threejs-001-bloom</title>
        <meta name="description" content="threejs-001-bloom page!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <PageContents />
    </>
  );
};

const PageContents = () => {
  const threejsCanvasBoxRef = useRef<IThreejsCanvasBox.RefObject>(null);

  const globalRendererRef = useRef<THREE.WebGLRenderer>();
  const globalCamerasRef = useRef<THREE.PerspectiveCamera[]>([]);
  const globalSceneRef = useRef<THREE.Scene>();
  const globalBloomComposerRef = useRef<EffectComposer>();
  const globalFinalComposerRef = useRef<EffectComposer>();
  const millisecondRef = useRef<number>(0);
  const boxThreeCannonObjectsRef = useRef<Set<ThreeCannonObject>>(new Set<ThreeCannonObject>());
  const allObjectsRef = useRef<Set<THREE.Object3D<any>>>(new Set<THREE.Object3D<any>>());

  useEffect(() => {
    const canvas = threejsCanvasBoxRef.current?.getCanvas();
    if (canvas === null || canvas === undefined) {
      return;
    }

    const ENTIRE_SCENE = 0, BLOOM_SCENE = 1;
    const bloomLayer = new THREE.Layers();
    bloomLayer.set( BLOOM_SCENE );
    const darkMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );
    const materials: any = {};

    // renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas: canvas });
    renderer.autoClear = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = Math.pow(0.9, 4.0);
    renderer.setClearColor(0xffffff, 0);
    renderer.setSize(800, 500);
    globalRendererRef.current = renderer;
    // setGlobalRenderer(renderer);

    // cannon
    const world = new CANNON.World();
    world.gravity.set(0, -15.82, 0);

    // camera
    const camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
    camera.position.set(10, 10, 10);
    camera.setFocalLength(20);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    globalCamerasRef.current.push(camera);

    // scene
    globalSceneRef.current = new THREE.Scene();
    globalSceneRef.current.background = null;

    // light
    const worldLight = new THREE.AmbientLight(0xffffff, 1);
    worldLight.layers.enableAll();
    globalSceneRef.current.add(worldLight);

    const spotLight = new THREE.SpotLight(0xFFFFFF, 2);
    spotLight.position.set(50, 50, 50);
    spotLight.castShadow = true;
    spotLight.angle = 0.7;
    const obj = new THREE.Object3D();
    obj.position.set(0, 0, 0);
    globalSceneRef.current.add(obj);
    spotLight.target = obj;
    spotLight.shadow.radius = 4;
    spotLight.shadow.blurSamples = 10;
    spotLight.shadow.bias = -0.00001;
    spotLight.shadow.mapSize.width = 1024 * 10;
    spotLight.shadow.mapSize.height = 1024 * 10;
    spotLight.layers.enableAll();
    globalSceneRef.current.add(spotLight);
    allObjectsRef.current.add(spotLight);

    // plane add
    const planeThreeCannonObject = new ThreeCannonObject({
      world: world,
      scene: globalSceneRef.current,
      threeObject: () => {
        const plane = new THREE.Mesh(
          new THREE.BoxGeometry(400, 2, 400), // geometry
          new THREE.MeshStandardMaterial({
            color: 0xcccccc,
          }), // material
        );
        plane.position.set(0, -1, 0);
        plane.castShadow = true;
        plane.receiveShadow = true;
        allObjectsRef.current.add(plane);
        return plane;
      },
      cannonObject: (object) => {
        const floorBox = new CANNON.Box(new CANNON.Vec3(400 / 2, 2 / 2, 400 / 2));
        const floorBody = new CANNON.Body({
          mass: 0,
          position: new CANNON.Vec3(object.position.x / 2, object.position.y / 2, object.position.z / 2),
          shape: floorBox,
        });
        return floorBody;
      },
    });

    // box add
    const boxItems = new Set<{ position: { x: number; y: number; z: number; }; size: { x: number; y: number; z: number; }; isBloom: boolean;}>();
    boxItems.add({ position: { x: 1, y: 10, z: -3 }, size: { x: 5, y: 5, z: 2 }, isBloom: true, });
    boxItems.add({ position: { x: 1, y: 10, z: -7 }, size: { x: 5, y: 5, z: 2 }, isBloom: false, });
    boxItems.forEach((item) => {
      const boxThreeCannonObject = new ThreeCannonObject({
        world: world,
        scene: globalSceneRef.current,
        threeObject: () => {
          const color = 0xff0000;

          let material = new THREE.MeshStandardMaterial({
            color: color,
            opacity: 1,
            transparent: true,
          });

          const box = new THREE.Mesh(
            new THREE.BoxGeometry(item.size.x, item.size.y, item.size.z), // geometry
            material,
          );

          box.castShadow = true;
          box.receiveShadow = true;
          if (item.isBloom) {
            box.layers.enable(BLOOM_SCENE);
          }
          box.position.set(
            item.position.x, item.position.y, item.position.z
          );

          allObjectsRef.current.add(box);
          return box;
        },
        cannonObject: (object) => {
          const cannonBox = new CANNON.Box(new CANNON.Vec3(item.size.x / 2, item.size.y / 2, item.size.z / 2));
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
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.update(); // render 시에도 호출해주어야 함.

    const axesHelper = new THREE.AxesHelper(150);
    axesHelper.layers.enable(ENTIRE_SCENE);
    globalSceneRef.current.add(axesHelper);

    const clock = new THREE.Clock();
    let oldElapsedTime = 0;

    // pass setting
    const renderPass = new RenderPass(globalSceneRef.current, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(
        renderer.domElement?.clientWidth,
        renderer.domElement?.clientHeight
      ),
      1.5,
      0.4,
      0.85
    );
    bloomPass.threshold = 0;
    bloomPass.strength = 1.5;
    bloomPass.radius = 0;

    globalBloomComposerRef.current = new EffectComposer( renderer );
    globalBloomComposerRef.current.renderToScreen = false;
    globalBloomComposerRef.current.addPass( renderPass );
    globalBloomComposerRef.current.addPass( bloomPass );

    globalFinalComposerRef.current = new EffectComposer( renderer );

    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial( {
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: globalBloomComposerRef.current.renderTarget2.texture }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
          }
        `,
        fragmentShader: `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() {
            gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
          }
        `,
        defines: {}
      } ), 'baseTexture'
    );
    finalPass.needsSwap = true;

    globalFinalComposerRef.current.addPass( renderPass );
    globalFinalComposerRef.current.addPass( finalPass );

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

    const darkenNonBloomed = (obj: any) => {
      // console.log(`bloomLayer.test( obj.layers )`, bloomLayer.test( obj.layers ));
      if ( obj.isMesh && bloomLayer.test( obj.layers ) === false ) {
        materials[ obj.uuid ] = obj.material;
        obj.material = darkMaterial;
      }
    }

    const restoreMaterial = (obj: any) => {
      if ( materials[ obj.uuid ] ) {
        obj.material = materials[ obj.uuid ];
        delete materials[ obj.uuid ];
      }
    }

    const render = () => {
      requestAnimationFrame(render);
      tick();

      renderer.clear();
      millisecondRef.current++;

      globalSceneRef.current?.traverse( darkenNonBloomed ); // black 일 때는 bloom 효과가 적용되지 않는 점을 이용
      globalBloomComposerRef.current?.render();
      globalSceneRef.current?.traverse( restoreMaterial ); // black 으로 바꿧던 material 을 다시 원상 복구
      globalFinalComposerRef.current?.render();
    };
    requestAnimationFrame(render);
  }, []);

  return (
    <>
      <CommonLayout>
        <ThreejsCanvasBox 
          ref={threejsCanvasBoxRef}
          __rendererRef={globalRendererRef}
          __camerasRef={globalCamerasRef} />
      </CommonLayout>
    </>
  );
};

export default IndexPage;