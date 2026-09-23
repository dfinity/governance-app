import { AlertTriangle, ScanQrCode } from 'lucide-react';
import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@components/Alert';
import { Button } from '@components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@components/Dialog';
import { loadQrDecoder, parseScannedAddress } from '@utils/qrScanner';
import { cn } from '@utils/shadcn';

// Time between two detection attempts. Decoding every frame drains the battery
// with no gain, because a QR code stays in view for many frames.
const DETECT_INTERVAL_MS = 150;
// Longest side of the frame handed to the decoder. Smaller frames decode faster
// and a QR code that fills the viewfinder stays readable at this size.
const MAX_DECODE_SIZE_PX = 480;

enum Status {
  Scanning = 'scanning',
  CameraError = 'cameraError',
  LoadError = 'loadError',
  InvalidCode = 'invalidCode',
}

type Props = {
  onScan: (address: string) => void;
  className?: string;
};

export const ScanAddressButton: React.FC<Props> = ({ onScan, className }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleScan = (address: string) => {
    onScan(address);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn('text-muted-foreground', className)}
        aria-label={t(($) => $.account.scanQrCode)}
        data-testid="scan-address-btn"
        onClick={() => setOpen(true)}
      >
        <ScanQrCode aria-hidden />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t(($) => $.account.scanQrTitle)}</DialogTitle>
            <DialogDescription>{t(($) => $.account.scanQrDescription)}</DialogDescription>
          </DialogHeader>
          {open && <QrScanner onScan={handleScan} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

type QrScannerProps = {
  onScan: (address: string) => void;
};

function QrScanner({ onScan }: QrScannerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState(Status.Scanning);

  const handleDetected = useEffectEvent((raw: string): boolean => {
    const address = parseScannedAddress(raw);
    if (address === undefined) {
      setStatus(Status.InvalidCode);
      return false;
    }
    onScan(address);
    return true;
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const readFrame = (): ImageData | undefined => {
      if (!context || video.videoWidth === 0) return undefined;
      const scale = Math.min(1, MAX_DECODE_SIZE_PX / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return context.getImageData(0, 0, canvas.width, canvas.height);
    };

    const start = async () => {
      let decode: Awaited<ReturnType<typeof loadQrDecoder>>;
      try {
        decode = await loadQrDecoder();
      } catch {
        if (!cancelled) setStatus(Status.LoadError);
        return;
      }

      const tick = () => {
        if (cancelled) return;
        if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
          const frame = readFrame();
          const raw = frame && decode(frame);
          if (raw !== undefined && handleDetected(raw)) return;
        }
        timer = setTimeout(tick, DETECT_INTERVAL_MS);
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch {
        if (!cancelled) setStatus(Status.CameraError);
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // The effect cleanup pauses the video, which rejects a pending play().
        // Any other rejection means the browser blocked playback.
        if (!cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          setStatus(Status.CameraError);
        }
        return;
      }
      timer = setTimeout(tick, DETECT_INTERVAL_MS);
    };

    start();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto aspect-square w-full max-w-[50dvh] overflow-hidden rounded-md bg-black">
        <video
          ref={videoRef}
          className="size-full object-cover"
          autoPlay
          muted
          playsInline
          data-testid="scan-address-video"
        />
        {status !== Status.CameraError && status !== Status.LoadError && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[15%] rounded-lg border-2 border-white/80"
          />
        )}
      </div>
      {status === Status.CameraError && (
        <Alert variant="warning">
          <AlertTriangle className="size-4 text-destructive" />
          <AlertDescription>{t(($) => $.account.scanQrCameraError)}</AlertDescription>
        </Alert>
      )}
      {status === Status.LoadError && (
        <Alert variant="warning">
          <AlertTriangle className="size-4 text-destructive" />
          <AlertDescription>{t(($) => $.account.scanQrLoadError)}</AlertDescription>
        </Alert>
      )}
      {status === Status.InvalidCode && (
        <Alert variant="warning">
          <AlertTriangle className="size-4 text-destructive" />
          <AlertDescription>{t(($) => $.account.scanQrInvalid)}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
