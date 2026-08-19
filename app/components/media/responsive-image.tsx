import type { MediaAsset } from "../../content";

const responsiveWidths = [480, 768, 1200, 1600];

function optimizedPath(src: string, width: number, format: "avif" | "webp") {
  const extensionIndex = src.lastIndexOf(".");
  const basename = extensionIndex === -1 ? src : src.slice(0, extensionIndex);
  return `/_optimized${basename}-${width}.${format}`;
}

function sourceSet(image: MediaAsset, format: "avif" | "webp") {
  const widths = [...responsiveWidths.filter((width) => width < image.width), image.width];

  return widths
    .map((width) => `${optimizedPath(image.src, width, format)} ${width}w`)
    .join(", ");
}

type ResponsiveImageProps = {
  image: MediaAsset;
  className?: string;
  loading?: "eager" | "lazy";
  sizes?: string;
  fullResolution?: boolean;
};

export function ResponsiveImage({ image, className, loading = "lazy", sizes: sizesOverride, fullResolution = false }: ResponsiveImageProps) {
  const sizes = fullResolution ? `${image.width}px` : sizesOverride ?? (image.portrait
    ? "(max-width: 640px) calc(100vw - 40px), 540px"
    : "(max-width: 940px) calc(100vw - 40px), 900px");
  const avifSources = sourceSet(image, "avif");
  const webpSources = sourceSet(image, "webp");

  return (
    <picture className={className}>
      {avifSources && <source type="image/avif" srcSet={avifSources} sizes={sizes} />}
      {webpSources && <source type="image/webp" srcSet={webpSources} sizes={sizes} />}
      <img
        src={image.src}
        width={image.width}
        height={image.height}
        alt={image.alt}
        loading={loading}
        decoding="async"
        fetchPriority={loading === "eager" ? "high" : undefined}
      />
    </picture>
  );
}
