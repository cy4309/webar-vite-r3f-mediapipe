// /** @description 確認好R3F Canvas 在相機 metadata 尚未完整時提早 render，會導致整體掛掉。 */
// /** @description 包含整體邏輯的容器元件：開啟攝影機、取得媒體串流、切換 view、初始化 AvatarManager、呼叫動畫 loop 等。 */

// // "use client";
// import { useEffect, useRef, useState } from "react";
// import DrawLandmarkCanvas from "@/components/DrawLandmarkCanvas";
// import AvatarCanvas from "@/components/AvatarCanvas";
// import FaceLandmarkManager from "@/classes/FaceLandmarkManager";
// import ReadyPlayerCreator from "@/components/ReadyPlayerCreator";
// import BaseButton from "@/components/BaseButton";
// import { IoMdCamera } from "react-icons/io";
// import { AiFillVideoCamera } from "react-icons/ai";
// import { LuRefreshCw } from "react-icons/lu";

// const FaceLandmarkCanvas = () => {
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const lastVideoTimeRef = useRef(-1);
//   const requestRef = useRef(0);
//   const [avatarView, setAvatarView] = useState(true);
//   const [showAvatarCreator, setShowAvatarCreator] = useState(false);
//   // const [modelUrl, setModelUrl] = useState(
//   //   "https://models.readyplayer.me/6460691aa35b2e5b7106734d.glb?morphTargets=ARKit"
//   // );
//   const [modelUrl, setModelUrl] = useState("/hat.glb");
//   const [videoSize, setVideoSize] = useState<{
//     width: number;
//     height: number;
//   }>();
//   const [isRenderReady, setIsRenderReady] = useState(false);
//   const [isCameraReady, setIsCameraReady] = useState(false);
//   const [facing, setFacing] = useState<"user" | "environment">("user");
//   const [mirrored, setMirrored] = useState(true);
//   console.log(mirrored);
//   // 拍照 / 錄影狀態
//   const [isRecording, setIsRecording] = useState(false);
//   const [recTime, setRecTime] = useState(0);
//   const recTimerRef = useRef<number | null>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const recordedChunksRef = useRef<BlobPart[]>([]);

//   // 取得「可錄影的來源」：先用 <video> 的畫面（之後要合成 R3F/landmarks 可再擴充）
//   const getCaptureStream = () => {
//     // 只錄攝影機：直接用 video 的 MediaStream
//     return (videoRef.current?.srcObject as MediaStream) || null;
//   };

//   // 拍照（先只截取 <video> 畫面；要合成 R3F/landmarks 可把 overlay 也 drawImage 到這個 canvas）
//   const handleShootPhoto = async () => {
//     if (!videoRef.current) return;
//     const v = videoRef.current;
//     // 用 video 的原生解析度
//     const w = v.videoWidth || v.clientWidth;
//     const h = v.videoHeight || v.clientHeight;
//     const canvas = document.createElement("canvas");
//     const ctx = canvas.getContext("2d")!;
//     canvas.width = w;
//     canvas.height = h;

//     // 如果前鏡頭鏡像，拍照也鏡像
//     ctx.save();
//     if (mirrored) {
//       ctx.scale(-1, 1);
//       ctx.drawImage(v, -w, 0, w, h);
//     } else {
//       ctx.drawImage(v, 0, 0, w, h);
//     }
//     ctx.restore();

//     // TODO：若要把 R3F/landmarks 疊上來，這裡再找出對應 canvas 一起 drawImage

//     canvas.toBlob((blob) => {
//       if (!blob) return;
//       const url = URL.createObjectURL(blob);
//       // 下載
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = `photo_${Date.now()}.png`;
//       a.click();
//       URL.revokeObjectURL(url);
//     }, "image/png");
//   };

//   // 錄影開始/停止
//   const handleToggleRecord = async () => {
//     if (isRecording) {
//       // 停止
//       mediaRecorderRef.current?.stop();
//       setIsRecording(false);
//       if (recTimerRef.current) {
//         cancelAnimationFrame(recTimerRef.current);
//         recTimerRef.current = null;
//       }
//       return;
//     }

//     const stream = getCaptureStream();
//     if (!stream) return alert("找不到可錄製的串流");

//     recordedChunksRef.current = [];
//     const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
//     mediaRecorderRef.current = mr;

//     mr.ondataavailable = (e) => {
//       if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
//     };
//     mr.onstop = () => {
//       const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = `record_${Date.now()}.webm`;
//       a.click();
//       URL.revokeObjectURL(url);
//     };

//     mr.start(); // 你也可給 timeslice
//     setIsRecording(true);
//     setRecTime(0);

//     // 簡單的錄影秒數 UI
//     const start = performance.now();
//     const tick = (t: number) => {
//       setRecTime(Math.floor((t - start) / 1000));
//       recTimerRef.current = requestAnimationFrame(tick);
//     };
//     recTimerRef.current = requestAnimationFrame(tick);
//   };

//   // 秒數顯示 00:00
//   const fmt = (s: number) =>
//     `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
//       2,
//       "0"
//     )}`;

//   // 取得串流（含切換）
//   const streamRef = useRef<MediaStream | null>(null);
//   const setupCamera = async (mode: "user" | "environment") => {
//     // 停掉舊串流
//     streamRef.current?.getTracks().forEach((t) => t.stop());
//     const constraints: MediaStreamConstraints = {
//       video: {
//         facingMode: { ideal: mode },
//         // width: { ideal: 1280 },
//         // height: { ideal: 720 },
//       },
//       audio: false,
//     };
//     let stream = await navigator.mediaDevices.getUserMedia(constraints);

//     // fallback: 有些桌機不理 facingMode，就 enumerateDevices
//     const track = stream.getVideoTracks()[0];
//     if (track.getSettings().facingMode !== mode) {
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       const videos = devices.filter((d) => d.kind === "videoinput");
//       const pick =
//         videos.find((d) =>
//           mode === "environment"
//             ? /back|rear|environment/i.test(d.label)
//             : /front|user|face/i.test(d.label)
//         ) || videos[0];
//       if (pick) {
//         stream.getTracks().forEach((t) => t.stop());
//         stream = await navigator.mediaDevices.getUserMedia({
//           video: { deviceId: { exact: pick.deviceId } },
//           audio: false,
//         });
//       }
//     }

//     streamRef.current = stream;
//     if (videoRef.current) {
//       videoRef.current.srcObject = stream;
//       await videoRef.current.play();
//     }
//     setMirrored(mode === "user");
//     setIsCameraReady(true);
//   };

//   // 初次與切換時呼叫
//   useEffect(() => {
//     setupCamera(facing);
//     return () => streamRef.current?.getTracks().forEach((t) => t.stop());
//   }, [facing]);

//   useEffect(() => {
//     const getUserCamera = async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: true,
//         });
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//           videoRef.current.onloadedmetadata = () => {
//             // const width = videoRef.current!.videoWidth;
//             // const height = videoRef.current!.videoHeight;
//             // setVideoSize({ width, height });
//             updateVideoSize(); // ✅ 載入時先更新一次尺寸
//             setIsCameraReady(true);
//             videoRef.current!.play();
//           };
//         }
//       } catch (e) {
//         console.log(e);
//         alert("Failed to load webcam!");
//       }
//     };
//     getUserCamera();
//     window.addEventListener("resize", updateVideoSize); // ✅ 加入 resize 監聽
//     return () => {
//       cancelAnimationFrame(requestRef.current);
//       window.removeEventListener("resize", updateVideoSize); // ✅ 清除監聽
//     };
//   }, []);

//   useEffect(() => {
//     if (isCameraReady && videoRef.current) {
//       // Minimal wait to ensure camera feed is stable
//       requestAnimationFrame(() => {
//         requestAnimationFrame(() => {
//           setIsRenderReady(true);
//           requestRef.current = requestAnimationFrame(animate);
//         });
//       });
//     }
//   }, [isCameraReady]);

//   const toggleAvatarView = () => setAvatarView((prev) => !prev);

//   const toggleAvatarCreatorView = () => setShowAvatarCreator((prev) => !prev);

//   const handleAvatarCreationComplete = (url: string) => {
//     setModelUrl(url);
//     toggleAvatarCreatorView();
//   };

//   const updateVideoSize = () => {
//     if (videoRef.current) {
//       const width = videoRef.current.offsetWidth;
//       const height = videoRef.current.offsetHeight;
//       setVideoSize({ width, height });
//     }
//   };

//   const animate = () => {
//     if (
//       videoRef.current &&
//       videoRef.current.currentTime !== lastVideoTimeRef.current
//     ) {
//       lastVideoTimeRef.current = videoRef.current.currentTime;
//       try {
//         const faceLandmarkManager = FaceLandmarkManager.getInstance();
//         faceLandmarkManager.detectLandmarks(videoRef.current, Date.now());
//       } catch (e) {
//         console.log(e);
//       }
//     }
//     requestRef.current = requestAnimationFrame(animate);
//   };

//   return (
//     <div className="w-full h-full flex flex-col items-center">
//       <div className="w-full h-full flex justify-center items-center relative">
//         <video
//           className="w-full h-full object-cover"
//           ref={videoRef}
//           loop
//           muted
//           autoPlay
//           playsInline
//         ></video>

//         {!isRenderReady && (
//           <div className="absolute inset-0 flex items-center justify-center text-white text-lg bg-black bg-opacity-40">
//             Loading camera & model...
//           </div>
//         )}

//         {videoSize && isRenderReady && (
//           <>
//             {showAvatarCreator && (
//               <ReadyPlayerCreator
//                 width={videoSize.width}
//                 height={videoSize.height}
//                 handleComplete={handleAvatarCreationComplete}
//               />
//             )}
//             {avatarView ? (
//               <AvatarCanvas
//                 width={videoSize.width}
//                 height={videoSize.height}
//                 url={modelUrl}
//                 // videoRef={videoRef}
//                 // mirrored={mirrored}
//               />
//             ) : (
//               <DrawLandmarkCanvas
//                 width={videoSize.width}
//                 height={videoSize.height}
//               />
//             )}
//             {/* <DrawLandmarkCanvas
//               width={videoSize.width}
//               height={videoSize.height}
//             /> */}
//           </>
//         )}
//       </div>

//       <div className="flex justify-center gap-10 absolute bottom-0">
//         {/* ios tool bar */}
//         <div className="absolute bottom-0 left-0 right-0 pb-8 pt-4 flex items-end justify-center">
//           <div className="flex justify-center items-center gap-8 px-6 py-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
//             {/* mode change */}
//             <BaseButton onClick={toggleAvatarView} className="!rounded-full">
//               <span className="text-white/90 text-sm tracking-wide">
//                 {avatarView ? "Avatar" : "Landmark"}
//               </span>
//             </BaseButton>

//             {/* Customize Avatar */}
//             {/* <BaseButton onClick={toggleAvatarCreatorView}>
//               {"Customize your Avatar!"}
//             </BaseButton> */}

//             {/* 拍照快門（白色大圓） */}
//             <button
//               onClick={handleShootPhoto}
//               aria-label="Shutter"
//               className="relative w-16 h-16 rounded-full"
//             >
//               {/* 外圈 */}
//               <span className="absolute inset-0 rounded-full border-4 border-white/90"></span>
//               {/* 內圈 */}
//               <span className="absolute inset-1.5 rounded-full bg-white/90"></span>
//               <IoMdCamera className="absolute inset-0 m-auto text-black text-2xl" />
//             </button>

//             {/* 錄影按鈕（待機：白圈；錄影：紅色方圓） */}
//             <button
//               onClick={handleToggleRecord}
//               aria-label="Record"
//               className="relative w-16 h-16 rounded-full"
//             >
//               {/* 外圈 */}
//               <span className="absolute inset-0 rounded-full border-4 border-white/90"></span>
//               {/* 內部圖形：錄影時紅色方圓、未錄影時透明圓 */}
//               <span
//                 className={`absolute inset-3 rounded-md transition-all duration-200 ${
//                   isRecording
//                     ? "bg-red-600 rounded-md"
//                     : "bg-transparent rounded-full"
//                 }`}
//               ></span>
//               <AiFillVideoCamera className="absolute inset-0 m-auto text-2xl" />
//             </button>

//             {/* 鏡頭切換 */}
//             <BaseButton
//               onClick={() =>
//                 setFacing((prev) => (prev === "user" ? "environment" : "user"))
//               }
//               // className="!px-4 !py-2"
//               className="!rounded-full"
//             >
//               <LuRefreshCw className="text-white/90" />
//             </BaseButton>
//           </div>

//           {/* 錄影時間（置中上方） */}
//           {isRecording && (
//             <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-red-500 font-medium">
//               <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
//               <span className="tabular-nums">{fmt(recTime)}</span>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default FaceLandmarkCanvas;

/** @description 確認好R3F Canvas 在相機 metadata 尚未完整時提早 render，會導致整體掛掉。 */
/** @description 包含整體邏輯的容器元件：開啟攝影機、取得媒體串流、切換 view、初始化 AvatarManager、呼叫動畫 loop、拍照/錄影（合成輸出）等。 */

import { useEffect, useRef, useState } from "react";
import DrawLandmarkCanvas from "@/components/DrawLandmarkCanvas";
import AvatarCanvas from "@/components/AvatarCanvas";
import FaceLandmarkManager from "@/classes/FaceLandmarkManager";
import ReadyPlayerCreator from "@/components/ReadyPlayerCreator";
import BaseButton from "@/components/BaseButton";
import { IoMdCamera } from "react-icons/io";
import { AiFillVideoCamera } from "react-icons/ai";
import { LuRefreshCw } from "react-icons/lu";

function pickMime(): string {
  const cand = [
    "video/mp4;codecs=h264,aac", // iOS/Safari 優先
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const m of cand) {
    if ((window as any).MediaRecorder?.isTypeSupported?.(m)) return m;
  }
  return "";
}

const FaceLandmarkCanvas = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastVideoTimeRef = useRef(-1);
  const requestRef = useRef(0);

  const [avatarView, setAvatarView] = useState(true);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [modelUrl, setModelUrl] = useState("/hat.glb");

  const [videoSize, setVideoSize] = useState<{
    width: number;
    height: number;
  }>();
  const [isRenderReady, setIsRenderReady] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [mirrored, setMirrored] = useState(true);

  // ===== 合成需要：抓 R3F 與 Landmark 的 canvas（有 onCanvasReady 更穩；否則 fallback DOM 查找） =====
  const r3fCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ===== 錄影狀態 =====
  const [isRecording, setIsRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const recTimerRef = useRef<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  // 合成錄影用的 canvas 與 loop
  const composeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const composeCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const composeRafRef = useRef<number | null>(null);
  const capturedStreamRef = useRef<MediaStream | null>(null);

  // 取得串流（含切換）
  const streamRef = useRef<MediaStream | null>(null);
  const setupCamera = async (mode: "user" | "environment") => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: mode },
      },
      audio: false,
    };
    let stream = await navigator.mediaDevices.getUserMedia(constraints);

    // 一些桌機/Android 不吃 facingMode，fallback enumerateDevices
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
            updateVideoSize();
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
    window.addEventListener("resize", updateVideoSize);
    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener("resize", updateVideoSize);
    };
  }, []);

  useEffect(() => {
    if (isCameraReady && videoRef.current) {
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

  // ========== 合成功能：抓 R3F / Landmark Canvas 的 DOM fallback（若子元件未提供 onCanvasReady） ==========
  const ensureR3FCanvas = () => {
    if (r3fCanvasRef.current && r3fCanvasRef.current.isConnected)
      return r3fCanvasRef.current;
    // Drei/R3F 的 canvas 會是 WebGL canvas，常見是 data-engine="three.js"
    const c = document.querySelector(
      'canvas[data-engine="three.js"]'
    ) as HTMLCanvasElement | null;
    if (c) r3fCanvasRef.current = c;
    return r3fCanvasRef.current;
  };
  const ensureOverlayCanvas = () => {
    if (overlayCanvasRef.current && overlayCanvasRef.current.isConnected)
      return overlayCanvasRef.current;
    // 你的 DrawLandmarkCanvas 本身就是 <canvas>，可以加個 id 或 class 方便找
    const c = document.querySelector(
      "#landmark-overlay"
    ) as HTMLCanvasElement | null;
    if (c) overlayCanvasRef.current = c;
    return overlayCanvasRef.current;
  };

  // ========== 拍照（輸出合成 PNG） ==========
  const handleShootPhoto = async () => {
    const v = videoRef.current;
    if (!v) return;
    // 以 video 原生解析度為基準輸出
    const W = v.videoWidth || v.clientWidth;
    const H = v.videoHeight || v.clientHeight;

    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const ctx = out.getContext("2d")!;

    // 1) 畫相機影像（含鏡像）
    ctx.save();
    if (mirrored) {
      ctx.scale(-1, 1);
      ctx.drawImage(v, -W, 0, W, H);
    } else {
      ctx.drawImage(v, 0, 0, W, H);
    }
    ctx.restore();

    // 2) 疊 R3F（若有）
    const r3f = ensureR3FCanvas();
    if (r3f) ctx.drawImage(r3f, 0, 0, W, H);

    // 3) 疊 Landmarks（若有）
    const overlay = ensureOverlayCanvas();
    if (overlay) ctx.drawImage(overlay, 0, 0, W, H);

    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `photo_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  // ========== 錄影（輸出合成影片） ==========
  const startCompositeRecording = async () => {
    const v = videoRef.current;
    if (!v) return alert("找不到相機");

    // 準備合成畫布
    composeCanvasRef.current = document.createElement("canvas");
    composeCtxRef.current = composeCanvasRef.current.getContext("2d", {
      alpha: true,
    });
    const W = v.videoWidth || v.clientWidth;
    const H = v.videoHeight || v.clientHeight;
    composeCanvasRef.current.width = W;
    composeCanvasRef.current.height = H;

    const draw = () => {
      if (!composeCtxRef.current) return;
      const ctx = composeCtxRef.current;

      // video（含鏡像）
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (mirrored) {
        ctx.scale(-1, 1);
        ctx.drawImage(v, -W, 0, W, H);
      } else {
        ctx.drawImage(v, 0, 0, W, H);
      }
      ctx.restore();

      // 疊 R3F / overlay
      const r3f = ensureR3FCanvas();
      if (r3f) ctx.drawImage(r3f, 0, 0, W, H);
      const overlay = ensureOverlayCanvas();
      if (overlay) ctx.drawImage(overlay, 0, 0, W, H);

      composeRafRef.current = requestAnimationFrame(draw);
    };
    composeRafRef.current = requestAnimationFrame(draw);

    // 取得串流
    capturedStreamRef.current = composeCanvasRef.current.captureStream(30);

    // 啟動 MediaRecorder（iOS 優先 mp4）
    recordedChunksRef.current = [];
    const mime = pickMime();
    const mr = mime
      ? new MediaRecorder(capturedStreamRef.current, { mimeType: mime })
      : new MediaRecorder(capturedStreamRef.current);
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const type =
        (mr as any).mimeType ||
        (recordedChunksRef.current[0] as any)?.type ||
        "video/webm";
      const isMp4 = /mp4/i.test(type);
      const blob = new Blob(recordedChunksRef.current, { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `record_${Date.now()}.${isMp4 ? "mp4" : "webm"}`;
      a.click();
      URL.revokeObjectURL(url);
      // 清理
      capturedStreamRef.current?.getTracks().forEach((t) => t.stop());
      capturedStreamRef.current = null;
      if (composeRafRef.current) {
        cancelAnimationFrame(composeRafRef.current);
        composeRafRef.current = null;
      }
      composeCtxRef.current = null;
      composeCanvasRef.current = null;
    };

    mr.start();
    setIsRecording(true);
    setRecTime(0);

    // 錄影 UI 計時
    const start = performance.now();
    const tick = (t: number) => {
      setRecTime(Math.floor((t - start) / 1000));
      recTimerRef.current = requestAnimationFrame(tick);
    };
    recTimerRef.current = requestAnimationFrame(tick);
  };

  const stopCompositeRecording = () => {
    if (
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state === "inactive"
    )
      return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (recTimerRef.current) {
      cancelAnimationFrame(recTimerRef.current);
      recTimerRef.current = null;
    }
  };

  const handleToggleRecord = async () => {
    if (isRecording) stopCompositeRecording();
    else await startCompositeRecording();
  };

  // 秒數顯示 00:00
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0"
    )}`;

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div className="w-full h-full flex justify-center items-center relative">
        <video
          className="w-full h-full object-cover"
          ref={videoRef}
          loop
          muted
          autoPlay
          playsInline
        />

        {!isRenderReady && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-lg bg-black/40">
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

            {/* Avatar 視圖：建議在 AvatarCanvas 裡加 onCanvasReady={(el)=> r3fCanvasRef.current=el} */}
            {avatarView ? (
              <AvatarCanvas
                width={videoSize.width}
                height={videoSize.height}
                url={modelUrl}
                // @ts-ignore 若你的 AvatarCanvas 還沒加這個 prop，不影響執行；會走 DOM fallback
                onCanvasReady={(el: HTMLCanvasElement) =>
                  (r3fCanvasRef.current = el)
                }
              />
            ) : (
              <DrawLandmarkCanvas
                width={videoSize.width}
                height={videoSize.height}
                // @ts-ignore 同上，先讓它可回傳 canvas；若未實作會走 DOM fallback
                onCanvasReady={(el: HTMLCanvasElement) => {
                  el.id = "landmark-overlay"; // 也放個 id，fallback 會找得到
                  overlayCanvasRef.current = el;
                }}
              />
            )}
          </>
        )}
      </div>

      {/* iOS 相機風底部工具列 */}
      <div className="flex justify-center gap-10 absolute bottom-0">
        <div className="absolute bottom-0 left-0 right-0 pb-8 pt-4 flex items-end justify-center">
          <div className="flex justify-center items-center gap-8 px-6 py-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            {/* 模式切換 */}
            <BaseButton onClick={toggleAvatarView} className="!rounded-full">
              <span className="text-white/90 text-sm tracking-wide">
                {avatarView ? "Avatar" : "Landmark"}
              </span>
            </BaseButton>

            {/* 拍照（合成輸出） */}
            <button
              onClick={handleShootPhoto}
              aria-label="Shutter"
              className="relative w-16 h-16 rounded-full"
            >
              <span className="absolute inset-0 rounded-full border-4 border-white/90"></span>
              <span className="absolute inset-1.5 rounded-full bg-white/90"></span>
              <IoMdCamera className="absolute inset-0 m-auto text-black text-2xl" />
            </button>

            {/* 錄影（合成輸出） */}
            <button
              onClick={handleToggleRecord}
              aria-label="Record"
              className="relative w-16 h-16 rounded-full"
            >
              <span className="absolute inset-0 rounded-full border-4 border-white/90"></span>
              <span
                className={`absolute inset-3 rounded-md transition-all duration-200 ${
                  isRecording
                    ? "bg-red-600 rounded-md"
                    : "bg-transparent rounded-full"
                }`}
              />
              <AiFillVideoCamera className="absolute inset-0 m-auto text-2xl" />
            </button>

            {/* 前/後鏡頭切換 */}
            <BaseButton
              onClick={() =>
                setFacing((prev) => (prev === "user" ? "environment" : "user"))
              }
              className="!rounded-full"
            >
              <LuRefreshCw className="text-white/90" />
            </BaseButton>
          </div>

          {/* 錄影計時 */}
          {isRecording && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-red-500 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="tabular-nums">{fmt(recTime)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceLandmarkCanvas;
