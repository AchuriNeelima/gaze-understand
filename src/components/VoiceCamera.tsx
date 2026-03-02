import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, SwitchCamera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface VoiceCameraProps {
  isOpen: boolean;
  onCapture: (imageData: string) => void;
  onClose: () => void;
  triggerCapture: boolean;
  onCaptureHandled: () => void;
}

export const VoiceCamera: React.FC<VoiceCameraProps> = ({
  isOpen,
  onCapture,
  onClose,
  triggerCapture,
  onCaptureHandled,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      setIsCameraReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast({ title: 'Camera not available', description: 'Could not access camera.', variant: 'destructive' });
      onClose();
    }
  }, [onClose]);

  // Start/stop camera when isOpen changes
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const doCapture = useCallback((): boolean => {
    if (!videoRef.current || !canvasRef.current) return false;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return false;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      if (imageData && imageData.length > 100 && imageData.startsWith('data:image/')) {
        stopCamera();
        onCapture(imageData);
        return true;
      }
      toast({ title: 'Error', description: 'Failed to capture photo.', variant: 'destructive' });
    }

    return false;
  }, [stopCamera, onCapture]);

  // Handle voice-triggered capture
  useEffect(() => {
    if (triggerCapture && isCameraReady) {
      if (doCapture()) {
        onCaptureHandled();
        return;
      }

      const retryInterval = setInterval(() => {
        if (doCapture()) {
          onCaptureHandled();
          clearInterval(retryInterval);
        }
      }, 200);

      return () => clearInterval(retryInterval);
    }
  }, [triggerCapture, isCameraReady, doCapture, onCaptureHandled]);

  const handleVideoReady = useCallback(() => {
    setIsCameraReady(true);
  }, []);

  const switchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    stopCamera();
    await startCamera(newFacing);
  };

  if (!isOpen) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-primary bg-card animate-scale-in">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onCanPlay={handleVideoReady}
        className="w-full h-auto max-h-[400px] object-cover"
        aria-label="Camera preview"
      />
      <canvas ref={canvasRef} className="hidden" />

      {!isCameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <p className="text-muted-foreground">Starting camera...</p>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/90 to-transparent">
        <div className="flex items-center justify-center gap-4">
          <Button variant="secondary" size="icon-lg" onClick={() => { stopCamera(); onClose(); }} aria-label="Close camera">
            <X className="h-6 w-6" />
          </Button>
          <Button
            variant="hero"
            size="xl"
            onClick={doCapture}
            disabled={!isCameraReady}
            className="rounded-full w-20 h-20"
            aria-label="Take photo"
          >
            <Camera className="h-8 w-8" />
          </Button>
          <Button variant="secondary" size="icon-lg" onClick={switchCamera} aria-label="Switch camera">
            <SwitchCamera className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {isCameraReady && (
        <div className="absolute top-4 left-4 bg-background/70 rounded-lg px-3 py-1.5 text-sm text-muted-foreground">
          Say <span className="font-semibold text-primary">"Capture"</span> or tap the button
        </div>
      )}
    </div>
  );
};
