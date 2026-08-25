import { useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import "./SafeImage.css";

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string;
  fallbackClassName?: string;
};

export default function SafeImage({
  src,
  alt = "",
  fallbackClassName = "",
  onError,
  ...imageProps
}: SafeImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!src || failedSource === src) {
    return (
      <span
        className={`safe-image-fallback ${fallbackClassName}`.trim()}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
      >
        <ImageOff size={34} strokeWidth={1.8} aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      {...imageProps}
      src={src}
      alt={alt}
      onError={(event) => {
        onError?.(event);
        setFailedSource(src);
      }}
    />
  );
}
