import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  titleId?: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeading({ eyebrow, title, titleId, description, action }: SectionHeadingProps) {
  return (
    <div className="editorial-heading">
      <div><span className="eyebrow">{eyebrow}</span><h2 id={titleId}>{title}</h2></div>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
