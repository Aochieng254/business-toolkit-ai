import { Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-semibold ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
        <Sparkles className="h-4 w-4 text-primary-foreground" />
      </span>
      <span className="tracking-tight">
        Business<span className="text-primary">Toolkit</span> AI
      </span>
    </Link>
  );
}
