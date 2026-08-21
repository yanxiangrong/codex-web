import { AssistantRuntimeProvider, useExternalStoreRuntime, type ThreadMessageLike } from "@assistant-ui/react";
import type { PropsWithChildren } from "react";

export function CodexRuntimeProvider({ messages, children }: PropsWithChildren<{ messages: ThreadMessageLike[] }>) {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({ messages, convertMessage: (message) => message, isDisabled: true, onNew: async () => undefined });
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
