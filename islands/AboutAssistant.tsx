import { useMemo } from "preact/hooks";
import { makeNavigateTool } from "../lib/tools/navigation.ts";
import { useAssistant } from "../lib/useAssistant.ts";
import { AssistantChat } from "../components/AssistantChat.tsx";

// The About page has no page-specific actions, but the assistant should still be
// present everywhere — so it carries just the shared navigate tool, letting a
// visitor jump to the store, cart, or orders by chat from here too.
export default function AboutAssistant() {
  const tools = useMemo(() => [makeNavigateTool()], []);
  const assistant = useAssistant(tools);

  return (
    <AssistantChat
      assistant={assistant}
      hint={
        <>
          Try <em>"take me to the products"</em>, <em>"open my cart"</em>, or
          {" "}
          <em>"show my orders"</em>.
        </>
      }
    />
  );
}
