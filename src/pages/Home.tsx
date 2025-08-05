// import { Helmet } from "react-helmet";
import FaceLandmarkCanvas from "@/components/FaceLandmarkCanvas";

export default function Home() {
  return (
    <div className="w-full min-h-[100dvh] flex flex-col justify-center items-center">
      {/* <Helmet>
        <title>Mediapie FaceLandmarker Demo</title>
        <meta
          name="description"
          content="A demo application showcasing Mediapie FaceLandmarker's real-time facial landmark and blendshape score estimation."
        />
        <meta
          name="keywords"
          content="Mediapie, FaceLandmarker, AR Filter, ReadyPlayerMe, Facial landmarks, tensorflow-js"
        />
      </Helmet> */}
      {/* <h1 className="text-xl md:text-4xl font-bold mb-2 text-shadow text-center">
        Mediapie FaceLandmarker Demo
      </h1>
      <p className="mt-4 mb-4 text-center px-4 md:text-lg text-sm">
        Detect the most prominent face from an input image, then estimate 478 3D
        facial landmarks and 52 facial blendshape scores in real-time.
      </p> */}
      <div className="w-full flex justify-center">
        <FaceLandmarkCanvas />
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------------------------------

// import { useEffect, useRef } from "react";
// import Webcam from "react-webcam";
// import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

// const MODEL_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
// const LANDMARKER_MODEL =
//   "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// export default function Home() {
//   const webcamRef = useRef<Webcam>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   useEffect(() => {
//     let faceLandmarker: FaceLandmarker;
//     let rafId: number;

//     const init = async () => {
//       const vision = await FilesetResolver.forVisionTasks(MODEL_URL);
//       faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
//         baseOptions: {
//           modelAssetPath: LANDMARKER_MODEL,
//           delegate: "GPU",
//         },
//         runningMode: "VIDEO",
//         outputFaceBlendshapes: true,
//         outputFacialTransformationMatrixes: true,
//         numFaces: 1,
//       });

//       const detect = async () => {
//         if (webcamRef.current && webcamRef.current.video?.readyState === 4) {
//           const video = webcamRef.current.video!;
//           const results = await faceLandmarker.detectForVideo(
//             video,
//             Date.now()
//           );

//           const canvas = canvasRef.current;
//           const ctx = canvas?.getContext("2d");
//           if (canvas && ctx) {
//             ctx.clearRect(0, 0, canvas.width, canvas.height);
//             ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

//             if (results.faceLandmarks.length > 0) {
//               ctx.fillStyle = "red";
//               for (const landmark of results.faceLandmarks[0]) {
//                 const x = landmark.x * canvas.width;
//                 const y = landmark.y * canvas.height;
//                 ctx.beginPath();
//                 ctx.arc(x, y, 2, 0, 2 * Math.PI);
//                 ctx.fill();
//               }
//             }
//           }
//         }
//         rafId = requestAnimationFrame(detect);
//       };

//       detect();
//     };

//     init();
//     return () => cancelAnimationFrame(rafId);
//   }, []);

//   return (
//     <div className="w-full h-[100dvh] flex justify-center items-center">
//       <Webcam
//         ref={webcamRef}
//         audio={false}
//         mirrored
//         className="absolute top-0 left-0 opacity-0 *:pointer-events-none"
//         videoConstraints={{ facingMode: "user" }}
//       />
//       <canvas
//         ref={canvasRef}
//         // className="w-full"
//         // width={1024}
//         // height={768}
//         width={640}
//         height={480}
//         // style={{ border: "1px solid black" }}
//       />
//     </div>
//   );
// }
