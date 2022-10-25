import Head from "next/head";
import { useEffect, useRef } from "react";
import ThreejsCanvasBox from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.component";
import CommonLayout from "../../../components/layouts/common-layout/common-layout.component";
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IThreejsCanvasBox } from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.interface";
import { ThreeCannonObjectManager } from "../../../librarys/three-cannon-object-util/three-cannon-object-util.library";

const IndexPage = () => {
  return (
    <>
      <Head>
        <title>threejs-001-bloom</title>
        <meta name="description" content="threejs-001-bloom page!" />
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
  const globalBloomComposerRef = useRef<EffectComposer>();
  const globalFinalComposerRef = useRef<EffectComposer>();
  const millisecondRef = useRef<number>(0);

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
    const scene = new THREE.Scene();
    scene.background = null;
    globalScenesRef.current.push(scene);

    // ThreeCannonObjectManager
    const threeCannonObjectManager = new ThreeCannonObjectManager({
      world,
      scene,
    });

    // light
    const worldLight = new THREE.AmbientLight(0xffffff, 1);
    worldLight.layers.enableAll();
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
    spotLight.layers.enableAll();
    scene.add(spotLight);

    // plane add
    const planeThreeCannonObject = threeCannonObjectManager.add({
      name: 'plane',
      objectOptions: {
        pos: { x: 0, y: -1, z: 0 },
        size: { x: 400, y: 2, z: 400 },
        quat: { x: 0, y: 0, z: 0, w: 1 },
        mass: 0,
      },
      world: world,
      scene: scene,
      threeJsObject: (objectOptions) => {
        const plane = new THREE.Mesh(
          new THREE.BoxGeometry(objectOptions.size?.x ?? 1, objectOptions.size?.y ?? 1, objectOptions.size?.z ?? 1), // geometry
          new THREE.MeshStandardMaterial({
            color: 0xcccccc,
          }), // material
        );
        plane.position.set(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z);
        plane.castShadow = true;
        plane.receiveShadow = true;
        return plane;
      },
      cannonJsObject: (objectOptions, threeJsObject) => {
        const floorBox = new CANNON.Box(new CANNON.Vec3((objectOptions.size?.x ?? 1) / 2, (objectOptions.size?.y ?? 1) / 2, (objectOptions.size?.z ?? 1) / 2));
        const floorBody = new CANNON.Body({
          mass: objectOptions.mass,
          position: new CANNON.Vec3(threeJsObject.position.x / 2, threeJsObject.position.y / 2, threeJsObject.position.z / 2),
          shape: floorBox,
        });
        return floorBody;
      },
    });

    // box add
    const boxItems = new Set<{ position: { x: number; y: number; z: number; }; size: { x: number; y: number; z: number; }; isBloom: boolean;}>();
    boxItems.add({ position: { x: 1, y: 10, z: -3 }, size: { x: 5, y: 5, z: 2 }, isBloom: true, });
    boxItems.add({ position: { x: 1, y: 10, z: -7 }, size: { x: 5, y: 5, z: 2 }, isBloom: false, });
    
    Array.from(boxItems).forEach((item, index) => {
      const boxThreeCannonObject = threeCannonObjectManager.add({
        name: 'box' + index,
        objectOptions: {
          pos: item.position,
          quat: { x: 0, y: 0, z: 0, w: 1 },
          size: item.size,
          mass: 1
        },
        world: world,
        scene: scene,
        threeJsObject: (objectOptions) => {
          const color = 0xff0000;

          let material = new THREE.MeshStandardMaterial({
            color: color,
            opacity: 1,
            transparent: true,
          });

          const box = new THREE.Mesh(
            new THREE.BoxGeometry(objectOptions.size?.x ?? 1, objectOptions.size?.y ?? 1, objectOptions.size?.z ?? 1), // geometry
            material,
          );

          box.castShadow = true;
          box.receiveShadow = true;
          if (item.isBloom) {
            box.layers.enable(BLOOM_SCENE);
          }
          box.position.set(
            objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z
          );

          return box;
        },
        cannonJsObject: (objectOptions, threeJsObject) => {
          const cannonBox = new CANNON.Box(new CANNON.Vec3((objectOptions.size?.x ?? 1) / 2, (objectOptions.size?.y ?? 1) / 2, (objectOptions.size?.z ?? 1) / 2));
          const cannonBoxBody = new CANNON.Body({
            mass: 1,
            position: new CANNON.Vec3(objectOptions.pos.x, objectOptions.pos.y, objectOptions.pos.z),
            shape: cannonBox,
          });
          return cannonBoxBody;
        },
      });
    });

    // helpers
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.update(); // render 시에도 호출해주어야 함.

    const axesHelper = new THREE.AxesHelper(150);
    axesHelper.layers.enable(ENTIRE_SCENE);
    scene.add(axesHelper);

    // pass setting
    const renderPass = new RenderPass(scene, camera);

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

    const bloomComposer = new EffectComposer( renderer );
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass( renderPass );
    bloomComposer.addPass( bloomPass );
    globalBloomComposerRef.current = bloomComposer;

    const finalComposer = new EffectComposer( renderer );
    globalFinalComposerRef.current = finalComposer;

    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial( {
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.renderTarget2.texture }
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

    finalComposer.addPass(renderPass);
    finalComposer.addPass(finalPass);

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

    const clock = new THREE.Clock();

    const render = () => {
      let deltaTime = clock.getDelta();
      requestAnimationFrame(render);
      renderer.clear();
      threeCannonObjectManager.update(deltaTime);
      scene.traverse( darkenNonBloomed ); // black 일 때는 bloom 효과가 적용되지 않는 점을 이용
      bloomComposer.render();
      scene.traverse( restoreMaterial ); // black 으로 바꿧던 material 을 다시 원상 복구
      finalComposer.render();
    };
    render();
  }, []);

  return (
    <>
      <ThreejsCanvasBox 
        ref={threejsCanvasBoxRef}
        __scenesRef={globalScenesRef}
        __rendererRef={globalRendererRef}
        __camerasRef={globalCamerasRef} />
    </>
  );
};

export default IndexPage;