import Link from "next/link";
import { ClipboardList, Droplets, MapPin } from "lucide-react";

const actions = [
  {
    href: "/manager/map",
    label: "Farm map",
    description: "Hotspots and worker locations",
    icon: MapPin,
  },
  {
    href: "/manager/scouting",
    label: "Scouting",
    description: "Ratings and greenhouse issues",
    icon: ClipboardList,
  },
  {
    href: "/manager/spray",
    label: "Log spray",
    description: "Record a spray in the field",
    icon: Droplets,
  },
] as const;

export function ManagerQuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {actions.map(({ href, label, description, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="glass-card flex items-start gap-3 rounded-2xl p-4 transition hover:bg-primary/5"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
