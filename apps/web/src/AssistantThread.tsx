import { ComposerPrimitive, MessagePrimitive, ThreadPrimitive, type TextMessagePartProps } from "@assistant-ui/react";
import type { UiTurn } from "@codex-web/protocol";

function TextPart({ text }: TextMessagePartProps) { return <div className="message-text">{text}</div>; }
function UserMessage() { return <MessagePrimitive.Root className="message user-message"><span className="message-label">You</span><MessagePrimitive.Content components={{ Text: TextPart }} /></MessagePrimitive.Root>; }
function AssistantMessage() { return <MessagePrimitive.Root className="message assistant-message"><span className="message-label">Codex</span><MessagePrimitive.Content components={{ Text: TextPart }} /></MessagePrimitive.Root>; }

export function AssistantThread({ turns }: { turns: UiTurn[] }) {
  return <ThreadPrimitive.Root className="assistant-thread">
      <ThreadPrimitive.Viewport className="assistant-viewport">
        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>;
}

export function AssistantComposer() {
  return <ComposerPrimitive.Root className="composer">
    <ComposerPrimitive.Input aria-label="Ask Codex" placeholder="Ask Codex…" />
    <ThreadPrimitive.If running={false}><ComposerPrimitive.Send>Send</ComposerPrimitive.Send></ThreadPrimitive.If>
    <ThreadPrimitive.If running><ComposerPrimitive.Cancel className="stop">Stop</ComposerPrimitive.Cancel></ThreadPrimitive.If>
  </ComposerPrimitive.Root>;
}
