/** @description 把 MediaPipe 給的 flat matrix 轉成位移（translation）、旋轉（rotation）、縮放（scale），供 Avatar 用。 */

import * as THREE from "three";

const decomposeMatrix = (
  matrix1d: number[]
): {
  translation: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
} => {
  let matrix4x4 = new THREE.Matrix4().fromArray(matrix1d);

  let translation = new THREE.Vector3();
  let rotation = new THREE.Quaternion();
  let scale = new THREE.Vector3();

  matrix4x4.decompose(translation, rotation, scale);

  return {
    translation: translation,
    rotation: rotation,
    scale: scale,
  };
};

export { decomposeMatrix };
