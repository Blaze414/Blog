import Link from "next/link";

type BrandLockupProps = {
  href?: string;
  ariaLabel?: string;
};

export function BrandLockup({ href = "/", ariaLabel = "Snoopy HQ Journal home" }: BrandLockupProps) {
  return (
    <Link className="brand" href={href} aria-label={ariaLabel}>
      <span className="brand-mark" aria-hidden="true"><span>S</span><i /></span>
      <span><strong>Snoopy HQ</strong><small>Journal</small></span>
    </Link>
  );
}
