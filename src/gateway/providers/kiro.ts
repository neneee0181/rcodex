// Kiro AI provider (AWS CodeWhisperer)
// Binary EventStream format → translated to OpenAI SSE for the gateway
// Supports thinking/agentic model variants via system prompt injection.
// No external dependencies (no uuid, no aws-sdk).

import type { StreamChunk } from "../proxy.js";

const KIRO_API_URL = "https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse";

// --- Model definitions ---
const KIRO_BASE_MODELS = [
  "claude-sonnet-4.5",
  "claude-haiku-4.5",
  "deepseek-3.2",
  "qwen3-coder-next",
  "glm-5",
  "MiniMax-M2.5",
];

const AGENTIC_SUFFIX = "-agentic";
const THINKING_SUFFIX = "-thinking";

// Build the full model list with variants
function buildKiroModelList(): string[] {
  const list: string[] = [];
  for (const base of KIRO_BASE_MODELS) {
    list.push(base);
    // Thinking variants for claude models
    if (base.startsWith("claude-")) {
      list.push(`${base}${THINKING_SUFFIX}`);
      list.push(`${base}${AGENTIC_SUFFIX}`);
      list.push(`${base}${THINKING_SUFFIX}${AGENTIC_SUFFIX}`);
    }
  }
  return list;
}

export const KIRO_MODELS = buildKiroModelList();

export function getKiroModels(): string[] {
  return KIRO_MODELS;
}

// --- Model resolution ---
function resolveKiroModel(model: string): { upstream: string; agentic: boolean; thinking: boolean } {
  let upstream = model;
  let agentic = false;
  let thinking = false;
  if (upstream.endsWith(AGENTIC_SUFFIX)) {
    agentic = true;
    upstream = upstream.slice(0, -AGENTIC_SUFFIX.length);
  }
  if (upstream.endsWith(THINKING_SUFFIX)) {
    thinking = true;
    upstream = upstream.slice(0, -THINKING_SUFFIX.length);
  }
  return { upstream, agentic, thinking };
}

// --- UUID generation (no dependency) ---
function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// --- Thinking system prefix ---
const THINKING_BUDGET = 16000;
function buildThinkingPrefix(): string {
  return `<thinking_mode>enabled</thinking_mode>\n<max_thinking_length>${THINKING_BUDGET}</max_thinking_length>`;
}

// --- Agentic system prompt ---
const AGENTIC_SYSTEM_PROMPT = `# CRITICAL: CHUNKED WRITE PROTOCOL (MANDATORY)
You MUST follow these rules for ALL file operations. Violation causes server timeouts and task failure.
- MAXIMUM 350 LINES per single write/edit operation
- NEVER write entire files in one operation if >300 lines
- For NEW FILES (>300 lines): write initial chunk (250-300 lines), then append remaining in 250-300 line chunks
- For EDITING: use surgical edits, NEVER rewrite entire files
- Multiple small operations > one large operation.`;

// --- Request body builder ---
interface KiroMessage {
  userInputMessage?: {
    content: string;
    modelId: string;
    origin?: string;
    userInputMessageContext?: {
      toolResults?: unknown[];
      tools?: unknown[];
    };
  };
  assistantResponseMessage?: {
    content: string;
    toolUses?: unknown[];
  };
}

interface SimpleMessage {
  role: string;
  content: string | unknown;
}

function buildKiroBody(
  model: string,
  messages: SimpleMessage[],
  systemPrompt: string | undefined,
  tools?: Record<string, unknown>[]
): Record<string, unknown> {
  const { upstream, agentic, thinking } = resolveKiroModel(model);

  // Convert messages to Kiro format
  const history: KiroMessage[] = [];
  const allMsgs = [...messages];
  if (systemPrompt) {
    allMsgs.unshift({ role: "system", content: systemPrompt });
  }

  // Group messages: system/tool → user, maintain alternating user/assistant
  const pendingUserParts: string[] = [];
  const pendingAssistantParts: string[] = [];
  const pendingToolResults: unknown[] = [];
  let currentRole: string | null = null;

  const flush = () => {
    if (currentRole === "user" && (pendingUserParts.length > 0 || pendingToolResults.length > 0)) {
      const msg: KiroMessage = {
        userInputMessage: {
          content: pendingUserParts.join("\n\n").trim() || "continue",
          modelId: upstream,
        },
      };
      if (pendingToolResults.length > 0) {
        msg.userInputMessage!.userInputMessageContext = { toolResults: [...pendingToolResults] };
      }
      history.push(msg);
      pendingUserParts.length = 0;
      pendingToolResults.length = 0;
    } else if (currentRole === "assistant" && pendingAssistantParts.length > 0) {
      history.push({
        assistantResponseMessage: {
          content: pendingAssistantParts.join("\n\n").trim() || "...",
        },
      });
      pendingAssistantParts.length = 0;
    }
  };

  for (const msg of allMsgs) {
    let role = msg.role;
    if (role === "system" || role === "tool" || role === "developer") role = "user";

    if (role !== currentRole && currentRole !== null) flush();
    currentRole = role;

    const content = typeof msg.content === "string"
      ? msg.content
      : Array.isArray(msg.content)
        ? (msg.content as { text?: string }[]).map((c) => c.text ?? "").join("\n")
        : JSON.stringify(msg.content);

    if (role === "user") {
      if (msg.role === "tool") {
        pendingToolResults.push({
          toolUseId: (msg as unknown as { tool_call_id?: string }).tool_call_id ?? uuid(),
          status: "success",
          content: [{ text: content }],
        });
      } else {
        pendingUserParts.push(content);
      }
    } else if (role === "assistant") {
      pendingAssistantParts.push(content);
      // Handle tool_calls from assistant messages
      const tc = (msg as unknown as { tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[] }).tool_calls;
      if (tc && tc.length > 0) {
        flush();
        const last = history[history.length - 1];
        if (last?.assistantResponseMessage) {
          last.assistantResponseMessage.toolUses = tc.map((t) => ({
            toolUseId: t.id ?? uuid(),
            name: t.function?.name ?? "",
            input: t.function?.arguments ? JSON.parse(t.function.arguments) : {},
          }));
        }
        currentRole = null;
      }
    }
  }
  if (currentRole !== null) flush();

  // Pop last user message as currentMessage
  let currentMessage: KiroMessage | null = null;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].userInputMessage) {
      currentMessage = history.splice(i, 1)[0];
      break;
    }
  }
  if (!currentMessage) {
    currentMessage = { userInputMessage: { content: "continue", modelId: upstream } };
  }

  // Add tools to currentMessage
  if (tools && tools.length > 0 && currentMessage.userInputMessage) {
    if (!currentMessage.userInputMessage.userInputMessageContext) {
      currentMessage.userInputMessage.userInputMessageContext = {};
    }
    currentMessage.userInputMessage.userInputMessageContext.tools = tools.map((t) => {
      const fn = t.function as { name?: string; description?: string; parameters?: unknown } | undefined;
      const name = (t.name as string) ?? fn?.name ?? "";
      const desc = (t.description as string) ?? fn?.description ?? `Tool: ${name}`;
      const schema = (t.parameters ?? t.input_schema ?? fn?.parameters ?? { type: "object", properties: {} }) as Record<string, unknown>;
      return {
        toolSpecification: {
          name,
          description: desc,
          inputSchema: { json: { ...schema, required: (schema.required as string[]) ?? [] } },
        },
      };
    });
  }

  // Merge consecutive same-role messages in history
  const merged: KiroMessage[] = [];
  for (const item of history) {
    if (
      item.userInputMessage &&
      merged.length > 0 &&
      merged[merged.length - 1].userInputMessage
    ) {
      merged[merged.length - 1].userInputMessage!.content +=
        "\n\n" + item.userInputMessage.content;
    } else {
      merged.push(item);
    }
  }

  // Build prefix for thinking/agentic
  const prefixParts: string[] = [];
  if (thinking) prefixParts.push(buildThinkingPrefix());
  prefixParts.push(`[Context: Current time is ${new Date().toISOString()}]`);
  if (agentic) prefixParts.push(AGENTIC_SYSTEM_PROMPT);

  const finalContent =
    prefixParts.join("\n\n") + "\n\n" + (currentMessage.userInputMessage?.content ?? "");
  if (currentMessage.userInputMessage) {
    currentMessage.userInputMessage.content = finalContent;
    currentMessage.userInputMessage.origin = "AI_EDITOR";
  }

  const payload: Record<string, unknown> = {
    conversationState: {
      chatTriggerType: "MANUAL",
      conversationId: uuid(),
      currentMessage: currentMessage,
      history: merged,
    },
    inferenceConfig: { maxTokens: 32000 },
  };

  return payload;
}

// --- Call Kiro API ---
export async function callKiro(
  accessToken: string,
  model: string,
  messages: SimpleMessage[],
  systemPrompt: string | undefined,
  signal?: AbortSignal,
  tools?: Record<string, unknown>[]
): Promise<Response> {
  const body = buildKiroBody(model, messages, systemPrompt, tools);

  return fetch(KIRO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.amazon.eventstream",
      "X-Amz-Target": "AmazonCodeWhispererStreamingService.GenerateAssistantResponse",
      "User-Agent": "AWS-SDK-JS/3.0.0 kiro-ide/1.0.0",
      "X-Amz-User-Agent": "aws-sdk-js/3.0.0 kiro-ide/1.0.0",
      "Amz-Sdk-Request": "attempt=1; max=3",
      "Amz-Sdk-Invocation-Id": uuid(),
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
    signal,
  });
}

// --- AWS EventStream binary frame parser ---
interface ParsedFrame {
  headers: Record<string, string>;
  payload: Record<string, unknown> | null;
}

function parseEventFrame(data: Uint8Array): ParsedFrame | null {
  try {
    const view = new DataView(data.buffer, data.byteOffset);
    const headersLength = view.getUint32(4, false);

    const headers: Record<string, string> = {};
    let offset = 12; // After prelude (4 total len + 4 headers len + 4 prelude CRC)
    const headerEnd = 12 + headersLength;

    while (offset < headerEnd && offset < data.length) {
      const nameLen = data[offset];
      offset++;
      if (offset + nameLen > data.length) break;
      const name = new TextDecoder().decode(data.slice(offset, offset + nameLen));
      offset += nameLen;

      const headerType = data[offset];
      offset++;

      if (headerType === 7) {
        // String type
        const valueLen = (data[offset] << 8) | data[offset + 1];
        offset += 2;
        if (offset + valueLen > data.length) break;
        const value = new TextDecoder().decode(data.slice(offset, offset + valueLen));
        offset += valueLen;
        headers[name] = value;
      } else {
        break;
      }
    }

    // Parse payload (between header end and message CRC at end)
    const payloadStart = 12 + headersLength;
    const payloadEnd = data.length - 4;
    let payload: Record<string, unknown> | null = null;

    if (payloadEnd > payloadStart) {
      const payloadStr = new TextDecoder().decode(data.slice(payloadStart, payloadEnd));
      if (payloadStr?.trim()) {
        try {
          payload = JSON.parse(payloadStr);
        } catch {
          payload = { raw: payloadStr };
        }
      }
    }

    return { headers, payload };
  } catch {
    return null;
  }
}

// --- Stream reader: Kiro binary EventStream → rcodex StreamChunk ---
export async function* readKiroEventStream(
  res: Response,
  usage: { inputTokens?: number; outputTokens?: number }
): AsyncGenerator<StreamChunk> {
  if (!res.body) return;

  const reader = res.body.getReader();
  let buffer = new Uint8Array(0);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Append to buffer
      const newBuffer = new Uint8Array(buffer.length + value.length);
      newBuffer.set(buffer);
      newBuffer.set(value, buffer.length);
      buffer = newBuffer;

      // Parse frames from buffer
      let iterations = 0;
      while (buffer.length >= 16 && iterations < 500) {
        iterations++;
        const view = new DataView(buffer.buffer, buffer.byteOffset);
        const totalLength = view.getUint32(0, false);

        if (totalLength < 16 || totalLength > buffer.length) break;

        const frameData = buffer.slice(0, totalLength);
        buffer = buffer.slice(totalLength);

        const frame = parseEventFrame(frameData);
        if (!frame) continue;

        const eventType = frame.headers[":event-type"] ?? "";

        if (eventType === "assistantResponseEvent" && frame.payload?.content) {
          yield { type: "text", content: frame.payload.content as string };
        }

        if (eventType === "reasoningContentEvent") {
          const r = (frame.payload?.reasoningContentEvent ?? frame.payload) as
            | string
            | { text?: string; content?: string }
            | null;
          const text = typeof r === "string" ? r : (r?.text ?? r?.content ?? "");
          if (text) yield { type: "reasoning", content: text };
        }

        if (eventType === "codeEvent" && frame.payload?.content) {
          yield { type: "text", content: frame.payload.content as string };
        }

        if (eventType === "toolUseEvent" && frame.payload) {
          const toolUses = Array.isArray(frame.payload) ? frame.payload : [frame.payload];
          for (const tu of toolUses) {
            const toolUse = tu as { toolUseId?: string; name?: string; input?: unknown };
            const id = toolUse.toolUseId ?? `call_${Date.now()}`;
            const name = toolUse.name ?? "";
            const args = typeof toolUse.input === "string"
              ? toolUse.input
              : JSON.stringify(toolUse.input ?? {});
            yield { type: "tool_call_start", id, name, index: 0 };
            yield { type: "tool_call_delta", id, delta: args, index: 0 };
            yield { type: "tool_call_end", id, name, arguments: args, index: 0 };
          }
        }

        if (eventType === "metricsEvent") {
          const metrics = (frame.payload?.metricsEvent ?? frame.payload) as
            | { inputTokens?: number; outputTokens?: number }
            | null;
          if (metrics) {
            if (metrics.inputTokens) usage.inputTokens = metrics.inputTokens;
            if (metrics.outputTokens) usage.outputTokens = metrics.outputTokens;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
