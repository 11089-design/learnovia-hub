import icon from "@/assets/learnova-icon.jpg.asset.json";

/** The Learnova app icon — used as the brand mark across every header. */
export function LearnovaMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src={icon.url}
      alt="Learnova"
      className={`${className} rounded-xl object-cover shadow-soft`}
    />
  );
}
