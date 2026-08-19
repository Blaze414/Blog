"use client";

import { Maximize2, Minus, Plus } from "lucide-react";

type ImageZoomControlsProps = {
  id: string;
  scale: number;
  minimumScale: number;
  maximumScale: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
};

export function ImageZoomControls({
  id,
  scale,
  minimumScale,
  maximumScale,
  onZoomOut,
  onZoomIn,
  onReset,
}: ImageZoomControlsProps) {
  const percentage = Math.round(scale * 100);

  return (
    <div className="focused-image-toolbar" id={id} role="toolbar" aria-label="Image zoom controls">
      <button type="button" onClick={onZoomOut} disabled={scale <= minimumScale} aria-label="Zoom out">
        <Minus size={18} aria-hidden="true" />
      </button>
      <output
        className="focused-image-zoom-level"
        aria-label={scale === minimumScale ? "Image fitted to screen" : `Current zoom ${percentage} percent`}
      >
        {scale === minimumScale ? "Fit" : `${percentage}%`}
      </output>
      <button type="button" onClick={onZoomIn} disabled={scale >= maximumScale} aria-label="Zoom in">
        <Plus size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="focused-image-fit"
        onClick={onReset}
        disabled={scale === minimumScale}
        aria-label="Fit image to screen"
      >
        <Maximize2 size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
