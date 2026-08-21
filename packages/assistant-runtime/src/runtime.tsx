import { AssistantRuntimeProvider, useExternalStoreRuntime, type AppendMessage, type ThreadMessageLike } from "@assistant-ui/react";
import type { PropsWithChildren } from "react";

interface RuntimeProps {
  messages: ThreadMessageLike[];
  isRunning: boolean;
  onSend: (text: string) => Promise<void>;
  onCancel: () => Promise<void>;
}

function textFrom(message: AppendMessage): string {
  return message.content
    .filter((part): part is Extract<(typeof message.content)[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export function CodexRuntimeProvider({ messages, isRunning, onSend, onCancel, children }: PropsWithChildren<RuntimeProps>) {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    convertMessage: (message) => message,
    isRunning,
    onNew: async (message) => {
      const text = textFrom(message);
      if (text) await onSend(text);
    },
    onCancel,
  });
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
