import { useState } from "react";
import { useCodexRuntime } from "@codex-web/react-codex";
import { AssistantRuntimeProvider, useAuiState } from "@assistant-ui/react";
import { MenuIcon, PanelLeftIcon, SparklesIcon } from "lucide-react";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadListItems, ThreadListNew, ThreadListRoot } from "@/components/assistant-ui/thread-list";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return <div className={cn("flex items-center text-sm font-medium", collapsed ? "size-8 shrink-0 justify-center" : "min-w-0 gap-2 px-2")}>
    <SparklesIcon className="size-5 shrink-0" aria-hidden />
    {!collapsed && <span className="text-foreground/90 truncate">assistant-ui</span>}
  </div>;
}

function ThreadTitle() {
  const title = useAuiState((state) => state.threads.threadItems.find((thread) => thread.id === state.threads.mainThreadId)?.title);
  return <span className="min-w-0 truncate text-sm font-medium">{title ?? "New Chat"}</span>;
}

function BaseInterface() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  return <div className="relative flex h-full w-full overflow-hidden">
    <aside className={cn("bg-muted/30 hidden h-full shrink-0 flex-col overflow-hidden transition-[width] duration-200 md:flex", sidebarCollapsed ? "w-12" : "w-65")}>
      <div className="flex h-12 shrink-0 items-center overflow-hidden px-2"><Logo collapsed={sidebarCollapsed} /></div>
      <ThreadListRoot className={cn("relative flex-1 transition-[padding,width] duration-200", sidebarCollapsed ? "w-12 overflow-hidden px-2 pt-1" : "w-65 overflow-y-auto p-3")}>
        <ThreadListNew className={cn("overflow-hidden transition-all duration-200", sidebarCollapsed ? "w-8 gap-0 px-2 has-[>svg]:px-2" : "w-full gap-2 px-2.5 has-[>svg]:px-2.5")} labelClassName={cn("overflow-hidden transition-all duration-200", sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-24 opacity-100")} />
        <ThreadListItems aria-hidden={sidebarCollapsed} inert={sidebarCollapsed} className={cn("transition-[opacity,transform] duration-150", sidebarCollapsed ? "pointer-events-none opacity-0" : "translate-x-0 opacity-100")} />
      </ThreadListRoot>
    </aside>
    {mobileSidebarOpen && <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setMobileSidebarOpen(false)}>
      <aside className="bg-background h-full w-72 border-r p-3" onClick={(event) => event.stopPropagation()}>
        <div className="flex h-12 items-center"><Logo /></div>
        <ThreadListRoot className="flex flex-col gap-0.5"><ThreadListNew onClick={() => setMobileSidebarOpen(false)} /><ThreadListItems onClick={() => setMobileSidebarOpen(false)} /></ThreadListRoot>
      </aside>
    </div>}
    <div className="bg-muted/30 flex min-w-0 flex-1 flex-col overflow-hidden p-2 md:pl-0">
      <div className="bg-background flex flex-1 flex-col overflow-hidden rounded-lg">
        <header className="flex h-12 shrink-0 items-center gap-2 px-4">
          <Button variant="ghost" size="icon" className="size-8 shrink-0 md:hidden" onClick={() => setMobileSidebarOpen(true)}><MenuIcon className="size-4" /><span className="sr-only">Toggle menu</span></Button>
          <TooltipIconButton variant="ghost" size="icon" tooltip={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"} side="bottom" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden size-8 md:flex"><PanelLeftIcon className="size-4" /></TooltipIconButton>
          <ThreadTitle />
        </header>
        <main className="flex-1 overflow-hidden"><Thread /></main>
      </div>
    </div>
  </div>;
}

export default function App() {
  const runtime = useCodexRuntime({ baseUrl: "/api" });
  return <AssistantRuntimeProvider runtime={runtime}><BaseInterface /></AssistantRuntimeProvider>;
}
