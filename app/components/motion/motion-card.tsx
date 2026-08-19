"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type MotionCardProps = {
  children: ReactNode;
};

export function MotionCard({ children }: MotionCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="motion-card"
      whileTap={reduceMotion ? undefined : {
        scale: 0.995,
        transition: { type: "spring", stiffness: 520, damping: 34, mass: 0.5, delay: 0 },
      }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
