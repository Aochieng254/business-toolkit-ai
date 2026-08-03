import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { UserSquare2, FileDown, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiActionsButton } from "@/components/ai/ai-actions-button";
import { generateFromTemplate } from "@/lib/ai/service.functions";
import { exportBlocksToPDF, exportBlocksToWord, type Block } from "@/lib/docs/export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cv-builder")({
  head: () => ({
    meta: [
      { title: "CV Builder | Business Toolkit AI" },
      {
        name: "description",
        content:
          "Build an achievement-focused CV with AI help and export it to PDF or Word instantly.",
      },
      { property: "og:title", content: "CV Builder | Business Toolkit AI" },
      {
        property: "og:description",
        content: "Craft a modern, AI-polished CV in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CvBuilderPage,
});

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function CvBuilderPage() {
  const generate = useServerFn(generateFromTemplate);
  const [busy, setBusy] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [links, setLinks] = useState("");
  const [summary, setSummary] = useState("");
  const [experience, setExperience] = useState("");
  const [education, setEducation] = useState("");
  const [skills, setSkills] = useState("");

  const aiFill = async (key: string, prompt: string, apply: (t: string) => void) => {
    setBusy(key);
    try {
      const res = await generate({ data: { promptKey: "cvWriter", input: prompt } });
      apply(res.text.trim());
      toast.success("Generated with AI");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI failed");
    } finally {
      setBusy(null);
    }
  };

  const blocks = (): Block[] => {
    const contact = [email, phone, location, links].filter(Boolean).join("  •  ");
    const out: Block[] = [
      { type: "title", text: name || "Your Name" },
      { type: "text", text: title || "" },
    ];
    if (contact) out.push({ type: "text", text: contact });
    if (summary) out.push({ type: "heading", text: "Professional Summary" }, { type: "text", text: summary });
    if (experience) {
      out.push({ type: "heading", text: "Experience" });
      lines(experience).forEach((l) =>
        out.push(/^[-*•]/.test(l) ? { type: "bullet", text: l.replace(/^[-*•]\s*/, "") } : { type: "text", text: l }),
      );
    }
    if (education) {
      out.push({ type: "heading", text: "Education" });
      lines(education).forEach((l) => out.push({ type: "text", text: l }));
    }
    if (skills) {
      out.push({ type: "heading", text: "Skills" });
      out.push({ type: "text", text: skills.replace(/\n/g, ", ") });
    }
    return out;
  };

  const fileName = `cv-${(name || "resume").toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <UserSquare2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CV Builder</h1>
            <p className="text-sm text-muted-foreground">
              Craft a modern, AI-polished CV in minutes.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await exportBlocksToWord(blocks(), fileName);
              toast.success("Word file downloaded");
            }}
          >
            <FileText className="mr-2 h-4 w-4" /> Word
          </Button>
          <Button onClick={() => exportBlocksToPDF(blocks(), fileName)}>
            <FileDown className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Job title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Links</Label>
              <Input
                value={links}
                placeholder="linkedin.com/in/…"
                onChange={(e) => setLinks(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Professional summary</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-primary hover:text-primary"
                disabled={busy === "summary"}
                onClick={() =>
                  aiFill(
                    "summary",
                    `Write a 3-sentence professional CV summary for ${name || "a candidate"}, job title: ${title || "professional"}. Skills: ${skills || "n/a"}. Experience notes: ${experience || "n/a"}. Return only the summary.`,
                    setSummary,
                  )
                }
              >
                {busy === "summary" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generate
              </Button>
              <AiActionsButton value={summary} onChange={setSummary} />
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={6}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="A short, punchy overview of who you are…"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Experience</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-primary hover:text-primary"
                disabled={busy === "exp"}
                onClick={() =>
                  aiFill(
                    "exp",
                    `Turn these rough notes into CV experience entries. Each role on its own line with company, title and dates, followed by 3 quantified achievement bullets starting with "- ". Notes:\n${experience}`,
                    setExperience,
                  )
                }
              >
                {busy === "exp" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Polish
              </Button>
              <AiActionsButton value={experience} onChange={setExperience} />
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={10}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder={"Acme Ltd — Sales Manager (2021–2024)\n- Grew revenue 40%…"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Education &amp; skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Education (one per line)</Label>
              <Textarea
                rows={4}
                value={education}
                onChange={(e) => setEducation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Skills (comma or line separated)</Label>
              <Textarea
                rows={3}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
