import type { ArtVariant } from "../content";

export type { ArtVariant } from "../content";

type EditorialArtProps = {
  label: string;
  variant: ArtVariant;
  compact?: boolean;
  caption?: string;
};

export function EditorialArt({ label, variant, compact = false, caption = "GOOD\nGRIEF!" }: EditorialArtProps) {
  return (
    <div className={`editorial-art scene-${variant}${compact ? " compact" : ""}`} aria-hidden="true">
      <span className="art-number">{label}</span>
      <div className="art-sun" />
      <div className="art-house"><i /></div>
      <div className="art-line" />
      <strong>{caption.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</strong>
    </div>
  );
}
