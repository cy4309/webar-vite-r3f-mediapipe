/** @description 確認好R3F Canvas 在相機 metadata 尚未完整時提早 render，會導致整體掛掉。 */
/** @description 包含整體邏輯的容器元件：開啟攝影機、取得媒體串流、切換 view、初始化 AvatarManager、呼叫動畫 loop 等。 */

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
  const [videoSize, setVideoSize] = useState<{
    width: number;
    height: number;
  }>();
  const [isRenderReady, setIsRenderReady] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [mirrored, setMirrored] = useState(true);
  console.log(mirrored);

  // 取得串流（含切換）
  const streamRef = useRef<MediaStream | null>(null);
  const setupCamera = async (mode: "user" | "environment") => {
    // 停掉舊串流
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: mode },
        // width: { ideal: 1280 },
        // height: { ideal: 720 },
      },
      audio: false,
    };
    let stream = await navigator.mediaDevices.getUserMedia(constraints);

    // fallback: 有些桌機不理 facingMode，就 enumerateDevices
    const track = stream.getVideoTracks()[0];
    if (track.getSettings().facingMode !== mode) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((d) => d.kind === "videoinput");
      const pick =
        videos.find((d) =>
          mode === "environment"
            ? /back|rear|environment/i.test(d.label)
            : /front|user|face/i.test(d.label)
        ) || videos[0];
      if (pick) {
        stream.getTracks().forEach((t) => t.stop());
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: pick.deviceId } },
          audio: false,
        });
      }
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    setMirrored(mode === "user");
    setIsCameraReady(true);
  };

  // 初次與切換時呼叫
  useEffect(() => {
    setupCamera(facing);
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [facing]);

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
        <BaseButton
          onClick={() =>
            setFacing((prev) => (prev === "user" ? "environment" : "user"))
          }
        >
          切換相機（目前：{facing === "user" ? "前鏡頭" : "後鏡頭"}）
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
                // videoRef={videoRef}
                // mirrored={mirrored}
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
