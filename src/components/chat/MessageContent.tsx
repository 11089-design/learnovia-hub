import { parseSticker } from "@/lib/stickers";

export function MessageContent({ content, mine = false }: { content: string; mine?: boolean }) {
  const sticker = parseSticker(content);
  if (sticker) {
    return (
      <img
        src={sticker.src}
        alt={sticker.label}
        width={128}
        height={128}
        loading="lazy"
        className="h-32 w-32 object-contain"
      />
    );
  }
  return <p className={`whitespace-pre-wrap break-words ${mine ? "" : ""}`}>{content}</p>;
}
