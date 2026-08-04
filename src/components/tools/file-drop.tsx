import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  accept: string;
  label: string;
  hint?: string;
  multiple?: boolean;
  busy?: boolean;
  onFiles: (files: File[]) => void;
};

export function FileDrop({ accept, label, hint, multiple, busy, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const emit = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length) onFiles(multiple ? files : [files[0]]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        emit(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
        over ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <Upload className="h-8 w-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = "";
        }}
      />
      <Button className="mt-4" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Choose file{multiple ? "s" : ""}
      </Button>
    </div>
  );
}

export function ToolHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
