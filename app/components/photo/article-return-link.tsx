"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { requestArticleScrollRestore } from "../motion/scroll-memory";

type ArticleReturnLinkProps = {
  href: string;
  className: string;
  children: ReactNode;
};

export function ArticleReturnLink({ href, className, children }: ArticleReturnLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    requestArticleScrollRestore(href);
  };

  return (
    <Link className={className} href={href} scroll={false} onClick={handleClick}>
      {children}
    </Link>
  );
}
