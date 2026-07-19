import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouterState } from "@tanstack/react-router";
import { Bot, Send, X, Loader2, Sparkles, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/invoice": "Invoice list",
  "/quotation": "Quotation list",
  "/receipt": "Receipt list",
  "/customers": "Customers",
  "/company": "Company profile",
  "/settings": "Settings",
};

function pageLabel(path: string) {
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  if (path.startsWith("/invoice/")) return "an invoice";
  if (path.startsWith("/quotation/")) return "a quotation";
  if (path.startsWith("/receipt/")) return "a receipt";
  return path;
}

export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const path = useRouterState({ select: (s) => s.location.pathname });
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/ai/chat",
      fetch: async (input, init) => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const headers = new Headers(init?.headers);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: { messages, pageContext: pageLabel(path), ...(body ?? {}) },
      }),
    }),
  ).current;

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (e) => toast.error(e.message || "AI error"),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  const busy = status === "submitted" || status === "streaming";

  const submit = () => {
    const t = input.trim();
    if (!t || busy) return;
    setInput("");
    sendMessage({ text: t });
  };

  if (!open) {
    return (
      <button
        aria-label="Open AI assistant"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-lg transition hover:scale-105"
      >
        <Bot className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border bg-gradient-primary/10 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Assistant
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm"
      >
        {messages.length === 0 && (
          <div className="rounded-xl bg-muted/50 p-3 text-muted-foreground">
            Hi! I'm your Business Toolkit copilot. Ask me anything about your
            invoices, quotations, receipts, or business in general.
            <div className="mt-2 text-xs">You're on: {pageLabel(path)}</div>
          </div>
        )}
        {messages.map((m: UIMessage) => {
          const text = m.parts
            .map((p: any) => (p.type === "text" ? p.text : ""))
            .join("");
          return (
            <div
              key={m.id}
              className={cn(
                "rounded-xl px-3 py-2",
                m.role === "user"
                  ? "ml-6 bg-primary text-primary-foreground"
                  : "mr-6 bg-muted",
              )}
            >
              <div className="whitespace-pre-wrap">{text}</div>
            </div>
          );
        })}
        {busy && (
          <div className="mr-6 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error.message}
          </div>
        )}
      </div>

      <div className="border-t border-border p-2">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask anything…"
            className="min-h-[44px] max-h-32 resize-none"
          />
          <Button onClick={submit} disabled={busy || !input.trim()} size="icon">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
