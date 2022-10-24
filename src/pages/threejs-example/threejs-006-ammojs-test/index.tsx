import Head from "next/head";
import { useEffect, useRef } from "react";
import CommonLayout from "../../../components/layouts/common-layout/common-layout.component";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IThreejsCanvasBox } from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.interface";
import ThreejsCanvasBox from "../../../components/boxes/threejs-canvas-box/threejs-canvas-box.component";
import { ThreeCannonObject } from "../../../librarys/three-object-util/three-object-util.library";
// declare const AMMO: Ammo;

const IndexPage = () => {
  return (
    <>
      <Head>
        <title>threejs-006-ammojs-test</title>
        <meta name="description" content="threejs-006-ammojs-test page!" />
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
  const boxThreeCannonObjectsRef = useRef<Set<ThreeCannonObject>>(new Set<ThreeCannonObject>());
  const allObjectsRef = useRef<Set<THREE.Object3D<any>>>(new Set<THREE.Object3D<any>>());

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Ammo().then((event) => {
    //   console.log('ammo.event', event);

    // });
    await Ammo();
    const rigidBodies: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial>[] = [];
    const tmpTrans = new Ammo.btTransform();

    const physicsWorld = setupPhysicsWorld();
    console.log('physicsWorld', physicsWorld);

    

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
    {
      const pos = { 
        x: 0, 
        y: 0, 
        z: 0 
      };
      const scale = { 
        x: 50, 
        y: 2, 
        z: 50 
      };
      const quat = { 
        x: 0, 
        y: 0, 
        z: 0, 
        w: 1 
      };
      const mass = 0;

      // three.js
      const blockPlane = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhongMaterial({color: 0xa0afa4}));
      blockPlane.position.set(pos.x, pos.y, pos.z);
      blockPlane.scale.set(scale.x, scale.y, scale.z);
      blockPlane.castShadow = true;
      blockPlane.receiveShadow = true;
      scene.add(blockPlane);

      // ammo.js
      const transform = new Ammo.btTransform();
      transform.setIdentity();
      transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
      transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
      const motionState = new Ammo.btDefaultMotionState( transform );

      const colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
      colShape.setMargin( 0.05 );

      const localInertia = new Ammo.btVector3( 0, 0, 0 );
      colShape.calculateLocalInertia( mass, localInertia );

      const rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
      const body = new Ammo.btRigidBody( rbInfo );

      physicsWorld.addRigidBody( body );
    }


    // add ball
    {
      let pos = {x: 0, y: 2, z: 0};
      let radius = 0.1;
      let quat = {x: 0, y: 0, z: 0, w: 1};
      let mass = 1;

      // three.js
      let ball = new THREE.Mesh(new THREE.SphereGeometry(radius), new THREE.MeshPhongMaterial({color: 0xff0505}));

      ball.position.set(pos.x, pos.y, pos.z);
      
      ball.castShadow = true;
      ball.receiveShadow = true;

      scene.add(ball);

      // ammo.js
      let transform = new Ammo.btTransform();
      transform.setIdentity();
      transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
      transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
      let motionState = new Ammo.btDefaultMotionState( transform );

      let colShape = new Ammo.btSphereShape( radius );
      colShape.setMargin( 0.05 );

      let localInertia = new Ammo.btVector3( 0, 0, 0 );
      colShape.calculateLocalInertia( mass, localInertia );

      let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
      let body = new Ammo.btRigidBody( rbInfo );


      physicsWorld.addRigidBody( body );
      
      ball.userData.physicsBody = body;
      rigidBodies.push(ball);
    }



    const orbitControls = new OrbitControls(camera, canvas);
    orbitControls.enableDamping = true;
    orbitControls.enableZoom = false;
    orbitControls.enablePan = false;
    orbitControls.update(); // render 시에도 호출해주어야 함.




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

    const updatePhysics = (deltaTime: number) => {
      // Step world
      physicsWorld.stepSimulation( deltaTime, 10 );

      // Update rigid bodies
      for ( let i = 0; i < rigidBodies.length; i++ ) {
        let objThree = rigidBodies[ i ];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if ( ms ) {
          ms.getWorldTransform( tmpTrans );
          let p = tmpTrans.getOrigin();
          let q = tmpTrans.getRotation();
          objThree.position.set( p.x(), p.y(), p.z() );
          objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
        }
      }
    };

    const render = () => {
      let deltaTime = clock.getDelta();
      renderer.clear();
      orbitControls.update();
      renderer.render(scene, camera);
      // tick();
      updatePhysics( deltaTime );
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  return (
    <>
      {/* <Script src="/js/ammo.js"></Script> */}
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