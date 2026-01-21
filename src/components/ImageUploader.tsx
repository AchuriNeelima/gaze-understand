import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, Camera, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  onImageSelect: (imageData: string) => void;
  isLoading?: boolean;
  currentImage?: string | null;
  onClear?: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelect,
  isLoading = false,
  currentImage,
  onClear,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  }, []);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result && result.length > 100) {
        onImageSelect(result);
      } else {
        toast({
          title: "Error",
          description: "Failed to read image file. Please try again.",
          variant: "destructive",
        });
      }
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read image file.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera not available",
        description: "Please use the file upload option instead.",
        variant: "destructive",
      });
      document.getElementById('file-input')?.click();
    }
  };

  const handleVideoReady = useCallback(() => {
    setIsCameraReady(true);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setIsCameraReady(false);
  }, []);

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    setIsCameraReady(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      toast({
        title: "Error",
        description: "Could not switch camera.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast({
        title: "Error",
        description: "Camera not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast({
        title: "Error",
        description: "Camera is still loading. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);

      if (imageData && imageData.length > 100 && imageData.startsWith('data:image/')) {
        stopCamera();
        onImageSelect(imageData);
      } else {
        toast({
          title: "Error",
          description: "Failed to capture photo. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Camera view
  if (isCameraOpen) {
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
            <Button
              variant="secondary"
              size="icon-lg"
              onClick={stopCamera}
              aria-label="Close camera"
            >
              <X className="h-6 w-6" />
            </Button>

            <Button
              variant="hero"
              size="xl"
              onClick={capturePhoto}
              disabled={!isCameraReady}
              className="rounded-full w-20 h-20"
              aria-label="Take photo"
            >
              <Camera className="h-8 w-8" />
            </Button>

            <Button
              variant="secondary"
              size="icon-lg"
              onClick={switchCamera}
              aria-label="Switch camera"
            >
              <SwitchCamera className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (currentImage) {
    return (
      <div className="relative animate-scale-in">
        <div className="relative rounded-2xl overflow-hidden border-2 border-border bg-card">
          <img
            src={currentImage}
            alt="Uploaded image for caption generation"
            className="w-full h-auto max-h-[400px] object-contain"
          />
          {onClear && !isLoading && (
            <Button
              variant="secondary"
              size="icon"
              onClick={onClear}
              className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm hover:bg-background"
              aria-label="Remove image and upload a new one"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "upload-zone p-8 md:p-12 text-center cursor-pointer transition-all duration-300",
        isDragOver && "drag-over"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label="Image upload area. Click or drag and drop an image here."
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          document.getElementById('file-input')?.click();
        }
      }}
    >
      <input
        id="file-input"
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      <div className="flex flex-col items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          {isDragOver ? (
            <ImageIcon className="w-10 h-10 text-primary" aria-hidden="true" />
          ) : (
            <Upload className="w-10 h-10 text-primary" aria-hidden="true" />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-accessible-lg font-semibold text-foreground">
            {isDragOver ? 'Drop your image here' : 'Capture or upload an image'}
          </p>
          <p className="text-muted-foreground">
            Use your camera or choose a file from your device
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Button
            variant="hero"
            size="lg"
            onClick={startCamera}
            aria-label="Open camera to take a photo"
          >
            <Camera className="mr-2" aria-hidden="true" />
            Take Photo
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => document.getElementById('file-input')?.click()}
            aria-label="Choose an image file from your device"
          >
            <Upload className="mr-2" aria-hidden="true" />
            Choose File
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Supports JPG, PNG, GIF, WebP
        </p>
      </div>
    </div>
  );
};
