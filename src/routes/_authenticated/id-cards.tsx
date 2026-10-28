import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BadgePlus,
  Download,
  FileDown,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import {
  DEFAULT_ID_CARD,
  deleteCardImage,
  deleteIdCard,
  getCardImageUrl,
  listIdCards,
  saveIdCard,
  uploadCardImage,
  type IdCardData,
  type IdCardRow,
} from "@/lib/idcards/api";
import {
  CARD_BG,
  CARD_H,
  CARD_W,
  GREEN,
  HEADER_TEXT,
  YELLOW,
  generateIdCardPDF,
  generateIdCardPrintSheet,
} from "@/lib/idcards/pdf";

export const Route = createFileRoute("/_authenticated/id-cards")({
  head: () => ({
    meta: [
      { title: "ID Card Designer | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Design professional staff ID cards with your logo, company name, photo and signature, then export print-ready PDFs at exact card size.",
      },
      { property: "og:title", content: "ID Card Designer | Business Toolkit AI" },
      {
        property: "og:description",
        content: "Design staff ID cards and export print-ready PDFs at exact card size.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IdCardsPage,
});

type ImageKind = "logo" | "photo" | "signature";
type CardUrls = Record<ImageKind, string | null>;

const IMG_LABEL: Record<ImageKind, string> = {
  logo: "Company logo",
  photo: "Holder photo",
  signature: "Authorizing signature",
};

// ─── Live preview — CSS mm units mirror the PDF layout numbers ───────────────

function CardPreview({ data, urls, zoom }: { data: IdCardData; urls: CardUrls; zoom: number }) {
  const fields = data.fields.slice(0, 4);
  const sigTop = 28.2 - 2.55 + fields.length * 4.3;

  return (
    <div
      style={{ width: `${CARD_W * zoom}mm`, height: `${CARD_H * zoom}mm` }}
      className="relative"
    >
      <div
        style={{
          width: `${CARD_W}mm`,
          height: `${CARD_H}mm`,
          background: CARD_BG,
          borderRadius: "2.2mm",
          color: HEADER_TEXT,
          position: "absolute",
          top: 0,
          left: 0,
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
          overflow: "hidden",
          fontFamily: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
          boxShadow: "0 10px 30px -12px rgba(0,0,0,0.35)",
        }}
      >
        {/* Company name */}
        <div
          style={{
            position: "absolute",
            left: "11.5mm",
            right: "2.2mm",
            top: 0,
            height: "11.5mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "5mm",
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {data.companyName || "Company Name"}
        </div>

        {/* Logo */}
        {urls.logo && (
          <img
            src={urls.logo}
            alt="logo"
            style={{
              position: "absolute",
              left: "2mm",
              top: "2.6mm",
              width: "8.5mm",
              height: "8.5mm",
              objectFit: "contain",
            }}
          />
        )}

        {/* Badge */}
        <div
          style={{
            position: "absolute",
            left: "20mm",
            top: "13.2mm",
            width: "31mm",
            height: "5.2mm",
            background: GREEN,
            borderRadius: "0.6mm",
            color: YELLOW,
            fontWeight: 700,
            fontSize: "3.6mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {data.badgeText || "STAFF ID CARD"}
        </div>

        {/* Photo */}
        <div
          style={{
            position: "absolute",
            left: "55.2mm",
            top: "12.8mm",
            width: "28mm",
            height: "29.2mm",
            border: `0.55mm solid ${GREEN}`,
            borderRadius: "1.4mm",
            background: "#ffffff",
            overflow: "hidden",
          }}
        >
          {urls.photo ? (
            <img
              src={urls.photo}
              alt="holder"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "#e8f5ec",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.6mm",
                color: "#7ba289",
              }}
            >
              Photo
            </div>
          )}
        </div>

        {/* Name */}
        <div
          style={{
            position: "absolute",
            left: "3mm",
            top: "21.3mm",
            fontWeight: 700,
            fontSize: "4.4mm",
            lineHeight: 1,
            maxWidth: "50mm",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {data.fullName || "Full Name"}
        </div>

        {/* Fields */}
        {fields.map((f, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "3mm",
              top: `${25.65 + i * 4.3}mm`,
              fontSize: "3.4mm",
              lineHeight: 1,
              display: "flex",
              width: "50mm",
            }}
          >
            <span style={{ width: "14mm", overflow: "hidden", whiteSpace: "nowrap" }}>{f.label}</span>
            <span style={{ width: "1.8mm" }}>:</span>
            <span style={{ fontWeight: 700, fontSize: "3.8mm", marginTop: "-0.2mm", overflow: "hidden", whiteSpace: "nowrap" }}>
              {f.value}
            </span>
          </div>
        ))}

        {/* Authorizing signature */}
        <div
          style={{
            position: "absolute",
            left: "3mm",
            top: `${sigTop}mm`,
            display: "flex",
            alignItems: "center",
            gap: "1.2mm",
            fontSize: "3.4mm",
            lineHeight: 1,
            maxWidth: "52mm",
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>{data.signatureLabel}</span>
          {urls.signature && (
            <img
              src={urls.signature}
              alt="signature"
              style={{ height: "6.6mm", maxWidth: "18mm", objectFit: "contain" }}
            />
          )}
        </div>

        {/* Footer strip */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: `${CARD_H - 45.6}mm`,
            background: GREEN,
            color: YELLOW,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.7mm",
            padding: "0 2mm",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "2.55mm", fontWeight: 700, lineHeight: 1 }}>{data.footerLine1}</span>
          <span style={{ fontSize: "2.55mm", fontWeight: 700, lineHeight: 1 }}>{data.footerLine2}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function IdCardsPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState("Staff ID Card");
  const [data, setData] = useState<IdCardData>(DEFAULT_ID_CARD);
  const [urls, setUrls] = useState<CardUrls>({ logo: null, photo: null, signature: null });
  const [saved, setSaved] = useState<IdCardRow[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [zoom, setZoom] = useState(2);
  const [copies, setCopies] = useState(10);
  const fileRefs = useRef<Record<ImageKind, HTMLInputElement | null>>({
    logo: null,
    photo: null,
    signature: null,
  });

  const patch = useCallback((p: Partial<IdCardData>) => setData((d) => ({ ...d, ...p })), []);

  const refreshUrls = useCallback(async (d: IdCardData) => {
    const [logo, photo, signature] = await Promise.all([
      getCardImageUrl(d.logoPath),
      getCardImageUrl(d.photoPath),
      getCardImageUrl(d.signaturePath),
    ]);
    setUrls({ logo, photo, signature });
  }, []);

  useEffect(() => {
    listIdCards()
      .then(setSaved)
      .catch(() => toast.error("Could not load saved cards"));
  }, []);

  const onUpload = async (kind: ImageKind, file: File | undefined) => {
    if (!file || !user) return;
    setBusy(kind);
    try {
      const path = await uploadCardImage(user.id, kind, file);
      patch(kind === "logo" ? { logoPath: path } : kind === "photo" ? { photoPath: path } : { signaturePath: path });
      const url = await getCardImageUrl(path);
      setUrls((u) => ({ ...u, [kind]: url }));
      toast.success(`${IMG_LABEL[kind]} added`);
    } catch {
      toast.error(`Could not upload ${IMG_LABEL[kind].toLowerCase()}`);
    } finally {
      setBusy(null);
      if (fileRefs.current[kind]) fileRefs.current[kind]!.value = "";
    }
  };

  const onRemoveImage = async (kind: ImageKind) => {
    const path = kind === "logo" ? data.logoPath : kind === "photo" ? data.photoPath : data.signaturePath;
    if (path) await deleteCardImage(path).catch(() => undefined);
    patch(kind === "logo" ? { logoPath: null } : kind === "photo" ? { photoPath: null } : { signaturePath: null });
    setUrls((u) => ({ ...u, [kind]: null }));
  };

  const loadCard = async (row: IdCardRow) => {
    setCurrentId(row.id);
    setTitle(row.title);
    const d = { ...DEFAULT_ID_CARD, ...row.data } as IdCardData;
    setData(d);
    await refreshUrls(d);
  };

  const startNew = () => {
    setCurrentId(null);
    setTitle("Staff ID Card");
    setData(DEFAULT_ID_CARD);
    setUrls({ logo: null, photo: null, signature: null });
  };

  const onSave = async () => {
    if (!user) return;
    setBusy("save");
    try {
      const row = await saveIdCard(currentId, title.trim() || "Untitled card", data);
      setCurrentId(row.id);
      setSaved((s) => [row, ...s.filter((c) => c.id !== row.id)]);
      toast.success("Card saved");
    } catch {
      toast.error("Could not save card");
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async () => {
    if (!currentId) return;
    setBusy("delete");
    try {
      await deleteIdCard(currentId);
      setSaved((s) => s.filter((c) => c.id !== currentId));
      startNew();
      toast.success("Card deleted");
    } catch {
      toast.error("Could not delete card");
    } finally {
      setBusy(null);
    }
  };

  const onDownload = async () => {
    setBusy("pdf");
    try {
      const doc = await generateIdCardPDF(data, urls);
      doc.save(`id-card-${(title || "card").toLowerCase().replace(/\s+/g, "-")}.pdf`);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Could not generate PDF");
    } finally {
      setBusy(null);
    }
  };

  const onPrintSheet = async () => {
    setBusy("sheet");
    try {
      const doc = await generateIdCardPrintSheet(data, urls, Math.max(1, Math.min(50, copies)));
      doc.save(`id-cards-sheet-${(title || "card").toLowerCase().replace(/\s+/g, "-")}.pdf`);
      toast.success("Print sheet downloaded");
    } catch {
      toast.error("Could not generate print sheet");
    } finally {
      setBusy(null);
    }
  };

  const fieldEditor = useMemo(
    () => (
      <div className="space-y-2">
        {data.fields.map((f, i) => (
          <div key={i} className="flex gap-2">
            <Input
              className="w-28"
              placeholder="Label"
              value={f.label}
              onChange={(e) => {
                const fields = [...data.fields];
                fields[i] = { ...f, label: e.target.value };
                patch({ fields });
              }}
            />
            <Input
              placeholder="Value"
              value={f.value}
              onChange={(e) => {
                const fields = [...data.fields];
                fields[i] = { ...f, value: e.target.value };
                patch({ fields });
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground"
              disabled={data.fields.length <= 1}
              onClick={() => patch({ fields: data.fields.filter((_, j) => j !== i) })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {data.fields.length < 4 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => patch({ fields: [...data.fields, { label: "Label", value: "" }] })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add field
          </Button>
        )}
      </div>
    ),
    [data.fields, patch],
  );

  const imageRow = (kind: ImageKind) => {
    const path = kind === "logo" ? data.logoPath : kind === "photo" ? data.photoPath : data.signaturePath;
    const url = urls[kind];
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {url ? (
            <img src={url} alt={kind} className="h-full w-full object-contain" />
          ) : (
            <Upload className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{IMG_LABEL[kind]}</div>
          <div className="text-xs text-muted-foreground">
            {path ? "Uploaded" : "PNG or JPG"}
          </div>
        </div>
        {busy === kind ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => fileRefs.current[kind]?.click()}>
              {path ? "Replace" : "Upload"}
            </Button>
            {path && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemoveImage(kind)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}
        <input
          ref={(el) => {
            fileRefs.current[kind] = el;
          }}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onUpload(kind, e.target.files?.[0])}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ID Card Designer</h1>
          <p className="text-sm text-muted-foreground">
            Standard card size 85.6 × 54 mm — edit the content, download or print.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onSave} disabled={busy === "save"}>
            {busy === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {currentId ? "Save changes" : "Save card"}
          </Button>
          <Button variant="outline" onClick={startNew}>
            <BadgePlus className="mr-2 h-4 w-4" /> New card
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        {/* ── Editor ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Card header</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input
                  value={data.companyName}
                  onChange={(e) => patch({ companyName: e.target.value })}
                  placeholder="e.g. National Cereals and Produce Board"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Badge text</Label>
                <Input
                  value={data.badgeText}
                  onChange={(e) => patch({ badgeText: e.target.value })}
                  placeholder="STAFF ID CARD"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>Saved as</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                {currentId && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete} disabled={busy === "delete"}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {imageRow("logo")}
              <Separator />
              {imageRow("photo")}
              <Separator />
              {imageRow("signature")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Card holder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input
                  value={data.fullName}
                  onChange={(e) => patch({ fullName: e.target.value })}
                  placeholder="e.g. Margaret W. Kihoro"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Details</Label>
                {fieldEditor}
              </div>
              <div className="space-y-1.5">
                <Label>Signature label</Label>
                <Input
                  value={data.signatureLabel}
                  onChange={(e) => patch({ signatureLabel: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Footer strip</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Line 1</Label>
                <Input
                  value={data.footerLine1}
                  onChange={(e) => patch({ footerLine1: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Line 2</Label>
                <Input
                  value={data.footerLine2}
                  onChange={(e) => patch({ footerLine2: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Preview + export ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Live preview</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Button
                  variant={zoom === 1.6 ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setZoom(1.6)}
                >
                  160%
                </Button>
                <Button
                  variant={zoom === 2 ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setZoom(2)}
                >
                  200%
                </Button>
                <Button
                  variant={zoom === 2.6 ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setZoom(2.6)}
                >
                  260%
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center overflow-auto rounded-lg bg-muted/40 p-6">
              <CardPreview data={data} urls={urls} zoom={zoom} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Export</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <Button onClick={onDownload} disabled={busy === "pdf"}>
                {busy === "pdf" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download PDF (85.6 × 54 mm)
              </Button>
              <div className="flex items-end gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Cards on print sheet</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    className="w-24"
                    value={copies}
                    onChange={(e) => setCopies(Number(e.target.value))}
                  />
                </div>
                <Button variant="outline" onClick={onPrintSheet} disabled={busy === "sheet"}>
                  {busy === "sheet" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Print sheet (A4)
                </Button>
              </div>
            </CardContent>
          </Card>

          {saved.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Saved cards</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {saved.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => loadCard(row)}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60 ${
                      currentId === row.id ? "border-primary" : ""
                    }`}
                  >
                    <span className="truncate font-medium">{row.title}</span>
                    <span className="shrink-0 pl-2 text-xs text-muted-foreground">
                      {new Date(row.updated_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
