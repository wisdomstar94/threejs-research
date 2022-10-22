import Head from "next/head";
import { useCallback, useEffect, useRef } from "react";
import ThreejsCanvasBox from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.component";
import CommonLayout from "../../../components/layouts/common-layout/common-layout.component";
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { getObjectFromMouseEvent, ThreeCannonObject } from "../../../librarys/three-object-util/three-object-util.library";
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IThreejsCanvasBox } from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.interface";
import { fromEvent, pairwise, startWith, Subscription } from 'rxjs';

interface BoxInterfacae {
  name: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  size: {
    x: number;
    y: number;
    z: number;
  };
  isBloom: boolean;
  color: number;
}


const IndexPage = () => {
  return (
    <>
      <Head>
        <title>threejs-002-bloom-selective</title>
        <meta name="description" content="threejs-002-bloom-selective page!" />
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
  const globalSceneRef = useRef<THREE.Scene>();
  const globalBloomComposerRef = useRef<EffectComposer>();
  const globalFinalComposerRef = useRef<EffectComposer>();
  const millisecondRef = useRef<number>(0);
  const boxThreeCannonObjectsRef = useRef<Set<ThreeCannonObject>>(new Set<ThreeCannonObject>());
  const allObjectsRef = useRef<Set<THREE.Object3D<any>>>(new Set<THREE.Object3D<any>>());
  const subscriptionsRef = useRef<Set<Subscription>>(new Set());

  useEffect(() => {
    const canvas = threejsCanvasBoxRef.current?.getCanvas();
    if (canvas === null || canvas === undefined) {
      return;
    }

    const ENTIRE_SCENE = 0; 
    const BLOOM_SCENE = 1;
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

    // cannon
    const world = new CANNON.World();
    world.gravity.set(0, -15.82, 0);

    // camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(30, 20, 30);
    camera.setFocalLength(20);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    globalCamerasRef.current.push(camera);

    // scene
    const scene = new THREE.Scene();
    scene.background = null;
    globalSceneRef.current = scene;

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
    allObjectsRef.current.add(spotLight);

    // plane add
    const planeThreeCannonObject = new ThreeCannonObject({
      world: world,
      scene: scene,
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
    const boxItems = new Set<BoxInterfacae>();
    boxItems.add({
      name: 'red1',
      position: { x: 1, y: 10, z: -3 },
      size: { x: 5, y: 5, z: 2 },
      isBloom: false,
      color: 0xff0000,
    });
    boxItems.add({
      name: 'red2',
      position: { x: 1, y: 10, z: -10 },
      size: { x: 5, y: 5, z: 2 },
      isBloom: false,
      color: 0xff0000,
    });
    boxItems.add({
      name: 'pink1',
      position: { x: 10, y: 10, z: -3 },
      size: { x: 5, y: 5, z: 2 },
      isBloom: false,
      color: 0xff00ff,
    });
    boxItems.add({
      name: 'pink2',
      position: { x: 10, y: 10, z: -10 },
      size: { x: 5, y: 5, z: 2 },
      isBloom: false,
      color: 0xff00ff,
    });
    boxItems.forEach(item => {
      const boxThreeCannonObject = new ThreeCannonObject({
        world,
        scene,
        threeObject: () => {
          let material = new THREE.MeshStandardMaterial({
            color: item.color,
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
          box.name = item.name;

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
    const orbitControls = new OrbitControls(camera, canvas);
    orbitControls.update(); // render 시에도 호출해주어야 함.

    const axesHelper = new THREE.AxesHelper(150);
    axesHelper.layers.enable(ENTIRE_SCENE);
    scene.add(axesHelper);

    const clock = new THREE.Clock();
    let oldElapsedTime = 0;

    // pass setting
    const renderPass = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(
        canvas?.clientWidth,
        canvas?.clientHeight
      ),
      1.5,
      0.4,
      0.85
    );
    bloomPass.threshold = 0;
    bloomPass.strength = 1.5;
    bloomPass.radius = 0;

    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderPass);
    bloomComposer.addPass(bloomPass);
    globalBloomComposerRef.current = bloomComposer;

    const finalComposer = new EffectComposer(renderer);
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
    globalFinalComposerRef.current = finalComposer;

    subscriptionsRef.current.add(fromEvent(canvas, 'click').subscribe(event => {
      const object = getObjectFromMouseEvent({
        event: event as MouseEvent,
        camera,
        scene,
        canvasElement: canvas,
      });

      console.log('object', object);
      if (object?.name.includes('pink')) {
        object.layers.toggle(BLOOM_SCENE);
      }
    }));
    subscriptionsRef.current.add(fromEvent(canvas, 'mousemove').pipe(
      startWith(null),
      pairwise(),
    ).subscribe(([previousEvent, currentEvent]) => {
      const previousObject = getObjectFromMouseEvent({
        event: previousEvent as MouseEvent,
        camera,
        scene,
        canvasElement: canvas,
      });

      const currentObject = getObjectFromMouseEvent({
        event: currentEvent as MouseEvent,
        camera,
        scene,
        canvasElement: canvas,
      });

      if (previousObject !== currentObject) {
        // previousObject 입장에선 mouse out
        // currentObject 입장에선 mouse over
        if (previousObject?.name.includes('red') || previousObject?.name.includes('pink')) {
          previousObject.layers.disable(BLOOM_SCENE);
        }

        if (currentObject?.name.includes('red') || currentObject?.name.includes('pink')) {
          currentObject.layers.enable(BLOOM_SCENE);
        }
      }
    }));

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
      // BLOOM LAYER (1번 레이어) 가 활성화 되어 있지 않은 mesh 들은 전부 black 색상 처리
      if ( obj.isMesh && bloomLayer.test( obj.layers ) === false ) {
        materials[ obj.uuid ] = obj.material;
        obj.material = darkMaterial;
      }
    }

    const restoreMaterial = (obj: any) => {
      // black 색상 처리 했던 mesh 들의 material 을 다시 원상 복구
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

      /*
        오브젝트의 material color 가 black 일 때는 bloom 효과가 적용되지 않는 점을 이용한 것.
        BLOOM LAYER (1번 레이어) 가 활성화 되지 않은 mesh 에 material color black 적용
      */
      scene.traverse(darkenNonBloomed); 

      /*
        그리고 bloomCompoer 를 통해 화면을 렌더링 하면 색상이 black 이 아닌 mesh 들에게만
        bloom (빛 번짐) 효과가 적용됨 (이 때 화면 상에 렌더링 되지는 않음.)
      */
      bloomComposer.render();

      /*
        bloomCompoer 렌더링을 마친 후, bloom 을 적용하지 않기 위해 metarial color 를 black 처리 했던
        mesh 들의 material 을 다시 원상 복구시킴 
      */
      scene.traverse(restoreMaterial); 

      /*
        마지막인 finalComposer 를 통해 화면에 최종 렌더링 진행.
        finalComposer 는 bloomComposer 의 값을 참조하여 렌더링을 진행.
      */
      finalComposer.render();
    };
    requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      subscriptionsRef.current.forEach(x => x.unsubscribe());
    };
  }, []);

  return (
    <>
      <ThreejsCanvasBox
        ref={threejsCanvasBoxRef}
        __rendererRef={globalRendererRef}
        __camerasRef={globalCamerasRef} />
    </>
  );
};  

export default IndexPage;