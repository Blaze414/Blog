"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ExternalLink, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { createPortal } from "react-dom";
import type { BlogImage } from "../../content";
import { ImageZoomControls } from "./image-zoom-controls";
import { ResponsiveImage } from "./responsive-image";

type FocusedImageDialogProps = {
  image: BlogImage;
  open: boolean;
  onClose: () => void;
};

type Point = { x: number; y: number };
type PinchStart = { distance: number; scale: number };

const MINIMUM_SCALE = 1;
const MAXIMUM_SCALE = 5;
const BUTTON_SCALE_STEP = 0.25;
const WHEEL_SCALE_STEP = 0.25;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function FocusedImageDialog({ image, open, onClose }: FocusedImageDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const controlsId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageContentRef = useRef<HTMLDivElement>(null);
  const controlsShellRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ pointer: Point; pan: Point } | null>(null);
  const pointerPositionsRef = useRef(new Map<number, Point>());
  const pinchStartRef = useRef<PinchStart | null>(null);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scaleRef = useRef(MINIMUM_SCALE);
  const panRef = useRef<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(MINIMUM_SCALE);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("Image fitted to the screen");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const clampPan = useCallback((point: Point, nextScale: number) => {
    const stage = stageRef.current;
    const content = imageContentRef.current;
    if (!stage || !content || nextScale <= MINIMUM_SCALE) return { x: 0, y: 0 };

    const maximumX = Math.max(0, (content.offsetWidth * nextScale - stage.clientWidth) / 2);
    const maximumY = Math.max(0, (content.offsetHeight * nextScale - stage.clientHeight) / 2);
    return {
      x: clamp(point.x, -maximumX, maximumX),
      y: clamp(point.y, -maximumY, maximumY),
    };
  }, []);

  const setZoom = useCallback((nextScale: number, focalPoint?: Point) => {
    const normalizedScale = clamp(Math.round(nextScale * 4) / 4, MINIMUM_SCALE, MAXIMUM_SCALE);
    const currentScale = scaleRef.current;
    let nextPan = panRef.current;

    if (focalPoint && stageRef.current && normalizedScale !== currentScale) {
      const bounds = stageRef.current.getBoundingClientRect();
      const localPoint = {
        x: focalPoint.x - bounds.left - bounds.width / 2,
        y: focalPoint.y - bounds.top - bounds.height / 2,
      };
      const contentPoint = {
        x: (localPoint.x - nextPan.x) / currentScale,
        y: (localPoint.y - nextPan.y) / currentScale,
      };
      nextPan = {
        x: localPoint.x - contentPoint.x * normalizedScale,
        y: localPoint.y - contentPoint.y * normalizedScale,
      };
    }

    const constrainedPan = clampPan(nextPan, normalizedScale);
    scaleRef.current = normalizedScale;
    panRef.current = constrainedPan;
    setScale(normalizedScale);
    setPan(constrainedPan);
    setControlsOpen(true);
    setAnnouncement(normalizedScale === MINIMUM_SCALE
      ? "Image fitted to the screen"
      : `Image zoomed to ${Math.round(normalizedScale * 100)} percent`);
  }, [clampPan]);

  const resetView = useCallback(() => {
    scaleRef.current = MINIMUM_SCALE;
    panRef.current = { x: 0, y: 0 };
    setScale(MINIMUM_SCALE);
    setPan({ x: 0, y: 0 });
    setAnnouncement("Image fitted to the screen");
  }, []);

  const closeDialog = useCallback(() => {
    setControlsOpen(false);
    resetView();
    onClose();
  }, [onClose, resetView]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])"));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [closeDialog, open]);

  useEffect(() => {
    if (!open) return;

    const handleZoomKeys = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setZoom(scaleRef.current + BUTTON_SCALE_STEP);
      } else if (event.key === "-") {
        event.preventDefault();
        setZoom(scaleRef.current - BUTTON_SCALE_STEP);
      } else if (event.key === "0") {
        event.preventDefault();
        resetView();
      } else if (scale > MINIMUM_SCALE && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const distance = event.shiftKey ? 80 : 36;
        const nextPan = clampPan({
          x: panRef.current.x + (event.key === "ArrowLeft" ? distance : event.key === "ArrowRight" ? -distance : 0),
          y: panRef.current.y + (event.key === "ArrowUp" ? distance : event.key === "ArrowDown" ? -distance : 0),
        }, scaleRef.current);
        panRef.current = nextPan;
        setPan(nextPan);
      }
    };

    window.addEventListener("keydown", handleZoomKeys);
    return () => window.removeEventListener("keydown", handleZoomKeys);
  }, [clampPan, open, resetView, scale, setZoom]);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => setPan((current) => clampPan(current, scale));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPan, open, scale]);

  useEffect(() => () => {
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
  }, []);

  const revealControls = () => {
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    setControlsOpen(true);
  };

  const scheduleControlsHide = () => {
    if (scale > MINIMUM_SCALE) return;
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = setTimeout(() => {
      if (!controlsShellRef.current?.contains(document.activeElement)) setControlsOpen(false);
    }, 650);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    setZoom(
      scaleRef.current + (event.deltaY < 0 ? WHEEL_SCALE_STEP : -WHEEL_SCALE_STEP),
      { x: event.clientX, y: event.clientY },
    );
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("button, a")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointerPositionsRef.current.size === 2) {
      const [first, second] = Array.from(pointerPositionsRef.current.values());
      pinchStartRef.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        scale: scaleRef.current,
      };
      dragStartRef.current = null;
      setDragging(false);
      return;
    }

    if (scaleRef.current <= MINIMUM_SCALE || event.button !== 0) return;
    dragStartRef.current = { pointer: { x: event.clientX, y: event.clientY }, pan: panRef.current };
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerPositionsRef.current.has(event.pointerId)) {
      pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (pinchStartRef.current && pointerPositionsRef.current.size >= 2) {
      const [first, second] = Array.from(pointerPositionsRef.current.values());
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      setZoom(pinchStartRef.current.scale * (distance / pinchStartRef.current.distance), midpoint);
      return;
    }

    const start = dragStartRef.current;
    if (!start) return;
    const nextPan = clampPan({
      x: start.pan.x + event.clientX - start.pointer.x,
      y: start.pan.y + event.clientY - start.pointer.y,
    }, scaleRef.current);
    panRef.current = nextPan;
    setPan(nextPan);
  };

  const endDrag = (event?: ReactPointerEvent<HTMLDivElement>) => {
    if (event) pointerPositionsRef.current.delete(event.pointerId);
    if (pointerPositionsRef.current.size < 2) pinchStartRef.current = null;
    dragStartRef.current = null;
    setDragging(false);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="focused-image-overlay"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            className={`focused-image-dialog${image.portrait ? " is-portrait" : ""}`}
            id={`focused-image-${image.id}`}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`focused-image-title-${image.id}`}
            aria-describedby={`focused-image-caption-${image.id}`}
          >
            <button ref={closeButtonRef} className="focused-image-close" type="button" onClick={closeDialog} aria-label="Close image viewer">
              <X size={21} aria-hidden="true" />
            </button>

            <div
              ref={stageRef}
              className={`focused-image-stage${scale > MINIMUM_SCALE ? " is-zoomed" : ""}${dragging ? " is-dragging" : ""}`}
              aria-label="Zoomable image. Use the visible controls, keyboard plus and minus keys, or the mouse wheel."
              onWheel={handleWheel}
              onDoubleClick={(event) => {
                if (event.target instanceof Element && event.target.closest("button, a")) return;
                if (scaleRef.current === MINIMUM_SCALE) {
                  setZoom(2, { x: event.clientX, y: event.clientY });
                } else {
                  resetView();
                }
              }}
              onPointerEnter={(event) => event.pointerType === "mouse" && revealControls()}
              onPointerLeave={(event) => event.pointerType === "mouse" && scheduleControlsHide()}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLostPointerCapture={endDrag}
            >
              <motion.div
                ref={imageContentRef}
                className="focused-image-zoom-content"
                animate={{ scale, x: pan.x, y: pan.y }}
                transition={dragging || reduceMotion ? { duration: 0 } : { duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              >
                <ResponsiveImage
                  image={image}
                  loading="eager"
                  fullResolution
                />
              </motion.div>

              <div
                ref={controlsShellRef}
                className={`focused-image-controls-shell${controlsOpen || scale > MINIMUM_SCALE ? " is-open" : ""}`}
                onFocusCapture={revealControls}
                onMouseEnter={revealControls}
                onMouseLeave={scheduleControlsHide}
              >
                {controlsOpen || scale > MINIMUM_SCALE ? (
                  <motion.div
                    className="focused-image-control-dock"
                    initial={reduceMotion ? false : { opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.14 }}
                  >
                    <ImageZoomControls
                      id={controlsId}
                      scale={scale}
                      minimumScale={MINIMUM_SCALE}
                      maximumScale={MAXIMUM_SCALE}
                      onZoomOut={() => setZoom(scaleRef.current - BUTTON_SCALE_STEP)}
                      onZoomIn={() => setZoom(scaleRef.current + BUTTON_SCALE_STEP)}
                      onReset={resetView}
                    />
                  </motion.div>
                ) : (
                  <button
                    type="button"
                    className="focused-image-zoom-launcher"
                    aria-controls={controlsId}
                    aria-expanded="false"
                    aria-label={`Show zoom controls, current zoom ${Math.round(scale * 100)} percent`}
                    aria-keyshortcuts="+ - 0"
                    onClick={revealControls}
                    onFocus={revealControls}
                  >
                    <ZoomIn size={18} aria-hidden="true" />
                    <span>Zoom</span>
                    <strong>{Math.round(scale * 100)}%</strong>
                  </button>
                )}
              </div>
            </div>

            <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

            <footer className="focused-image-caption">
              <div>
                <span>Photograph</span>
                <h2 id={`focused-image-title-${image.id}`}>{image.title}</h2>
                <p id={`focused-image-caption-${image.id}`}>{image.caption}</p>
              </div>
              <a href={image.src} target="_blank" rel="noreferrer">
                Full resolution <ExternalLink size={15} aria-hidden="true" />
              </a>
            </footer>
          </section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
