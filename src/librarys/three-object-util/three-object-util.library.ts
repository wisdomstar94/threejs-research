import * as THREE from 'three';
import { IThreeObjectLibrary } from './three-object-util.interface';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const getIntersects = (params: IThreeObjectLibrary.GetObjectRequireParams) => {
  if (params.event === null) {
    return [];
  }
  params.event.preventDefault();

  //  Statement  raycaster  and  mouse  Variable
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const rect = params.canvasElement.getBoundingClientRect();

  //  Click the location with the mouse , To calculate the  raycaster  The location of the desired point , Focus on the screen , Range  -1  To  1
  mouse.x = ( ( params.event.clientX - rect.left ) / ( rect.right - rect.left ) ) * 2 - 1;
  mouse.y = - ( ( params.event.clientY - rect.top ) / ( rect.bottom - rect.top) ) * 2 + 1;

  // Location by mouse click ( Two dimensional coordinates ) And the matrix of the current camera
  raycaster.setFromCamera(mouse, params.camera);

  //  To obtain and raycaster A collection of arrays where rays intersect , The elements are sorted by distance , The closer it is, the more forward it is
  const intersects = raycaster.intersectObjects(params.scene.children);

  // Returns an array of selected objects
  return intersects;
};

export const getObjectFromMouseEvent = (params: IThreeObjectLibrary.GetObjectRequireParams): null | THREE.Object3D<THREE.Object3DEventMap> => {
  if (params.event === null) {
    return null;
  }

  const intersects = getIntersects({
    event: params.event,
    camera: params.camera,
    scene: params.scene,
    canvasElement: params.canvasElement,
  });

  if (intersects.length > 0) {
    const object = intersects[0].object;
    return object;
  }

  return null;
};

export const getObjectFromExternal = (params: IThreeObjectLibrary.GetObjectFromExternalParams) => {
  return new Promise<GLTF>(function(resolve, reject) {
    const loader = new GLTFLoader();
    loader.load(params.path, function (gltf) {
      console.log('???', gltf);
      resolve(gltf);
    });
  });
};

export const getTextureFromExternal = (params: IThreeObjectLibrary.GetTextureFromExternalParams) => {
  return new Promise<THREE.Texture>(function(resolve, reject) {
    const texture = new THREE.TextureLoader(params.manager);
    texture.load(params.path, function (texture) {
      resolve(texture);
    });
  });
};
