import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mail, FileDown, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiActionsButton } from "@/components/ai/ai-actions-button";
import { generateFromTemplate } from "@/lib/ai/service.functions";
import {
  exportBlocksToPDF,
  exportBlocksToWord,
  textToBlocks,
} from "@/lib/docs/export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cover-letter")({
  head: () => ({
    meta: [
      { title: "Cover Letter Generator | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Generate a tailored cover letter with AI and export it as PDF or Word in one click.",
      },
      { property: "og:title", content: "Cover Letter Generator | Business Toolkit AI" },
      { property: "og:description", content: "Tailored cover letters powered by AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoverLetterPage,
});

function CoverLetterPage() {
  const generate = useServerFn(generateFromTemplate);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [hiringManager, setHiringManager] = useState("");
  const [highlights, setHighlights] = useState("");
  const [jobAd, setJobAd] = useState("");
  const [letter, setLetter] = useState("");

  const run = async () => {
    if (!role.trim() || !company.trim()) {
      toast.info("Add the role and company first.");
      return;
    }
    setBusy(true);
    try {
      const res = await generate({
        data: {
          promptKey: "coverLetter",
          input: `Write a tailored cover letter.
Candidate: ${name || "the candidate"}
Role: ${role}
Company: ${company}
Addressed to: ${hiringManager || "Hiring Manager"}
Candidate highlights: ${highlights || "n/a"}
Job description: ${jobAd || "n/a"}
Return only the letter body with greeting and sign-off, no markdown.`,
        },
      });
      setLetter(res.text.trim());
      toast.success("Cover letter generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI failed");
    } finally {
      setBusy(false);
    }
  };

  const fileName = `cover-letter-${(company || "application").toLowerCase().replace(/\s+/g, "-")}`;
  const blocks = () => textToBlocks(letter || "");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cover Letter Generator</h1>
            <p className="text-sm text-muted-foreground">
              Tailored cover letters powered by AI.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!letter}
            onClick={async () => {
              await exportBlocksToWord(blocks(), fileName);
              toast.success("Word file downloaded");
            }}
          >
            <FileText className="mr-2 h-4 w-4" /> Word
          </Button>
          <Button disabled={!letter} onClick={() => exportBlocksToPDF(blocks(), fileName)}>
            <FileDown className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Your name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hiring manager</Label>
                <Input
                  value={hiringManager}
                  onChange={(e) => setHiringManager(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Your highlights</Label>
              <Textarea
                rows={4}
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                placeholder="Key achievements, years of experience, skills…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Job description (optional)</Label>
              <Textarea rows={5} value={jobAd} onChange={(e) => setJobAd(e.target.value)} />
            </div>
            <Button onClick={run} disabled={busy} className="w-full">
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate cover letter
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Letter</CardTitle>
            <AiActionsButton value={letter} onChange={setLetter} />
          </CardHeader>
          <CardContent>
            <Textarea
              rows={22}
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              placeholder="Your generated letter appears here — edit it freely before exporting."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
