import { AssistantRuntimeProvider, useExternalStoreRuntime, type AppendMessage, type ExternalStoreThreadData, type ThreadMessageLike } from "@assistant-ui/react";
import type { PropsWithChildren } from "react";

interface RuntimeProps {
  messages: ThreadMessageLike[];
  isRunning: boolean;
  onSend: (text: string) => Promise<void>;
  onCancel: () => Promise<void>;
  threadId?: string;
  threads: ExternalStoreThreadData<"regular">[];
  isThreadsLoading: boolean;
  onNewThread: () => Promise<void>;
  onSwitchThread: (threadId: string) => Promise<void>;
  onRenameThread: (threadId: string, title: string) => Promise<void>;
  onArchiveThread: (threadId: string) => Promise<void>;
}

function textFrom(message: AppendMessage): string {
  return message.content
    .filter((part): part is Extract<(typeof message.content)[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export function CodexRuntimeProvider({ messages, isRunning, onSend, onCancel, threadId, threads, isThreadsLoading, onNewThread, onSwitchThread, onRenameThread, onArchiveThread, children }: PropsWithChildren<RuntimeProps>) {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    convertMessage: (message) => message,
    isRunning,
    onNew: async (message) => {
      const text = textFrom(message);
      if (text) await onSend(text);
    },
    onCancel,
    adapters: {
      threadList: {
        threadId,
        threads,
        isLoading: isThreadsLoading,
        onSwitchToNewThread: onNewThread,
        onSwitchToThread: onSwitchThread,
        onRename: onRenameThread,
        onArchive: onArchiveThread,
      },
    },
  });
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
