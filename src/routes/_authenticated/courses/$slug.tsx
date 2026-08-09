import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, ShieldCheck, Users, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/courses/$slug")({
  head: () => ({
    meta: [
      { title: "Course — Learnova" },
      { name: "description", content: "A free multi-day Learnova course with a published day-by-day blueprint and mandatory attendance." },
      { property: "og:title", content: "Learnova course" },
      { property: "og:description", content: "Day-by-day blueprint, verified or peer-led tutor, free to join." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoursePage,
});

type Course = {
  id: string; slug: string; title: string; tagline: string | null; description: string | null;
  track: string; peer_led: boolean; cover_url: string | null; level: string | null; language: string;
  seats: number; enrolled_count: number; starts_on: string | null; outcomes: string[];
  attendance_policy: string; max_absences: number; host_id: string;
};
type Day = { id: string; day_number: number; title: string; blueprint: string | null; starts_at: string | null; duration_minutes: number };
type Host = { id: string; display_name: string | null; avatar_url: string | null; headline: string | null; avg_rating: number };

function CoursePage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [host, setHost] = useState<Host | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    setUserId(u.user?.id ?? null);
    const { data: c } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
    if (!c) { setLoading(false); return; }
    setCourse(c as Course);
    const [{ data: d }, { data: h }, { data: e }] = await Promise.all([
      supabase.from("course_days").select("id, day_number, title, blueprint, starts_at, duration_minutes").eq("course_id", c.id).order("day_number"),
      supabase.from("profiles").select("id, display_name, avatar_url, headline, avg_rating").eq("id", c.host_id).maybeSingle(),
      u.user
        ? supabase.from("course_enrollments").select("id").eq("course_id", c.id).eq("user_id", u.user.id).maybeSingle()
        : Promise.resolve({ data: null } as { data: null }),
    ]);
    setDays((d ?? []) as Day[]);
    setHost((h as Host) ?? null);
    setEnrolled(!!e);
    setLoading(false);
  };
  useEffect(() => { load(); }, [slug]);

  const enroll = async () => {
    if (!userId || !course) return;
    setBusy(true);
    const { error } = await supabase.from("course_enrollments").insert({ course_id: course.id, user_id: userId });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setEnrolled(true);
    toast.success("You're enrolled — attendance starts on day 1!");
  };

  const withdraw = async () => {
    if (!userId || !course) return;
    const { error } = await supabase.from("course_enrollments").delete().eq("course_id", course.id).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    setEnrolled(false);
    toast("Withdrawn from the course");
  };

  if (loading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!course) return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div><h1 className="text-2xl font-bold">Course not found</h1>
        <Link to="/training"><Button className="mt-4 rounded-full">Back to Training</Button></Link></div>
    </div>
  );

  const isHost = userId === course.host_id;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Button variant="ghost" size="sm" className="mb-3"
          onClick={() => navigate({ to: course.track === "kids" ? "/kids" : course.track === "workshop" ? "/workshops" : "/training" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        {course.cover_url && <img src={course.cover_url} alt={course.title} className="mb-6 h-48 w-full rounded-3xl object-cover shadow-soft" />}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {course.peer_led ? (
                <Badge variant="outline" className="rounded-full border-primary/40 text-primary"><Users className="mr-1 h-3 w-3" /> Peer-to-peer session</Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full"><ShieldCheck className="mr-1 h-3 w-3" /> Score-verified tutor</Badge>
              )}
              <Badge variant="secondary" className="rounded-full">Free</Badge>
              <Badge variant="outline" className="rounded-full capitalize">{course.track}</Badge>
              {course.level && <Badge variant="outline" className="rounded-full capitalize">{course.level}</Badge>}
            </div>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{course.title}</h1>
            {course.tagline && <p className="mt-2 text-muted-foreground">{course.tagline}</p>}
            {course.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{course.description}</p>}

            {course.outcomes.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 text-lg font-semibold">What you'll walk away with</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {course.outcomes.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {o}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Day-by-day blueprint</h2>
              <ol className="space-y-3">
                {days.map((d) => (
                  <li key={d.id} className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-white">{d.day_number}</span>
                      <h3 className="font-semibold">{d.title}</h3>
                      {d.starts_at && (
                        <span className="ml-auto text-xs text-muted-foreground">{format(new Date(d.starts_at), "MMM d, h:mm a")}</span>
                      )}
                    </div>
                    {d.blueprint && <p className="mt-2 whitespace-pre-wrap pl-11 text-sm text-muted-foreground">{d.blueprint}</p>}
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-destructive" /> Attendance policy</h2>
              <p className="mt-1 text-sm text-muted-foreground">{course.attendance_policy}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                More than {course.max_absences} unexcused absence{course.max_absences === 1 ? "" : "s"} can remove you from the course.
              </p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-10 lg:self-start">
            <div className="glass space-y-4 rounded-2xl p-5 shadow-soft">
              <div>
                <p className="text-3xl font-bold">Free</p>
                <p className="text-xs text-muted-foreground">{days.length}-day course · {course.enrolled_count}/{course.seats} enrolled</p>
              </div>
              {course.starts_on && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" /> Starts {format(new Date(course.starts_on), "EEE, MMM d")}
                </p>
              )}
              {isHost ? (
                <p className="text-sm text-muted-foreground">You're hosting this course.</p>
              ) : enrolled ? (
                <>
                  <Button className="w-full rounded-full bg-brand-gradient text-white" disabled>You're enrolled</Button>
                  <button onClick={withdraw} className="block w-full text-xs text-muted-foreground hover:text-destructive">Withdraw</button>
                </>
              ) : (
                <Button className="w-full rounded-full bg-brand-gradient text-white" disabled={busy || course.enrolled_count >= course.seats} onClick={enroll}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : course.enrolled_count >= course.seats ? "Full" : "Enroll free"}
                </Button>
              )}

              {host && (
                <Link to="/users/$userId" params={{ userId: host.id }} className="flex items-center gap-3 border-t border-border/50 pt-4">
                  {host.avatar_url
                    ? <img src={host.avatar_url} alt={host.display_name ?? "Host"} className="h-10 w-10 rounded-full object-cover" />
                    : <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white">{(host.display_name ?? "?").slice(0, 1).toUpperCase()}</div>}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{host.display_name ?? "Host"}</p>
                    <p className="truncate text-xs text-muted-foreground">{host.headline ?? "Learnova host"}</p>
                  </div>
                </Link>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
