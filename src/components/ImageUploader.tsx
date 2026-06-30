import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Uploads an image to the public `media` bucket under <uid>/<folder>/<random>.<ext>
 * and returns the public URL via `onChange`.
 */
export function ImageUploader({
  value,
  onChange,
  folder,
  label = "Upload image",
  shape = "square",
  className = "",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string; // e.g. "avatars", "communities", "sessions"
  label?: string;
  shape?: "square" | "circle" | "wide";
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${u.user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
      if (upErr) throw upErr;
      // Bucket is private (workspace blocks public buckets), so issue a long-lived signed URL.
      const { data, error: signErr } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !data?.signedUrl) throw signErr ?? new Error("Could not generate URL");
      onChange(data.signedUrl);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const dims =
    shape === "circle" ? "h-24 w-24 rounded-full"
    : shape === "wide" ? "h-32 w-full rounded-2xl"
    : "h-28 w-28 rounded-2xl";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={pick}
        className={`${dims} group relative grid place-items-center overflow-hidden border-2 border-dashed border-border bg-muted/30 transition hover:border-primary/60`}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="text-center text-[10px] text-muted-foreground">
            <Upload className="mx-auto h-4 w-4" />
            <span className="mt-1 block">Upload</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </button>
      <div className="flex flex-col gap-1">
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={pick} disabled={busy}>
          {value ? "Change" : label}
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => onChange(null)} disabled={busy}>
            <X className="mr-1 h-3 w-3" /> Remove
          </Button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}
