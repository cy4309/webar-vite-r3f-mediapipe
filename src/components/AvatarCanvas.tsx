/** @description 主要用於渲染 R3F 的 Canvas，顯示 3D 模型（帽子）與 FaceDepth 遮罩等。是視覺渲染的主場景。 */

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import AvatarManager from "@/classes/AvatarManager";
import { OrbitControls } from "@react-three/drei";
import FaceLandmarkManager from "@/classes/FaceLandmarkManager";
import { Float, Text3D } from "@react-three/drei";
import FaceMeshMask from "@/components/FaceMeshMask";
import * as THREE from "three";

function CanvasProbe({
  onReady,
}: {
  onReady?: (el: HTMLCanvasElement) => void;
}) {
  const { gl } = useThree();
  useEffect(() => {
    onReady?.(gl.domElement as HTMLCanvasElement);
  }, [gl, onReady]);
  return null;
}
interface AvatarCanvasProps {
  width: number;
  height: number;
  url: string;
  onCanvasReady?: (el: HTMLCanvasElement) => void;
  // mirrored: boolean;
  // videoRef: React.RefObject<HTMLVideoElement>;
}

// const VideoPlane = ({ video }: { video: HTMLVideoElement }) => {
//   const texture = new THREE.VideoTexture(video);
//   texture.minFilter = THREE.LinearFilter;
//   texture.magFilter = THREE.LinearFilter;
//   texture.format = THREE.RGBAFormat;

//   return (
//     <mesh position={[0, 0, -0.1]} renderOrder={-1}>
//       <planeGeometry args={[2, 2]} />
//       <meshBasicMaterial map={texture} toneMapped={false} />
//     </mesh>
//   );
// };

const AvatarCanvas = ({
  width,
  height,
  url,
  onCanvasReady,
}: AvatarCanvasProps) => {
  const [scene, setScene] = useState<THREE.Scene | null>();
  const [isLoading, setIsLoading] = useState(true);
  const avatarManagerRef = useRef<AvatarManager>(AvatarManager.getInstance());
  const requestRef = useRef(0);

  const animate = () => {
    const results = FaceLandmarkManager.getInstance().getResults();
    avatarManagerRef.current.updateFacialTransforms(results, true);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const avatarManager = AvatarManager.getInstance();
    avatarManager
      .loadModel(url)
      .then(() => {
        setScene(avatarManager.getScene());
        setIsLoading(false);
      })
      .catch((e) => {
        alert(e);
      });
  }, [url]);

  return (
    <div className="absolute" style={{ width: width, height: height }}>
      <Canvas
        camera={{ fov: 30, position: [0, 0.5, 1] }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <CanvasProbe onReady={onCanvasReady} />
        <ambientLight />
        <directionalLight />
        <OrbitControls
          target={[0, 0.6, 0]}
          enableDamping={false}
          enableRotate={false}
          enableZoom={false}
          enablePan={false}
        />
        {/* {videoRef.current && <VideoPlane video={videoRef.current} mirrored={mirrored} />} */}
        <FaceMeshMask />
        {scene && <primitive object={scene} />}
        {isLoading && (
          <Float floatIntensity={1} speed={1}>
            <Text3D
              font={"../assets/fonts/Open_Sans_Condensed_Bold.json"}
              scale={0.05}
              position={[-0.1, 0.6, 0]}
              bevelEnabled
              bevelSize={0.05}
            >
              Loading...
              <meshNormalMaterial />
            </Text3D>
          </Float>
        )}
      </Canvas>
    </div>
  );
};

export default AvatarCanvas;
