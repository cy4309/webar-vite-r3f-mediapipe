/**
 * @description 確認好R3F Canvas 在相機 metadata 尚未完整時提早 render，會導致整體掛掉。
 */

// "use client";
import { useEffect, useRef, useState } from "react";
import DrawLandmarkCanvas from "@/components/DrawLandmarkCanvas";
import AvatarCanvas from "@/components/AvatarCanvas";
import FaceLandmarkManager from "@/classes/FaceLandmarkManager";
import ReadyPlayerCreator from "@/components/ReadyPlayerCreator";
import BaseButton from "@/components/BaseButton";

const FaceLandmarkCanvas = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastVideoTimeRef = useRef(-1);
  const requestRef = useRef(0);

  const [avatarView, setAvatarView] = useState(true);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  // const [modelUrl, setModelUrl] = useState(
  //   "https://models.readyplayer.me/6460691aa35b2e5b7106734d.glb?morphTargets=ARKit"
  // );
  const [modelUrl, setModelUrl] = useState("/hat.glb");
  console.log(modelUrl);
  const [videoSize, setVideoSize] = useState<{
    width: number;
    height: number;
  }>();
  const [isRenderReady, setIsRenderReady] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    const getUserCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            // const width = videoRef.current!.videoWidth;
            // const height = videoRef.current!.videoHeight;
            // setVideoSize({ width, height });
            updateVideoSize(); // ✅ 載入時先更新一次尺寸
            setIsCameraReady(true);
            videoRef.current!.play();
          };
        }
      } catch (e) {
        console.log(e);
        alert("Failed to load webcam!");
      }
    };
    getUserCamera();
    window.addEventListener("resize", updateVideoSize); // ✅ 加入 resize 監聽
    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener("resize", updateVideoSize); // ✅ 清除監聽
    };
  }, []);

  useEffect(() => {
    if (isCameraReady && videoRef.current) {
      // Minimal wait to ensure camera feed is stable
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsRenderReady(true);
          requestRef.current = requestAnimationFrame(animate);
        });
      });
    }
  }, [isCameraReady]);

  const toggleAvatarView = () => setAvatarView((prev) => !prev);

  const toggleAvatarCreatorView = () => setShowAvatarCreator((prev) => !prev);

  const handleAvatarCreationComplete = (url: string) => {
    setModelUrl(url);
    toggleAvatarCreatorView();
  };

  const updateVideoSize = () => {
    if (videoRef.current) {
      const width = videoRef.current.offsetWidth;
      const height = videoRef.current.offsetHeight;
      setVideoSize({ width, height });
    }
  };

  const animate = () => {
    if (
      videoRef.current &&
      videoRef.current.currentTime !== lastVideoTimeRef.current
    ) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      try {
        const faceLandmarkManager = FaceLandmarkManager.getInstance();
        faceLandmarkManager.detectLandmarks(videoRef.current, Date.now());
      } catch (e) {
        console.log(e);
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center gap-10">
        <BaseButton onClick={toggleAvatarView}>
          {avatarView ? "Switch to Landmark View" : "Switch to Avatar View"}
        </BaseButton>
        <BaseButton onClick={toggleAvatarCreatorView}>
          {"Customize your Avatar!"}
        </BaseButton>
      </div>

      <div className="relative flex justify-center">
        <video
          className="w-full h-auto"
          ref={videoRef}
          loop
          muted
          autoPlay
          playsInline
        ></video>

        {!isRenderReady && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-lg bg-black bg-opacity-40">
            Loading camera & model...
          </div>
        )}

        {videoSize && isRenderReady && (
          <>
            {showAvatarCreator && (
              <ReadyPlayerCreator
                width={videoSize.width}
                height={videoSize.height}
                handleComplete={handleAvatarCreationComplete}
              />
            )}
            {avatarView ? (
              <AvatarCanvas
                width={videoSize.width}
                height={videoSize.height}
                url={modelUrl}
              />
            ) : (
              <DrawLandmarkCanvas
                width={videoSize.width}
                height={videoSize.height}
              />
            )}
            {/* <DrawLandmarkCanvas
              width={videoSize.width}
              height={videoSize.height}
            /> */}
          </>
        )}
      </div>
    </div>
  );
};

export default FaceLandmarkCanvas;
