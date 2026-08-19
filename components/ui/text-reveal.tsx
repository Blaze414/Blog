"use client";

import {
  AnimatePresence,
  motion,
  type Transition,
  type Variants,
  useReducedMotion,
} from "framer-motion";
import type React from "react";
import { cn } from "@/lib/utils";

export type TextRevealPreset = "blur" | "fade-in-blur" | "scale" | "fade" | "slide";
export type TextRevealPer = "word" | "char" | "line";

export type TextRevealProps = {
  children: string;
  per?: TextRevealPer;
  as?: keyof React.JSX.IntrinsicElements;
  variants?: { container?: Variants; item?: Variants };
  className?: string;
  preset?: TextRevealPreset;
  delay?: number;
  speedReveal?: number;
  speedSegment?: number;
  trigger?: boolean;
  onAnimationComplete?: () => void;
  onAnimationStart?: () => void;
  segmentWrapperClassName?: string;
  containerTransition?: Transition;
  segmentTransition?: Transition;
  style?: React.CSSProperties;
};

const defaultStaggerTimes: Record<TextRevealPer, number> = {
  char: 0.025,
  line: 0.09,
  word: 0.04,
};

const defaultContainerVariants: Variants = {
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const defaultItemVariants: Variants = {
  exit: { opacity: 0 },
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const presetVariants: Record<TextRevealPreset, { container: Variants; item: Variants }> = {
  blur: {
    container: defaultContainerVariants,
    item: {
      exit: { filter: "blur(8px)", opacity: 0 },
      hidden: { filter: "blur(8px)", opacity: 0 },
      visible: { filter: "blur(0px)", opacity: 1 },
    },
  },
  fade: {
    container: defaultContainerVariants,
    item: defaultItemVariants,
  },
  "fade-in-blur": {
    container: defaultContainerVariants,
    item: {
      exit: { filter: "blur(8px)", opacity: 0, y: 8 },
      hidden: { filter: "blur(8px)", opacity: 0, y: 8 },
      visible: { filter: "blur(0px)", opacity: 1, y: 0 },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      exit: { opacity: 0, scale: 0.94 },
      hidden: { opacity: 0, scale: 0.94 },
      visible: { opacity: 1, scale: 1 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      exit: { opacity: 0, y: 12 },
      hidden: { opacity: 0, y: 12 },
      visible: { opacity: 1, y: 0 },
    },
  },
};

function splitText(text: string, per: TextRevealPer) {
  if (per === "line") return text.split("\n");
  if (per === "word") return text.match(/\S+\s*/g) ?? [];
  return [...text];
}

function SegmentItem({
  segment,
  variants,
  per,
  wrapperClassName,
}: {
  segment: string;
  variants: Variants;
  per: TextRevealPer;
  wrapperClassName?: string;
}) {
  const content = (
    <motion.span
      aria-hidden="true"
      className={per === "line" ? "block" : "inline-block whitespace-pre"}
      variants={variants}
    >
      {segment}
    </motion.span>
  );

  if (!wrapperClassName) return content;

  return (
    <span className={cn(per === "line" ? "block" : "inline-block", wrapperClassName)}>
      {content}
    </span>
  );
}

export function TextReveal({
  children,
  per = "word",
  as = "p",
  variants,
  className,
  preset = "fade",
  delay = 0,
  speedReveal = 1,
  speedSegment = 1,
  trigger = true,
  onAnimationComplete,
  onAnimationStart,
  segmentWrapperClassName,
  containerTransition,
  segmentTransition,
  style,
}: TextRevealProps) {
  const reduceMotion = useReducedMotion();
  const segments = splitText(children, per);
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;
  const base = presetVariants[preset];
  const stagger = defaultStaggerTimes[per] / speedReveal;
  const baseDuration = 0.28 / speedSegment;

  const containerVars: Variants = {
    ...base.container,
    visible: {
      ...base.container.visible,
      transition: reduceMotion
        ? { duration: 0 }
        : { delayChildren: delay, staggerChildren: stagger, ...containerTransition },
    },
  };

  const itemVars: Variants = {
    ...base.item,
    hidden: reduceMotion ? { opacity: 1, filter: "none", y: 0, scale: 1 } : base.item.hidden,
    visible: {
      ...(base.item.visible as object),
      transition: reduceMotion ? { duration: 0 } : { duration: baseDuration, ...segmentTransition },
    },
  };

  const computedVariants = variants
    ? {
        container: { ...containerVars, ...variants.container },
        item: { ...itemVars, ...variants.item },
      }
    : { container: containerVars, item: itemVars };

  return (
    <AnimatePresence>
      {trigger && (
        <MotionTag
          aria-label={children}
          className={className}
          initial={reduceMotion ? "visible" : "hidden"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.55 }}
          exit={reduceMotion ? "visible" : "exit"}
          onAnimationComplete={onAnimationComplete}
          onAnimationStart={onAnimationStart}
          style={style}
          variants={computedVariants.container}
        >
          {segments.map((segment, index) => (
            <SegmentItem
              key={`${per}-${index}-${segment}`}
              per={per}
              segment={segment}
              variants={computedVariants.item}
              wrapperClassName={segmentWrapperClassName}
            />
          ))}
        </MotionTag>
      )}
    </AnimatePresence>
  );
}

export default TextReveal;
