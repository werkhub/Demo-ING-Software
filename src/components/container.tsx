import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}) {
  const max =
    size === "narrow"
      ? "max-w-3xl"
      : size === "wide"
        ? "max-w-[1600px]"
        : "max-w-[1440px]";
  return (
    <div className={cn("mx-auto w-full px-6 md:px-10 lg:px-14", max, className)}>
      {children}
    </div>
  );
}
