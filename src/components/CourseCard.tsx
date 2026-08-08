import { Link } from "@tanstack/react-router";
import { CalendarDays, Users, ShieldCheck, Sparkles, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export type CourseListItem = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  track: "peer" | "training" | "workshop" | "kids";
  peer_led: boolean;
  cover_url: string | null;
  level: string | null;
  seats: number;
  enrolled_count: number;
  starts_on: string | null;
  status: string;
  day_count?: number;
  category?: { name: string; slug: string } | null;
  host?: { display_name: string | null; avatar_url: string | null } | null;
};

export function CourseCard({ c, playful = false }: { c: CourseListItem; playful?: boolean }) {
  return (
    <Link
      to="/courses/$slug"
      params={{ slug: c.slug }}
      className={`glass group block overflow-hidden shadow-soft transition-all hover:-translate-y-1 hover:shadow-lg ${
        playful ? "rounded-[2rem] hover:rotate-[-0.6deg]" : "rounded-2xl"
      }`}
    >
      {c.cover_url ? (
        <img src={c.cover_url} alt={c.title} loading="lazy" className="h-32 w-full object-cover" />
      ) : (
        <div className="h-32 w-full bg-brand-gradient opacity-90" />
      )}
      <div className="p-5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {c.peer_led ? (
            <Badge variant="outline" className="rounded-full border-primary/40 text-primary">
              <Users className="mr-1 h-3 w-3" /> Peer-to-peer
            </Badge>
          ) : (
            <Badge variant="secondary" className="rounded-full">
              <ShieldCheck className="mr-1 h-3 w-3" /> Verified tutor
            </Badge>
          )}
          <Badge variant="secondary" className="rounded-full">Free</Badge>
          {c.level && <Badge variant="outline" className="rounded-full capitalize">{c.level}</Badge>}
        </div>

        <h3 className={`line-clamp-2 font-semibold leading-tight group-hover:gradient-text ${playful ? "font-kid text-lg" : "text-base"}`}>
          {c.title}
        </h3>
        {c.tagline && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{c.tagline}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {typeof c.day_count === "number" && (
            <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> {c.day_count}-day blueprint</span>
          )}
          {c.starts_on && (
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {format(new Date(c.starts_on), "MMM d")}</span>
          )}
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {c.enrolled_count}/{c.seats}</span>
          {c.category && <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> {c.category.name}</span>}
        </div>
      </div>
    </Link>
  );
}
