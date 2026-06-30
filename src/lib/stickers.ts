import owl from "@/assets/stickers/owl.png";
import coffee from "@/assets/stickers/coffee.png";
import lightbulb from "@/assets/stickers/lightbulb.png";
import books from "@/assets/stickers/books.png";
import rocket from "@/assets/stickers/rocket.png";
import highfive from "@/assets/stickers/highfive.png";

export type Sticker = { id: string; label: string; src: string };

export const STICKERS: Sticker[] = [
  { id: "owl", label: "Wise Owl", src: owl },
  { id: "coffee", label: "Study Fuel", src: coffee },
  { id: "lightbulb", label: "Eureka!", src: lightbulb },
  { id: "books", label: "Books", src: books },
  { id: "rocket", label: "Launch", src: rocket },
  { id: "highfive", label: "High Five", src: highfive },
];

export const STICKER_MAP: Record<string, Sticker> = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

export const STICKER_RE = /^\[sticker:([a-z0-9_-]+)\]$/i;

export function toStickerMessage(id: string): string {
  return `[sticker:${id}]`;
}

export function parseSticker(content: string): Sticker | null {
  const m = content.trim().match(STICKER_RE);
  if (!m) return null;
  return STICKER_MAP[m[1]] ?? null;
}
