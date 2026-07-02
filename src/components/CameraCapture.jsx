import React, { useRef, useState } from "react";
import { Camera, X, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";

/**
 * Camera capture component. Opens camera, takes a photo, and sends it to the
 * Worker OCR endpoint so extracted text is indexed into the current app.
 */
export default function CameraCapture({ appId, onUploaded }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null); // dataURL preview
  const [blob, setBlob] = useState(null);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const prepareImage = (sourceBlob) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(sourceBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      c.getContext("2d").drawImage(img, 0, 0, width, height);
      c.toBlob((b) => resolve(b || sourceBlob), "image/jpeg", 0.82);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(sourceBlob);
    };
    img.src = url;
  });

  const startCamera = async () => {
    setOpen(true);
    setPreview(null);
    setBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      toast.error("Camera not available. You can pick a photo instead.");
      // Fallback: open the file picker that uses the device's camera if available
      fileInputRef.current?.click();
      setOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const close = () => {
    stopCamera();
    setOpen(false);
    setPreview(null);
    setBlob(null);
  };

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = canvasRef.current || document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    c.toBlob((b) => {
      if (!b) return;
      setBlob(b);
      setPreview(URL.createObjectURL(b));
      stopCamera();
    }, "image/jpeg", 0.92);
  };

  const onFilePicked = (file) => {
    if (!file) return;
    setBlob(file);
    setPreview(URL.createObjectURL(file));
    setOpen(true);
  };

  const upload = async () => {
    if (!blob) return;
    if (!appId) {
      toast.error("Choose an app before using camera OCR");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      const filename = `camera-${Date.now()}.jpg`;
      const prepared = await prepareImage(blob);
      const file = new File([prepared], filename, { type: "image/jpeg" });
      fd.append("file", file);
      const { data } = await api.post(`/apps/${appId}/camera-ocr`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(data.text_extraction_message || "Captured and indexed OCR text");
      onUploaded?.();
      close();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Capture failed");
    } finally { setBusy(false); }
  };

  return (
    <>
      <button
        onClick={startCamera}
        className="border border-ink px-5 py-2.5 hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
        data-testid="open-camera-btn"
      >
        <Camera size={14} /> Capture with camera
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => onFilePicked(e.target.files?.[0])}
        data-testid="camera-fallback-input"
      />

      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4" data-testid="camera-modal">
          <div className="bg-white border border-ink w-full max-w-2xl">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <div className="font-serif text-xl">Capture document</div>
              <button onClick={close} className="text-gray-500 hover:text-ink" data-testid="close-camera"><X size={18} /></button>
            </div>
            <div className="relative bg-black aspect-[4/3] flex items-center justify-center">
              {!preview ? (
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              ) : (
                <img src={preview} alt="capture" className="w-full h-full object-contain" />
              )}
              <canvas ref={canvasRef} hidden />
            </div>
            <div className="p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-gray-600">
                {!preview ? "Aim at your document. Good lighting helps OCR accuracy." : "Looks good? ADA will extract the text and index it into the app."}
              </div>
              <div className="flex gap-2">
                {!preview ? (
                  <button onClick={snap} className="bg-ink text-white px-5 py-2.5 hover:bg-klein transition-colors text-sm flex items-center gap-2" data-testid="snap-btn">
                    <Camera size={14} /> Take photo
                  </button>
                ) : (
                  <>
                    <button onClick={startCamera} className="border border-ink px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-2" data-testid="retake-btn">
                      <RotateCcw size={14} /> Retake
                    </button>
                    <button onClick={upload} disabled={busy} className="bg-ink text-white px-5 py-2.5 hover:bg-klein transition-colors text-sm flex items-center gap-2 disabled:opacity-50" data-testid="confirm-capture-btn">
                      <Check size={14} /> {busy ? "Processing OCR..." : "Use photo"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
