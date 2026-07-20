import { useMemo, useRef, useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload, FolderPlus, Folder as FolderIcon, Star, Trash2, Search, Grid3x3, List as ListIcon,
  MoreVertical, Download, Share2, Copy, Pencil, ArchiveRestore, Archive,
  ChevronRight, Home, File as FileGeneric, Image as ImageIcon, FileText,
  FileSpreadsheet, FileArchive, Presentation, RotateCcw, XCircle, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileService, FolderService, StorageService, SharingService } from "@/lib/files/service";
import { PreviewService } from "@/lib/files/preview";
import type { FileRow, Folder, SharedFile } from "@/lib/files/types";

export const Route = createFileRoute("/_authenticated/files")({
  component: FilesPage,
});

type View = "grid" | "list";
type Tab = "all" | "favorites" | "trash";

function extIcon(ext: string | null | undefined) {
  const k = PreviewService.iconFor(ext);
  if (k === "image") return ImageIcon;
  if (k === "sheet") return FileSpreadsheet;
  if (k === "archive") return FileArchive;
  if (k === "presentation") return Presentation;
  if (k === "file-text") return FileText;
  return FileGeneric;
}

function FilesPage() {
  const qc = useQueryClient();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [view, setView] = useState<View>("grid");
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [preview, setPreview] = useState<FileRow | null>(null);
  const [shareOf, setShareOf] = useState<FileRow | null>(null);
  const [renameOf, setRenameOf] = useState<FileRow | Folder | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const foldersQ = useQuery({
    queryKey: ["folders", folderId],
    queryFn: () => FolderService.list(folderId),
  });
  const filesQ = useQuery({
    queryKey: ["files", { folderId, tab, search, typeFilter }],
    queryFn: () =>
      FileService.list({
        folderId: tab === "trash" ? undefined : folderId,
        favoritesOnly: tab === "favorites",
        trashed: tab === "trash",
        search: search || undefined,
        type: typeFilter || undefined,
      }),
  });
  const crumbsQ = useQuery({
    queryKey: ["folder-crumbs", folderId],
    queryFn: () => FolderService.breadcrumb(folderId),
    enabled: !!folderId,
  });
  const usageQ = useQuery({
    queryKey: ["storage-usage"],
    queryFn: () => FileService.storageUsage(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["files"] });
    qc.invalidateQueries({ queryKey: ["folders"] });
    qc.invalidateQueries({ queryKey: ["storage-usage"] });
    qc.invalidateQueries({ queryKey: ["recent-files"] });
  };

  const upload = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(arr.length);
    let done = 0;
    for (const f of arr) {
      try {
        await StorageService.upload(f, { folderId });
        done++;
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
    }
    setUploading(0);
    if (done) toast.success(`Uploaded ${done} file${done > 1 ? "s" : ""}`);
    invalidate();
  }, [folderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const files = filesQ.data ?? [];
  const folders = foldersQ.data ?? [];
  const crumbs = crumbsQ.data ?? [];

  const stats = useMemo(() => {
    const usage = usageQ.data ?? 0;
    return { usage: PreviewService.humanSize(usage), raw: usage };
  }, [usageQ.data]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Files</h1>
          <p className="text-sm text-muted-foreground">
            Central home for every document across the toolkit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" /> New folder
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && upload(e.target.files)}
          />
        </div>
      </div>

      {/* Widgets */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <WidgetCard label="Storage used" value={stats.usage} sub="of unlimited" />
        <WidgetCard label="Files" value={String(files.filter((f) => !f.is_trashed).length)} sub="in current view" />
        <WidgetCard label="Folders" value={String(folders.length)} sub="in this location" />
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files…"
              className="h-9 w-64 pl-8"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All types</option>
            {["pdf","docx","xlsx","pptx","txt","csv","png","jpg","zip"].map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          {(["all","favorites","trash"] as Tab[]).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={tab === t ? "default" : "ghost"}
              onClick={() => setTab(t)}
              className="capitalize"
            >
              {t === "favorites" && <Star className="mr-1 h-3.5 w-3.5" />}
              {t === "trash" && <Trash2 className="mr-1 h-3.5 w-3.5" />}
              {t}
            </Button>
          ))}
          <div className="mx-1 h-6 w-px bg-border" />
          <Button size="icon" variant={view === "grid" ? "default" : "ghost"} onClick={() => setView("grid")}>
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")}>
            <ListIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      {tab === "all" && (
        <div className="mt-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setFolderId(null)}>
            <Home className="h-3.5 w-3.5" /> My files
          </button>
          {crumbs.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              <button className="hover:text-foreground" onClick={() => setFolderId(c.id)}>{c.name}</button>
            </span>
          ))}
        </div>
      )}

      {/* Dropzone / grid */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) upload(e.dataTransfer.files);
        }}
        className={cn(
          "mt-4 min-h-[280px] rounded-xl border-2 border-dashed p-4 transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border bg-card/40",
        )}
      >
        {uploading > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading {uploading} file{uploading > 1 ? "s" : ""}…
          </div>
        )}

        {tab === "all" && folders.length > 0 && !search && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {folders.map((f) => (
              <FolderCard
                key={f.id}
                folder={f}
                onOpen={() => setFolderId(f.id)}
                onRename={() => setRenameOf(f)}
                onTrash={async () => { await FolderService.trash(f.id); invalidate(); }}
              />
            ))}
          </div>
        )}

        {files.length === 0 && folders.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <Upload className="mb-2 h-6 w-6" />
            Drop files here, or click Upload above.
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {files.map((f) => (
              <FileCard
                key={f.id}
                file={f}
                onOpen={() => { setPreview(f); FileService.touch(f.id); }}
                onShare={() => setShareOf(f)}
                onRename={() => setRenameOf(f)}
                onChanged={invalidate}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {files.map((f) => (
              <FileRowItem
                key={f.id}
                file={f}
                onOpen={() => { setPreview(f); FileService.touch(f.id); }}
                onShare={() => setShareOf(f)}
                onRename={() => setRenameOf(f)}
                onChanged={invalidate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        parentId={folderId}
        onDone={invalidate}
      />
      <RenameDialog
        item={renameOf}
        onClose={() => setRenameOf(null)}
        onDone={invalidate}
      />
      <ShareDialog file={shareOf} onClose={() => setShareOf(null)} />
      <PreviewDialog file={preview} onClose={() => setPreview(null)} />

      <p className="mt-6 text-xs text-muted-foreground">
        Files uploaded here are available across every module.{" "}
        <Link to="/ai-assistant" className="underline">The AI assistant</Link> can reference them.
      </p>
    </div>
  );
}

function WidgetCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function FolderCard({ folder, onOpen, onRename, onTrash }: {
  folder: Folder; onOpen: () => void; onRename: () => void; onTrash: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/50">
      <button onClick={onOpen} className="flex flex-1 items-center gap-3 min-w-0 text-left">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: folder.color ?? "hsl(var(--accent))" }}
        >
          <FolderIcon className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{folder.name}</p>
          <p className="text-xs text-muted-foreground">Folder</p>
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onRename}><Pencil className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onTrash} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Move to trash</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function FileActions({ file, onShare, onRename, onChanged, onOpen }: {
  file: FileRow; onShare: () => void; onRename: () => void; onChanged: () => void; onOpen: () => void;
}) {
  const download = async () => {
    const url = await StorageService.downloadUrl(file);
    window.open(url, "_blank");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={onOpen}>Preview</DropdownMenuItem>
        <DropdownMenuItem onSelect={download}><Download className="mr-2 h-4 w-4" /> Download</DropdownMenuItem>
        <DropdownMenuItem onSelect={onShare}><Share2 className="mr-2 h-4 w-4" /> Share</DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename}><Pencil className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
        <DropdownMenuItem onSelect={async () => { await FileService.duplicate(file.id); onChanged(); }}>
          <Copy className="mr-2 h-4 w-4" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={async () => { await FileService.toggleFavorite(file.id, !file.is_favorite); onChanged(); }}>
          <Star className={cn("mr-2 h-4 w-4", file.is_favorite && "fill-yellow-400 text-yellow-500")} />
          {file.is_favorite ? "Unfavorite" : "Favorite"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={async () => { await FileService.archive(file.id, !file.is_archived); onChanged(); }}>
          {file.is_archived
            ? <><ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive</>
            : <><Archive className="mr-2 h-4 w-4" /> Archive</>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {file.is_trashed ? (
          <>
            <DropdownMenuItem onSelect={async () => { await FileService.restore(file.id); onChanged(); }}>
              <RotateCcw className="mr-2 h-4 w-4" /> Restore
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onSelect={async () => {
                if (!confirm("Permanently delete this file?")) return;
                await FileService.permanentDelete(file.id); onChanged();
              }}
            >
              <XCircle className="mr-2 h-4 w-4" /> Delete forever
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            className="text-destructive"
            onSelect={async () => { await FileService.trash(file.id); onChanged(); }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Move to trash
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FileCard(props: {
  file: FileRow; onOpen: () => void; onShare: () => void; onRename: () => void; onChanged: () => void;
}) {
  const { file, onOpen } = props;
  const Icon = extIcon(file.extension);
  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/50">
      <button onClick={onOpen} className="flex aspect-video items-center justify-center rounded-lg bg-accent/50">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </button>
      <div className="mt-2 flex items-start justify-between gap-2">
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1">
            {file.is_favorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />}
            <p className="truncate text-sm font-medium">{file.name}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {file.extension?.toUpperCase() ?? "FILE"} · {PreviewService.humanSize(file.size_bytes)}
          </p>
        </button>
        <FileActions {...props} />
      </div>
    </div>
  );
}

function FileRowItem(props: {
  file: FileRow; onOpen: () => void; onShare: () => void; onRename: () => void; onChanged: () => void;
}) {
  const { file, onOpen } = props;
  const Icon = extIcon(file.extension);
  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40">
      <button onClick={onOpen} className="flex flex-1 items-center gap-3 min-w-0 text-left">
        <Icon className="h-5 w-5 flex-none text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(file.updated_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant="secondary" className="hidden sm:inline-flex">{file.extension?.toUpperCase() ?? "FILE"}</Badge>
        <span className="hidden w-20 text-right text-xs text-muted-foreground sm:inline-block">
          {PreviewService.humanSize(file.size_bytes)}
        </span>
      </button>
      <FileActions {...props} />
    </div>
  );
}

function NewFolderDialog({ open, onOpenChange, parentId, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; parentId: string | null; onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("hsl(240 70% 60%)");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await FolderService.create(name.trim(), parentId, { color });
      onDone(); onOpenChange(false); setName("");
      toast.success("Folder created");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>Organize your files.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Marketing assets" />
          </div>
          <div>
            <Label>Color</Label>
            <div className="mt-1 flex gap-2">
              {["hsl(240 70% 60%)","hsl(160 60% 45%)","hsl(20 90% 55%)","hsl(340 75% 55%)","hsl(45 90% 55%)"].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn("h-7 w-7 rounded-full border-2", color === c ? "border-foreground" : "border-transparent")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ item, onClose, onDone }: {
  item: FileRow | Folder | null; onClose: () => void; onDone: () => void;
}) {
  const [name, setName] = useState("");
  useState(() => { if (item) setName(item.name); return 0; });
  if (!item) return null;
  const isFolder = "parent_id" in item;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {isFolder ? "folder" : "file"}</DialogTitle>
        </DialogHeader>
        <Input
          defaultValue={item.name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const n = (name || item.name).trim();
            if (!n) return;
            if (isFolder) await FolderService.rename(item.id, n);
            else await FileService.rename(item.id, n);
            toast.success("Renamed");
            onDone(); onClose();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShareDialog({ file, onClose }: { file: FileRow | null; onClose: () => void }) {
  const [shares, setShares] = useState<SharedFile[]>([]);
  const [allowDownload, setAllowDownload] = useState(true);
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const reload = async (fid: string) => setShares(await SharingService.listForFile(fid));
  useState(() => { if (file) reload(file.id); return 0; });

  if (!file) return null;

  const create = async () => {
    setBusy(true);
    try {
      const s = await SharingService.create(file.id, {
        allowDownload,
        password: password || null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      const url = SharingService.buildUrl(s.token);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Share link created & copied");
      setPassword(""); setExpiresAt("");
      reload(file.id);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share “{file.name}”</DialogTitle>
          <DialogDescription>Create a secure link anyone can use.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="text-sm">Allow download</Label>
              <p className="text-xs text-muted-foreground">Off = view only</p>
            </div>
            <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Expires</Label>
              <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div>
              <Label>Password (optional)</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="—" />
            </div>
          </div>
          <Button onClick={create} disabled={busy} className="w-full">
            {busy ? "Creating…" : "Create share link"}
          </Button>

          {shares.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active links</p>
              {shares.map((s) => {
                const url = SharingService.buildUrl(s.token);
                const revoked = !!s.revoked_at;
                const expired = s.expires_at && new Date(s.expires_at) < new Date();
                return (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{url}</p>
                      <p className="text-muted-foreground">
                        {revoked ? "Revoked" : expired ? "Expired" : "Active"} · {s.view_count} views
                        {s.expires_at && ` · expires ${new Date(s.expires_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}>
                      Copy
                    </Button>
                    {!revoked && (
                      <Button size="sm" variant="ghost" onClick={async () => { await SharingService.revoke(s.id); reload(file.id); }}>
                        Revoke
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({ file, onClose }: { file: FileRow | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["preview-url", file?.id],
    queryFn: () => StorageService.signedUrl(file!.storage_path, 3600),
    enabled: !!file,
  });
  if (!file) return null;
  const url = q.data;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate">{file.name}</DialogTitle>
          <DialogDescription>
            {file.extension?.toUpperCase() ?? "FILE"} · {PreviewService.humanSize(file.size_bytes)} · v{file.version}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-[400px] rounded-lg border border-border bg-muted/30">
          {!url ? (
            <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : PreviewService.isImage(file) ? (
            <img src={url} alt={file.name} className="h-[500px] w-full object-contain" />
          ) : PreviewService.isPdf(file) ? (
            <iframe title={file.name} src={url} className="h-[600px] w-full rounded-lg" />
          ) : PreviewService.isText(file) ? (
            <TextPreview url={url} />
          ) : (
            <div className="flex h-[400px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <FileGeneric className="h-8 w-8" />
              Preview not supported for this file type yet.
              <Button asChild variant="outline"><a href={url} target="_blank" rel="noreferrer">Open in new tab</a></Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
          <Meta label="Size" value={PreviewService.humanSize(file.size_bytes)} />
          <Meta label="Uploaded" value={new Date(file.created_at).toLocaleDateString()} />
          <Meta label="Modified" value={new Date(file.updated_at).toLocaleDateString()} />
          <Meta label="Version" value={`v${file.version}`} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <p className="text-[10px] uppercase tracking-wide">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}

function TextPreview({ url }: { url: string }) {
  const { data } = useQuery({
    queryKey: ["text-preview", url],
    queryFn: async () => {
      const r = await fetch(url);
      const t = await r.text();
      return t.slice(0, 50000);
    },
  });
  return (
    <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap p-4 text-xs">
      {data ?? "Loading…"}
    </pre>
  );
}
