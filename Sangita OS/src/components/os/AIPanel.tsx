import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { X, Sparkles, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useOS } from "./os-store";

const SUGGESTIONS = [
  "What are my top 3 priorities today?",
  "Predict next month's revenue.",
  "Which area of the business is weakest?",
  "Draft a follow-up email to Nexora Labs.",
];

export function AIPanel() {
  const { aiOpen, closeAI } = useOS();
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (aiOpen) inputRef.current?.focus();
  }, [aiOpen]);

  const submit = (text: string) => {
    if (!text.trim()) return;
    sendMessage({ text });
  };

  const loading = status === "submitted" || status === "streaming";
  const lastIsUser = messages[messages.length - 1]?.role === "user";

  return (
    <AnimatePresence>
      {aiOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAI}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="fixed right-0 top-0 z-50 h-full w-full sm:w-[460px] bg-card border-l border-border flex flex-col"
          >
            <div className="h-14 border-b border-border px-4 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary grid place-items-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Sangita AI</div>
                <div className="text-[11px] text-muted-foreground">Chief of Staff · always on</div>
              </div>
              <button
                onClick={closeAI}
                className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Ask about revenue, priorities, campaigns, agreements, or any business decision.
                  </p>
                  <div className="grid gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => submit(s)}
                        className="text-left text-sm px-3 py-2 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-accent transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m: UIMessage) => {
                const text = m.parts
                  .map((p) => (p.type === "text" ? (p as { text: string }).text : ""))
                  .join("");
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3.5 py-2 text-sm">
                        {text}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="flex">
                    <div className="max-w-[92%] text-sm text-foreground prose prose-invert prose-sm max-w-none prose-p:my-2 prose-ul:my-2">
                      <ReactMarkdown>{text || "…"}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}

              {loading && lastIsUser && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = inputRef.current?.value ?? "";
                if (!v.trim() || loading) return;
                inputRef.current!.value = "";
                submit(v);
              }}
              className="border-t border-border p-3"
            >
              <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-primary/50 transition-colors">
                <textarea
                  ref={inputRef}
                  rows={1}
                  placeholder="Ask anything about Sangita Group…"
                  className="flex-1 resize-none bg-transparent outline-none text-sm px-1.5 py-1.5 max-h-40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      (e.currentTarget.form as HTMLFormElement).requestSubmit();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="h-8 w-8 rounded-lg gradient-primary text-white grid place-items-center disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}