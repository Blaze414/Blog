"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ZoomIn } from "lucide-react";
import { useCallback, useState } from "react";
import type { BlogImage } from "../content";
import { FocusedImageDialog } from "./media/focused-image-dialog";
import { ResponsiveImage } from "./media/responsive-image";

type ArticlePhotoProps = {
  image: BlogImage;
  hero?: boolean;
  priority?: boolean;
};

export function ArticlePhoto({ image, hero = false, priority = false }: ArticlePhotoProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  return (
    <figure className={`article-photo${image.portrait ? " portrait" : ""}${hero ? " hero" : ""}`}>
      <motion.div
        className="article-photo-motion"
        whileTap={reduceMotion ? undefined : { scale: 0.997 }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34, mass: 0.5 }}
      >
        <button
          type="button"
          className="article-photo-trigger"
          aria-label={`View image: ${image.alt}`}
          aria-haspopup="dialog"
          aria-controls={`focused-image-${image.id}`}
          aria-expanded={viewerOpen}
          onClick={() => setViewerOpen(true)}
        >
          <ResponsiveImage image={image} loading={priority ? "eager" : "lazy"} sizes={hero ? "(max-width: 1150px) calc(100vw - 40px), 1104px" : undefined} />
          <span className="photo-view">
            <ZoomIn size={16} aria-hidden="true" />
            View
          </span>
        </button>
      </motion.div>
      <figcaption>{image.caption}</figcaption>
      <FocusedImageDialog image={image} open={viewerOpen} onClose={closeViewer} />
    </figure>
  );
}
