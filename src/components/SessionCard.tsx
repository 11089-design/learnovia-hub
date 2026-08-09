import { Link } from "@tanstack/react-router";
import { Clock, Users, Tag, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export type SessionListItem = {
  id: string;
  title: string;
  description: string | null;
  format: "one_on_one" | "group";
  kind: "free" | "paid";
  price_cents: number;
  language: string;
  max_participants: number;
  starts_at: string | null;
  ends_at?: string | null;
  is_homework_help: boolean;
  status: string;
  category?: { name: string; slug: string } | null;
  tutor?: { display_name: string | null; avatar_url: string | null } | null;
};

export function SessionCard({ s }: { s: SessionListItem }) {
  return (
    <Link
      to="/sessions/$sessionId"
      params={{ sessionId: s.id }}
      className="glass group block overflow-hidden rounded-2xl p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="mb-3 flex items-center gap-2">
        {s.is_homework_help && (
          <Badge variant="secondary" className="rounded-full bg-accent text-accent-foreground">
            <HelpCircle className="mr-1 h-3 w-3" /> Homework
          </Badge>
        )}
        <Badge variant="outline" className="rounded-full capitalize">
          {s.format === "one_on_one" ? "1-on-1" : "Group"}
        </Badge>
        <Badge variant="secondary" className="rounded-full">Free</Badge>
      </div>

      <h3 className="line-clamp-2 text-base font-semibold leading-tight group-hover:gradient-text">
        {s.title}
      </h3>
      {s.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {s.category && (
          <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" /> {s.category.name}</span>
        )}
        {s.starts_at && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {format(new Date(s.starts_at), "MMM d, h:mm a")}
          </span>
        )}
        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> up to {s.max_participants}</span>
      </div>

      {s.tutor && (
        <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-3">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
            {(s.tutor.display_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <span className="text-xs text-muted-foreground">by {s.tutor.display_name ?? "Anonymous"}</span>
        </div>
      )}
    </Link>
  );
}
