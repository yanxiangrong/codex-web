import { useCodexRuntime } from "@codex-web/react-codex";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function App() {
  const runtime = useCodexRuntime({ baseUrl: "/api" });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <TooltipProvider>
        <div className="grid h-dvh grid-cols-[minmax(10rem,16rem)_minmax(0,1fr)]">
          <aside className="bg-muted/30 overflow-y-auto border-r p-3">
            <ThreadList />
          </aside>
          <main className="overflow-hidden">
            <Thread />
          </main>
        </div>
      </TooltipProvider>
    </AssistantRuntimeProvider>
  );
}
