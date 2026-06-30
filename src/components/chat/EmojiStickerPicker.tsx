import { useState } from "react";
import { Smile, Sticker as StickerIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { STICKERS } from "@/lib/stickers";

const EMOJIS = [
  "😀","😂","🤣","😊","😍","🥰","😘","😎","🤔","🤩","🥳","😇","🙃","😉","😴","🤤",
  "👍","👎","👏","🙌","🤝","🙏","💪","🫶","🫡","🤘","✌️","🤞","👀","👋","🤙","🧠",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💯","🔥","✨","⭐","🌟","💡","🎉","🎊",
  "📚","✏️","📝","🧮","🔬","🧪","🧑‍🎓","🎓","🏆","🥇","⏰","☕","🍕","🍩","🍪","🚀",
];

export function EmojiStickerPicker({
  onPickEmoji,
  onPickSticker,
  align = "end",
}: {
  onPickEmoji: (e: string) => void;
  onPickSticker?: (id: string) => void;
  align?: "start" | "center" | "end";
}) {
  const [tab, setTab] = useState<"emoji" | "sticker">("emoji");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className="shrink-0" title="Emoji & stickers">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-72 p-2">
        {onPickSticker && (
          <div className="mb-2 inline-flex rounded-full bg-muted p-0.5 text-xs">
            <button onClick={() => setTab("emoji")} className={`rounded-full px-3 py-1 ${tab === "emoji" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              <Smile className="mr-1 inline h-3 w-3" /> Emoji
            </button>
            <button onClick={() => setTab("sticker")} className={`rounded-full px-3 py-1 ${tab === "sticker" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              <StickerIcon className="mr-1 inline h-3 w-3" /> Stickers
            </button>
          </div>
        )}
        {tab === "emoji" ? (
          <div className="grid max-h-60 grid-cols-8 gap-1 overflow-y-auto">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => { onPickEmoji(e); setOpen(false); }}
                className="rounded-md p-1 text-lg transition hover:bg-accent">
                {e}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {STICKERS.map((s) => (
              <button key={s.id} type="button" onClick={() => { onPickSticker?.(s.id); setOpen(false); }}
                className="grid aspect-square place-items-center rounded-xl border border-border/60 bg-muted/40 p-2 transition hover:border-primary/60 hover:bg-accent/40">
                <img src={s.src} alt={s.label} width={64} height={64} className="h-full w-full object-contain" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
