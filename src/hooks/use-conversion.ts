import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  startConversionJob,
  updateJobProgress,
  finishConversionJob,
  type ToolId,
} from "@/lib/jobs/service.functions";
import { saveConversionOutput, getToolPreferences } from "@/lib/files/conversions";
import { DEFAULT_OCR_LANGUAGE } from "@/lib/ocr/languages";

export type ConversionContext = {
  jobId: string;
  ocrLanguage: string;
  /** Report progress: updates the UI immediately and the job record periodically. */
  onProgress: (pct: number, stage?: string) => void;
};

export type ConversionResult = { blob: Blob; filename: string } | null;

type RunOptions = {
  sourceName: string;
  sourceSize?: number;
  pageCount?: number;
  ocrLanguage?: string;
  options?: Record<string, unknown>;
  /** Skip writing the output into the file library. */
  skipSave?: boolean;
};

export function useConversion(tool: ToolId) {
  const start = useServerFn(startConversionJob);
  const update = useServerFn(updateJobProgress);
  const finish = useServerFn(finishConversionJob);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({ ocrLanguage: DEFAULT_OCR_LANGUAGE as string, autoSave: true });
  const lastPush = useRef(0);

  useEffect(() => {
    getToolPreferences()
      .then((p) => setPrefs({ ocrLanguage: p.ocrLanguage, autoSave: p.autoSave }))
      .catch(() => undefined);
  }, []);

  const run = useCallback(
    async (opts: RunOptions, work: (ctx: ConversionContext) => Promise<ConversionResult>) => {
      setBusy(true);
      setProgress(0);
      setStage("Preparing…");
      setBlocked(null);

      let jobId: string | null = null;
      try {
        const started = await start({
          data: {
            tool,
            sourceName: opts.sourceName,
            sourceSize: opts.sourceSize ?? 0,
            pageCount: opts.pageCount ?? 0,
            ocrLanguage: opts.ocrLanguage ?? undefined,
            options: opts.options ?? {},
          },
        });
        jobId = started.jobId;
        setRemaining(started.remaining);

        const ctx: ConversionContext = {
          jobId: started.jobId,
          ocrLanguage: opts.ocrLanguage ?? prefs.ocrLanguage,
          onProgress: (pct, label) => {
            setProgress(pct);
            if (label) setStage(label);
            const now = Date.now();
            if (jobId && (now - lastPush.current > 1500 || pct >= 100)) {
              lastPush.current = now;
              void update({ data: { jobId, progress: pct, stage: label ?? undefined } }).catch(
                () => undefined,
              );
            }
          },
        };

        const result = await work(ctx);

        let outputFileId: string | null = null;
        let outputName: string | null = null;
        let outputSize: number | null = null;

        if (result && prefs.autoSave && !opts.skipSave) {
          setStage("Saving to your files…");
          try {
            const saved = await saveConversionOutput(result.blob, result.filename, {
              tool,
              sourceName: opts.sourceName,
              ocrLanguage: opts.ocrLanguage ?? null,
              pageCount: opts.pageCount ?? null,
              jobId: started.jobId,
            });
            outputFileId = saved.file.id;
            outputName = saved.file.name;
            outputSize = result.blob.size;
            toast.success(
              saved.isNewVersion
                ? `Saved to Files as version ${saved.version}`
                : "Saved to Files › Conversions",
            );
          } catch (e) {
            toast.warning(
              `Converted, but saving to your files failed: ${e instanceof Error ? e.message : "unknown error"}`,
            );
          }
        } else if (result) {
          outputName = result.filename;
          outputSize = result.blob.size;
        }

        await finish({
          data: {
            jobId: started.jobId,
            status: "done",
            outputFileId,
            outputName,
            outputSize,
          },
        }).catch(() => undefined);

        setProgress(100);
        setStage("Complete");
        return { ok: true as const, fileId: outputFileId };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Conversion failed";
        if (jobId) {
          await finish({ data: { jobId, status: "error", error: message.slice(0, 500) } }).catch(
            () => undefined,
          );
        }
        if (/free conversions/i.test(message)) setBlocked(message);
        else toast.error(message);
        return { ok: false as const, error: message };
      } finally {
        setBusy(false);
      }
    },
    [finish, prefs.autoSave, prefs.ocrLanguage, start, tool, update],
  );

  return {
    run,
    busy,
    progress,
    stage,
    remaining,
    blocked,
    clearBlocked: () => setBlocked(null),
    prefs,
    setPrefs,
  };
}
