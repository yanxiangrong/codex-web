import { MessagePrimitive, ThreadPrimitive, type TextMessagePartProps } from "@assistant-ui/react";
import { CodexRuntimeProvider, toAssistantMessages } from "@codex-web/assistant-runtime";
import type { UiTurn } from "@codex-web/protocol";

function TextPart({ text }: TextMessagePartProps) { return <div className="message-text">{text}</div>; }
function UserMessage() { return <MessagePrimitive.Root className="message user-message"><span className="message-label">You</span><MessagePrimitive.Content components={{ Text: TextPart }} /></MessagePrimitive.Root>; }
function AssistantMessage() { return <MessagePrimitive.Root className="message assistant-message"><span className="message-label">Codex</span><MessagePrimitive.Content components={{ Text: TextPart }} /></MessagePrimitive.Root>; }

export function AssistantThread({ turns }: { turns: UiTurn[] }) {
  const messages = toAssistantMessages(turns);
  return <CodexRuntimeProvider messages={messages}>
    <ThreadPrimitive.Root className="assistant-thread">
      <ThreadPrimitive.Viewport className="assistant-viewport">
        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  </CodexRuntimeProvider>;
}
