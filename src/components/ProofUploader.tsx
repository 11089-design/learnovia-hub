import { useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type ProofFile = { url: string; mime: string; name: string };

/**
 * Uploads a proof document (image OR PDF) to the private `media` bucket and
 * returns a long-lived signed URL plus its mime type, so server-side AI
 * verification knows how to attach it.
 */
export function ProofUploader({
  value,
  onChange,
  folder = "verifications",
}: {
  value: ProofFile | null;
  onChange: (file: ProofFile | null) => void;
  folder?: string;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      toast.error("Upload an image (JPG/PNG) or a PDF");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File must be under 15 MB");
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() || (isPdf ? "pdf" : "jpg");
      const path = `${u.user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        upsert: true,
        contentType: file.type || (isPdf ? "application/pdf" : "image/jpeg"),
      });
      if (upErr) throw upErr;
      const { data, error: signErr } = await supabase.storage
        .from("media")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !data?.signedUrl) throw signErr ?? new Error("Could not generate URL");
      onChange({
        url: data.signedUrl,
        mime: file.type || (isPdf ? "application/pdf" : "image/jpeg"),
        name: file.name,
      });
      toast.success("Proof uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const isPdf = value?.mime.includes("pdf");

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={pick}
        className="group relative grid h-32 w-40 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/30 transition hover:border-primary/60"
      >
        {value ? (
          isPdf ? (
            <div className="px-3 text-center">
              <FileText className="mx-auto h-7 w-7 text-primary" />
              <span className="mt-1 block truncate text-[10px] text-muted-foreground">{value.name}</span>
            </div>
          ) : (
            <img src={value.url} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="text-center text-[10px] text-muted-foreground">
            <Upload className="mx-auto h-4 w-4" />
            <span className="mt-1 block">Image or PDF</span>
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
          {value ? "Change file" : "Upload proof"}
        </Button>
        {value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full text-destructive"
            onClick={() => onChange(null)}
            disabled={busy}
          >
            <X className="mr-1 h-3 w-3" /> Remove
          </Button>
        )}
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <ImageIcon className="h-3 w-3" /> JPG, PNG or PDF · max 15 MB
        </span>
      </div>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} />
    </div>
  );
}
