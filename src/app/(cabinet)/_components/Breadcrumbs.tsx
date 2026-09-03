import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

/** Each page composes its own trail ("Home › Dashboard", "Home › Orders › FR001383") — not baked
 * into the shared layout, since the segments differ per screen. */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className="mb-2 text-xs text-muted">
      {items.map((item, i) => (
        <span key={`${i}-${item.label}`}>
          {item.href ? (
            <Link href={item.href} className="text-blue hover:underline">
              {item.label}
            </Link>
          ) : (
            item.label
          )}
          {i < items.length - 1 && <span className="mx-1.5 text-blue">›</span>}
        </span>
      ))}
    </div>
  );
}
