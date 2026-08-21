import { ComposerPrimitive, MessagePrimitive, ThreadPrimitive, type TextMessagePartProps } from "@assistant-ui/react";
import type { UiTurn } from "@codex-web/protocol";

function TextPart({ text }: TextMessagePartProps) { return <div className="message-text">{text}</div>; }
function UserMessage() { return <MessagePrimitive.Root className="message user-message"><span className="message-label">You</span><MessagePrimitive.Content components={{ Text: TextPart }} /></MessagePrimitive.Root>; }
function AssistantMessage() { return <MessagePrimitive.Root className="message assistant-message"><span className="message-label">Codex</span><MessagePrimitive.Content components={{ Text: TextPart }} /></MessagePrimitive.Root>; }

export function AssistantThread({ turns }: { turns: UiTurn[] }) {
  return <ThreadPrimitive.Root className="assistant-thread">
      <ThreadPrimitive.Viewport className="assistant-viewport">
        <ThreadPrimitive.Empty><div className="assistant-welcome"><div className="welcome-mark">✦</div><h2>How can I help you today?</h2><p>Ask Codex to inspect, explain, or change your project.</p></div></ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
        <ThreadPrimitive.ScrollToBottom className="scroll-bottom" aria-label="Scroll to bottom">↓</ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>;
}

export function AssistantComposer() {
  return <ComposerPrimitive.Root className="composer">
    <ComposerPrimitive.Input aria-label="Ask Codex" placeholder="Ask Codex…" />
    <ThreadPrimitive.If running={false}><ComposerPrimitive.Send aria-label="Send message">↑</ComposerPrimitive.Send></ThreadPrimitive.If>
    <ThreadPrimitive.If running><ComposerPrimitive.Cancel className="stop" aria-label="Stop generation">■</ComposerPrimitive.Cancel></ThreadPrimitive.If>
  </ComposerPrimitive.Root>;
}
