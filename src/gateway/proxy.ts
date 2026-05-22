import { appendFileSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { GatewayConfig, Account } from "./auth.js";
import { accountToProviderAuth, updateAccountOAuth, loadConfig, saveConfig } from "./auth.js";
import type { Message, ContentPart } from "./providers/anthropic.js";
import { isAnthropicModel, callAnthropic, supportsThinking } from "./providers/anthropic.js";
import { isOpenAIModel, callOpenAI, callOpenAIAndParse, callCodexAPI } from "./providers/openai.js";
import { isGoogleModel, callGoogle } from "./providers/google.js";
import { isOllamaModel, callOllama, toOllamaContent } from "./providers/ollama.js";
import { refreshOpenAIAccessToken } from "./providers/openai-oauth-flow.js";
import { refreshClaudeAccessToken } from "./providers/claude-oauth-flow.js";
import { isAntigravityModel, callAntigravity } from "./providers/antigravity.js";
import { refreshAntigravityAccessToken, loadAntigravityProject } from "./providers/antigravity-oauth-flow.js";
import { callCopilot } from "./providers/copilot.js";
import { KIRO_MODELS, callKiro, readKiroEventStream } from "./providers/kiro.js";
import { VERTEX_MODELS, VERTEX_PARTNER_MODELS, callVertex, callVertexPartner } from "./providers/vertex.js";
import { OPENCODE_MODELS, callOpenCode } from "./providers/opencode.js";
import { FREETIER_PROVIDERS, isFreetierProvider, callFreetier } from "./providers/freetier.js";

function isKiroModel(model: string): boolean {
  return KIRO_MODELS.includes(model);
}
function isVertexModel(model: string): boolean {
  return VERTEX_MODELS.includes(model);
}
function isVertexPartnerModel(model: string): boolean {
  return VERTEX_PARTNER_MODELS.includes(model);
}
function isOpenCodeModel(model: string): boolean {
  return OPENCODE_MODELS.includes(model);
}
function findFreetierProviderForModel(model: string): string | null {
  for (const p of FREETIER_PROVIDERS) {
    if (p.models.some(m => m.id === model)) {
      return p.id;
    }
  }
  return null;
}

const RCODEX_DIR = join(homedir(), ".rcodex");
const REQUESTS_PATH = join(RCODEX_DIR, "requests.jsonl");

// Start of today in local time (resets at user's system midnight, not a rolling 24h)
function todayMidnight(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Timer: flush entries from the previous day at each local midnight
function scheduleMidnightReset(): void {
  const msUntilMidnight = todayMidnight() + 86_400_000 - Date.now();
  setTimeout(() => {
    const cutoff = todayMidnight();
    while (requestLog.length > 0 && requestLog[0].ts < cutoff) requestLog.shift();
    try {
      writeFileSync(REQUESTS_PATH, requestLog.map(e => JSON.stringify(e)).join("\n") + (requestLog.length ? "\n" : ""), "utf-8");
    } catch { /* ignore */ }
    scheduleMidnightReset(); // reschedule for the next midnight
  }, msUntilMidnight + 500);
}

// KST timestamp for log lines (UTC+9)
function kst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
}
export function glog(msg: string)  { console.log(`[${kst()}] ${msg}`); }
export function gwarn(msg: string) { console.warn(`[${kst()}] ${msg}`); }
export function gerr(msg: string)  { console.error(`[${kst()}] ${msg}`); }

  // --- Responses API types ---
export interface ResponsesRequest {
  model: string;
  input: string | InputItem[];
  instructions?: string;
  temperature?: number;
  max_output_tokens?: number;
  stream?: boolean;
  previous_response_id?: string;
  tools?: unknown[];
  tool_choice?: unknown;
  reasoning?: unknown;
  include?: string[];
  store?: boolean;
}

interface InputItem {
  type: "message";
  role: string;
  content: string | { type: string; text: string }[];
}

export interface ResponsesResponse {
  id: string;
  object: "response";
  model: string;
  output: OutputItem[];
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
}

interface OutputItem {
  type: "message";
  role: "assistant";
  content: { type: "output_text"; text: string }[];
}

  // --- Stream chunk type ---
export type StreamChunk =
  | { type: 'text'; content: string }
  | { type: 'reasoning'; content: string }
  | { type: 'tool_call_start'; id: string; name: string; index: number }
  | { type: 'tool_call_delta'; id: string; delta: string; index: number }
  | { type: 'tool_call_end'; id: string; name: string; arguments: string; index: number };

  // --- Tool format conversion ---
const COMPUTER_USE_TYPES = new Set(["computer_use", "computer-preview", "computer_20241022"]);

function toAnthropicTool(tool: Record<string, unknown>): Record<string, unknown> {
  const toolType = tool.type as string | undefined;
  if (toolType && COMPUTER_USE_TYPES.has(toolType)) {
    return {
      type: "computer_20241022",
      name: (tool.name as string | undefined) ?? "computer",
      display_width_px: (tool.display_width_px ?? tool.display_width ?? tool.displayWidth ?? 1280) as number,
      display_height_px: (tool.display_height_px ?? tool.display_height ?? tool.displayHeight ?? 800) as number,
      display_number: (tool.display_number ?? 0) as number,
    };
  }
  return {
    name: tool.name as string,
    description: (tool.description as string) ?? "",
    input_schema: (tool.parameters ?? tool.input_schema ?? { type: "object", properties: {} }) as Record<string, unknown>,
  };
}

function toolName(tool: Record<string, unknown>): string | undefined {
  const fn = tool.function as { name?: string } | undefined;
  const custom = tool.custom as { name?: string } | undefined;
  return (tool.name as string | undefined) ?? fn?.name ?? custom?.name;
}

function toolDescription(tool: Record<string, unknown>): string {
  const fn = tool.function as { description?: string } | undefined;
  const custom = tool.custom as { description?: string } | undefined;
  return (tool.description as string | undefined) ?? fn?.description ?? custom?.description ?? "";
}

function stripSchemaForGoogle(schema: unknown): unknown {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return { type: "object", properties: {} };
  }
  const src = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of ["type", "description", "enum", "format", "nullable"] as const) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  if (Array.isArray(src.required)) out.required = src.required;
  if (src.items) out.items = stripSchemaForGoogle(src.items);
  if (src.properties && typeof src.properties === "object" && !Array.isArray(src.properties)) {
    out.properties = Object.fromEntries(
      Object.entries(src.properties as Record<string, unknown>).map(([k, v]) => [k, stripSchemaForGoogle(v)])
    );
  }
  if (!out.type) out.type = "object";
  if (out.type === "object" && !out.properties) out.properties = {};
  return out;
}

function toGoogleTool(tool: Record<string, unknown>): Record<string, unknown> | null {
  const name = toolName(tool);
  if (!name) return null;
  const fn = tool.function as { parameters?: unknown } | undefined;
  const custom = tool.custom as { parameters?: unknown; input_schema?: unknown } | undefined;
  const parameters = tool.parameters ?? tool.input_schema ?? fn?.parameters ?? custom?.parameters ?? custom?.input_schema ?? { type: "object", properties: {} };
  return {
    name,
    description: toolDescription(tool),
    parameters: stripSchemaForGoogle(parameters),
  };
}

function toOpenAIFunctionTool(tool: Record<string, unknown>): Record<string, unknown> | null {
  const name = toolName(tool);
  if (!name) return null;
  const fn = tool.function as { parameters?: unknown } | undefined;
  const custom = tool.custom as { parameters?: unknown; input_schema?: unknown } | undefined;
  const parameters = tool.parameters ?? tool.input_schema ?? fn?.parameters ?? custom?.parameters ?? custom?.input_schema ?? { type: "object", properties: {} };
  return {
    type: "function",
    function: {
      name,
      description: toolDescription(tool),
      parameters,
    },
  };
}

function parseGeminiTextToolCall(text: string): { before: string; name: string; args: Record<string, unknown> } | null {
  const start = toolMarkupStart(text);
  if (start < 0) return null;
  const tail = text.slice(start);
  const browserBlock = tail.match(/<browser\s*>([\s\S]*?)<\/browser>/);
  if (browserBlock) {
    const fields = parseSimpleXmlFields(browserBlock[1]);
    const action = String(fields.action ?? fields.command ?? "").toLowerCase();
    const url = String(fields.target ?? fields.url ?? "");
    if ((action === "navigate" || action === "open" || action === "visit") && url) {
      return { before: text.slice(0, start).trimEnd(), name: "web_search", args: { query: url } };
    }
    return null;
  }
  const fileBlock = tail.match(/<file\s*>([\s\S]*?)<\/file>/);
  if (fileBlock) {
    const fields = parseSimpleXmlFields(fileBlock[1]);
    const action = String(fields.action ?? "").toLowerCase();
    const path = String(fields.path ?? fields.file ?? "");
    const content = String(fields.content ?? fields.text ?? "");
    if ((action === "create" || action === "write" || action === "save") && path) {
      return {
        before: text.slice(0, start).trimEnd(),
        name: "exec_command",
        args: { cmd: `cat > "${path}" << 'EOF'\n${content}\nEOF` },
      };
    }
    return null;
  }
  const invoke = tail.match(/<invoke\s+name=["']([^"']+)["']\s*>([\s\S]*?)<\/invoke>/);
  if (invoke) {
    const invokeName = invoke[1];
    const body = invoke[2];
    const args: Record<string, unknown> = {};
    const paramRe = /<parameter\s+name=["']([^"']+)["']\s*>([\s\S]*?)<\/parameter>/g;
    for (const m of body.matchAll(paramRe)) args[m[1]] = m[2].trim();
    const lc = invokeName.toLowerCase();
    if (lc === "shell" || lc === "bash" || lc === "terminal") {
      const cmd = args.command ?? args.cmd ?? args.shell;
      if (cmd) return { before: text.slice(0, start).trimEnd(), name: "exec_command", args: { cmd } };
    }
    if (lc === "browser") {
      const command = String(args.command ?? "").toLowerCase();
      const url = String(args.url ?? "");
      if ((command === "navigate" || command === "open" || command === "visit") && url) {
        return { before: text.slice(0, start).trimEnd(), name: "web_search", args: { query: url } };
      }
    }
    if (Object.keys(args).length > 0) return { before: text.slice(0, start).trimEnd(), name: invokeName, args };
  }
  const rawToolCode = tail.match(/(?:<tool_code>|tool_code)\s*\n\s*([^\n<][^\n]*)/);
  if (rawToolCode) {
    const cmd = rawToolCode[1].trim();
    if (cmd && !cmd.startsWith("print(") && !cmd.startsWith("default_api.")) {
      return { before: text.slice(0, start).trimEnd(), name: "exec_command", args: { cmd } };
    }
  }
  const call = tail.match(/default_api\.([A-Za-z_]\w*)\(([\s\S]*?)\)/);
  if (!call) return null;
  const name = call[1];
  const rawArgs = call[2];
  const args: Record<string, unknown> = {};
  const kvRe = /([A-Za-z_]\w*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const m of rawArgs.matchAll(kvRe)) {
    const key = m[1] === "command" ? "cmd" : m[1];
    args[key] = m[2] ?? m[3] ?? "";
  }
  if (Object.keys(args).length === 0) return null;
  return { before: text.slice(0, start).trimEnd(), name, args };
}

function parseSimpleXmlFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const fieldRe = /<([A-Za-z_]\w*)\s*>([\s\S]*?)<\/\1>/g;
  for (const m of body.matchAll(fieldRe)) fields[m[1]] = m[2].trim();
  return fields;
}

function toolMarkupStart(text: string): number {
  return text.search(/<tool_code>|<?\/?function_calls>?|<\/?(invoke|parameter|browser|file|action|target|path|content|section)\b|(?:^|\n)tool_code\s*\n|default_api\.[A-Za-z_]\w*\(/);
}

function stripUnparsedToolMarkup(text: string): string {
  // Remove stray closing function_calls tags (left over from already-processed tool calls)
  const t = text.replace(/^\s*<\/function_calls>\s*/gm, ' ');
  const start = toolMarkupStart(t);
  return start >= 0 ? t.slice(0, start).trimEnd() : t.trim();
}

// Returns text that follows the tool markup block in buf (after </invoke> and any closing </function_calls>).
function extractAfterInvokeBlock(text: string): string {
  const start = toolMarkupStart(text);
  if (start < 0) return "";
  const tail = text.slice(start);
  const invokeClose = tail.match(/<\/invoke>/);
  if (!invokeClose) return "";
  const afterInvoke = tail.slice(invokeClose.index! + invokeClose[0].length);
  const fcClose = afterInvoke.match(/^\s*<\/function_calls>/);
  return fcClose ? afterInvoke.slice(fcClose[0].length) : afterInvoke;
}

// Parse Codex exec_command output format - extract just the actual output text
function parseCodexToolOutput(output: unknown): string {
  const raw = typeof output === "string" ? output : JSON.stringify(output ?? "");
  const idx = raw.indexOf("\nOutput:\n");
  if (idx !== -1) {
    const actual = raw.slice(idx + "\nOutput:\n".length).trim();
    const exitMatch = raw.match(/Process exited with code (\d+)/);
    const exitCode = exitMatch ? parseInt(exitMatch[1]) : 0;
    if (!actual && exitCode === 0) return "(�?출력 ??결과 ?�음)";
    if (!actual) return `(?�류: exit code ${exitCode} ???�당 경로???�일 ?�음)`;
    return actual;
  }
  return raw.trim();
}

function fallbackToolResultText(output: unknown): string {
  const text = parseCodexToolOutput(output);
  if (!text || text === "(출력 ?�음)") return "???�행 ?�료. 출력 ?�음.";
  return `???�행 결과:\n${text}`;
}

// Tools Codex actually executes when returned as function_call events.
// read_file / write_file in req.tools are system-prompt markers, NOT callable tool names.
// web_fetch is handled by the gateway itself (not Codex) - see below.
const CODEX_EXECUTABLE = new Set(["exec_command", "shell_exec"]);

// Map Ollama tool names to real Codex-executable tools
function fileSearchCommand(target: string): string {
  const encoded = Buffer.from(target, "utf8").toString("base64");
  const code = "const fs=require('fs'),path=require('path');const q=Buffer.from(process.argv[1]||'','base64').toString();const out=[];const hit=p=>{out.push(path.resolve(p));if(out.length>=20){console.log(out.join('\\n'));process.exit(0)}};if(q&&fs.existsSync(q))hit(q);const needle=q.toLowerCase().replace(/[*]/g,'');const walk=d=>{let xs=[];try{xs=fs.readdirSync(d,{withFileTypes:true})}catch{return}for(const x of xs){const p=path.join(d,x.name);if(x.isDirectory()){if(x.name==='node_modules'||x.name==='.git')continue;walk(p)}else if(!needle||x.name.toLowerCase().includes(needle)||p.toLowerCase().includes(needle))hit(p)}};walk('.');console.log(out.join('\\n'))";
  return `node -e "${code}" ${encoded}`;
}

function remapOllamaTool(name: string, input: Record<string, unknown>): { name: string; input: Record<string, unknown> } {
  // Gateway-handled and Codex-native web tools - pass through unchanged
  if (name === "web_fetch" || name === "web_search") return { name, input };
  if (CODEX_EXECUTABLE.has(name)) {
    // Normalize field names: model may send "command" instead of "cmd"
    const normalized: Record<string, unknown> = { ...input };
    if (!normalized.cmd) {
      const alt = normalized.command ?? normalized.shell ?? normalized.shell_command ?? normalized.run ?? normalized.exec;
      if (alt !== undefined) { normalized.cmd = alt; delete normalized.command; delete normalized.shell; delete normalized.shell_command; delete normalized.run; delete normalized.exec; }
    }
    return { name, input: normalized };
  }
  const rawPath = String(input.path ?? input.filename ?? input.file ?? input.directory ?? input.dir ?? "");
  const rawQuery = String(input.query ?? input.pattern ?? input.name ?? input.filename ?? input.search ?? "");
  const path = rawPath && rawPath !== "." ? rawPath : "";
  const query = rawQuery && rawQuery !== "." ? rawQuery : "";
  const lc = name.toLowerCase().replace(/[_\-\s]/g, "");
  if (lc === "listfiles" || lc === "ls" || lc === "listdirectory" || lc === "listdir") {
    return { name: "exec_command", input: { cmd: `ls ${path || "."}` } };
  }
  if (lc === "findfile" || lc === "searchfile" || lc === "search" || lc === "findinfiles" || lc === "findfiles") {
    const target = query || path;
    if (!target) return { name: "exec_command", input: { cmd: `ls -la .` } };
    return { name: "exec_command", input: { cmd: fileSearchCommand(target) } };
  }
  if (lc === "viewimage" || lc === "image" || lc === "analyzeimage") {
    const target = path || query;
    if (!target) return { name: "exec_command", input: { cmd: `echo "No image path provided"` } };
    return { name: "exec_command", input: { cmd: fileSearchCommand(target) } };
  }
  // read_file and similar - cat
  if (lc === "readfile" || lc === "read_file" || lc === "getfile" || lc === "openfile" || lc === "getfilecontent") {
    const filePath = path || query;
    if (!filePath) return { name: "exec_command", input: { cmd: `ls -la .` } };
    return { name: "exec_command", input: { cmd: `cat "${filePath}"` } };
  }
  // write_file - echo redirect (best-effort)
  if (lc === "writefile" || lc === "write_file" || lc === "createfile") {
    const content = String(input.content ?? input.text ?? input.data ?? "");
    const filePath = path || query;
    if (!filePath) return { name: "exec_command", input: { cmd: `echo 'no path provided'` } };
    return { name: "exec_command", input: { cmd: `cat > "${filePath}" << 'EOF'\n${content}\nEOF` } };
  }
  if (lc === "runcommand" || lc === "execute" || lc === "run") {
    const cmd = String(input.cmd ?? input.command ?? "echo 'no command'");
    return { name: "exec_command", input: { cmd } };
  }
  // Unknown: fallback
  const target = query || path;
  if (!target) return { name: "exec_command", input: { cmd: `ls -la .` } };
  return { name: "exec_command", input: { cmd: fileSearchCommand(target) } };
}

  // --- Conversation state store (for multi-turn tool use) ---
// Keyed by responseId we return to Codex - looked up on next request via previous_response_id.
interface ConvState {
  provider: string;
  model: string;
  messages: Message[];           // Anthropic-format history (tool_use/tool_result)
  openaiMessages?: unknown[];    // OpenAI-format history for Ollama / OpenAI API key
  googleContents?: unknown[];    // Gemini-format contents with functionCall/functionResponse parts
  googleToolCalls?: { id: string; name: string }[];
  instructions?: string;
  tools?: unknown[];
  toolTurnDepth?: number;        // consecutive tool-call turns in this Ollama conversation
  ts: number;
}
export const convStore = new Map<string, ConvState>();
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, s] of convStore) if (s.ts < cutoff) convStore.delete(id);
}, 5 * 60 * 1000).unref();

  // --- Request log ---
export interface RequestLogEntry {
  ts: number;
  requestedModel: string;
  provider: string;
  usedModel: string;
  fallback: boolean;
  failedModels?: string[];
  ms: number;
  status: "ok" | "error";
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  inputPreview?: string;
  outputPreview?: string;
  toolCalls?: string[];
  toolCallDetails?: { name: string; args: string }[];
  webFetches?: string[];
}
// Load persisted requests from today (local time), compacting the file
function loadAndCompact(): RequestLogEntry[] {
  if (!existsSync(REQUESTS_PATH)) return [];
  try {
    const cutoff = todayMidnight();
    const entries = readFileSync(REQUESTS_PATH, "utf-8")
      .split("\n").filter(Boolean)
      .map(line => { try { return JSON.parse(line) as RequestLogEntry; } catch { return null; } })
      .filter((e): e is RequestLogEntry => e !== null && e.ts >= cutoff);
    // Rewrite file with only today's entries
    writeFileSync(REQUESTS_PATH, entries.map(e => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : ""), "utf-8");
    return entries;
  } catch {
    return [];
  }
}

if (!existsSync(RCODEX_DIR)) mkdirSync(RCODEX_DIR, { recursive: true });
export const requestLog: RequestLogEntry[] = loadAndCompact();
scheduleMidnightReset();

export function pushLog(entry: RequestLogEntry): RequestLogEntry {
  requestLog.push(entry);
  const cutoff = todayMidnight();
  while (requestLog.length > 0 && requestLog[0].ts < cutoff) requestLog.shift();
  return entry;
}

export function flushLog(): void {
  try {
    writeFileSync(REQUESTS_PATH, requestLog.map(e => JSON.stringify(e)).join("\n") + (requestLog.length ? "\n" : ""), "utf-8");
  } catch { /* ignore */ }
}

  // --- Input parsing ---
// Normalize Responses API content types (input_text, output_text, input_image)
// to Anthropic-compatible types (text, image).
function normalizeContentType(type: string | undefined): string {
  if (!type) return "text";
  if (type === "input_text" || type === "output_text") return "text";
  if (type === "input_image") return "image";
  return type;
}

function parseInput(input: string | InputItem[]): Message[] {
  if (!input) return [];
  if (typeof input === "string") return [{ role: "user", content: input }];
  const items = input as unknown as { role?: string; content?: unknown }[];
  return items
    .filter(item => item.role && item.content != null)
    .map(item => ({
      role: item.role as string,
      content: typeof item.content === "string"
        ? item.content
        : (item.content as { type?: string; text?: string; [key: string]: unknown }[]).map(c => ({ ...c, type: normalizeContentType(c.type), ...(c.text != null ? { text: c.text } : {}) })),
    }));
}

function toOpenAIChatMessages(input: string | InputItem[], fallback: Message[]): unknown[] {
  if (!Array.isArray(input)) {
    return fallback.map(m => ({
      role: m.role === "developer" ? "system" : m.role,
      content: toOllamaContent(m.content),
    }));
  }

  const inputArr = input as unknown as Record<string, unknown>[];
  const hasFunctionItems = inputArr.some(i =>
    (i.type as string) === "function_call" || (i.type as string) === "function_call_output"
  );
  if (!hasFunctionItems) {
    return fallback.map(m => ({
      role: m.role === "developer" ? "system" : m.role,
      content: toOllamaContent(m.content),
    }));
  }

  const msgs: unknown[] = [];
  let pendingToolCalls: unknown[] = [];
  let pendingText = "";
  const flushAssistant = () => {
    if (pendingToolCalls.length > 0 || pendingText) {
      msgs.push({
        role: "assistant",
        content: pendingText || null,
        ...(pendingToolCalls.length > 0 ? { tool_calls: pendingToolCalls } : {}),
      });
      pendingToolCalls = [];
      pendingText = "";
    }
  };

  for (const item of inputArr) {
    const type = item.type as string;
    if (type === "message") {
      flushAssistant();
      const content = typeof item.content === "string" ? item.content
        : toOllamaContent(((item.content as { type?: string; text?: string; [key: string]: unknown }[]) ?? []).map(c => ({ ...c, type: normalizeContentType(c.type), ...(c.text != null ? { text: c.text } : {}) })));
      const role = ((item.role as string) || "user") === "developer" ? "system" : ((item.role as string) || "user");
      if (role === "assistant") pendingText += typeof content === "string" ? content : JSON.stringify(content);
      else msgs.push({ role, content });
    } else if (type === "function_call") {
      pendingToolCalls.push({
        id: (item.call_id as string) ?? (item.id as string) ?? `call_${Date.now()}`,
        type: "function",
        function: {
          name: item.name as string,
          arguments: typeof item.arguments === "string" ? item.arguments : JSON.stringify(item.arguments ?? {}),
        },
      });
    } else if (type === "function_call_output") {
      flushAssistant();
      msgs.push({ role: "tool", tool_call_id: item.call_id as string, content: parseCodexToolOutput(item.output) });
    }
  }
  flushAssistant();
  return msgs;
}

type OpenAIChatMessage = Record<string, unknown>;
type OpenAIToolCall = { id?: unknown };

function isOpenAIChatMessage(value: unknown): value is OpenAIChatMessage {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toolCallIds(message: OpenAIChatMessage): string[] {
  const toolCalls = message.tool_calls;
  if (!Array.isArray(toolCalls)) return [];
  return toolCalls
    .map(tc => isOpenAIChatMessage(tc) ? (tc as OpenAIToolCall).id : undefined)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

function filterToolCalls(message: OpenAIChatMessage, keepIds: Set<string>): OpenAIChatMessage | undefined {
  const toolCalls = message.tool_calls;
  if (!Array.isArray(toolCalls)) return message;
  const keptToolCalls = toolCalls.filter(tc => {
    if (!isOpenAIChatMessage(tc)) return false;
    return typeof tc.id === "string" && keepIds.has(tc.id);
  });
  if (keptToolCalls.length === 0 && (message.content == null || message.content === "")) return undefined;
  return keptToolCalls.length > 0
    ? { ...message, tool_calls: keptToolCalls }
    : Object.fromEntries(Object.entries(message).filter(([key]) => key !== "tool_calls"));
}

function sanitizeOpenAIChatHistoryForStrictTools(messages: unknown[]): unknown[] {
  const out: unknown[] = [];
  let pendingAssistantIndex: number | undefined;
  let pendingToolIds = new Set<string>();
  let seenToolIds = new Set<string>();

  const closePendingAssistant = () => {
    if (pendingAssistantIndex === undefined) return;
    const assistant = out[pendingAssistantIndex];
    if (!isOpenAIChatMessage(assistant)) return;
    const fixed = filterToolCalls(assistant, seenToolIds);
    if (fixed) out[pendingAssistantIndex] = fixed;
    else out.splice(pendingAssistantIndex, 1);
    pendingAssistantIndex = undefined;
    pendingToolIds = new Set();
    seenToolIds = new Set();
  };

  for (const message of messages) {
    if (!isOpenAIChatMessage(message)) {
      closePendingAssistant();
      out.push(message);
      continue;
    }

    if (message.role === "tool") {
      const id = message.tool_call_id;
      if (typeof id === "string" && pendingToolIds.has(id)) {
        seenToolIds.add(id);
        out.push(message);
      }
      continue;
    }

    closePendingAssistant();
    const ids = toolCallIds(message);
    out.push(message);
    if (message.role === "assistant" && ids.length > 0) {
      pendingAssistantIndex = out.length - 1;
      pendingToolIds = new Set(ids);
      seenToolIds = new Set();
    }
  }

  closePendingAssistant();
  return out;
}

function inputItemText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map(part => {
    if (!part || typeof part !== "object") return "";
    const p = part as { text?: unknown; type?: unknown };
    if (typeof p.text === "string") return p.text;
    return p.type ? JSON.stringify(part) : "";
  }).filter(Boolean).join("\n");
}

function buildAntigravityTextContentsFromInput(inputArr: Record<string, unknown>[]): unknown[] {
  const contents: unknown[] = [];
  const callIdToName = new Map<string, string>();
  let pendingModelText: string[] = [];
  const flushModel = () => {
    if (!pendingModelText.length) return;
    contents.push({ role: "model", parts: [{ text: pendingModelText.join("\n\n") }] });
    pendingModelText = [];
  };

  for (const item of inputArr) {
    const type = item.type as string;
    if (type === "message") {
      flushModel();
      const text = inputItemText(item.content);
      contents.push({ role: (item.role as string) === "assistant" ? "model" : "user", parts: [{ text }] });
    } else if (type === "function_call") {
      const id = (item.id ?? item.call_id) as string | undefined;
      const name = (item.name as string | undefined) ?? id ?? "tool";
      if (id) callIdToName.set(id, name);
      const args = typeof item.arguments === "string" ? item.arguments : JSON.stringify(item.arguments ?? {});
      pendingModelText.push("Tool call: " + name + (id ? " (" + id + ")" : "") + "\nArguments: " + args);
    } else if (type === "function_call_output") {
      flushModel();
      const callId = item.call_id as string | undefined;
      const name = (callId && callIdToName.get(callId)) || callId || "tool";
      contents.push({ role: "user", parts: [{ text: "Tool result for " + name + ":\n" + parseCodexToolOutput(item.output) }] });
    }
  }

  flushModel();
  return contents;
}

  // --- Response format converters ---
function chatToResponses(
  data: { id?: string; model: string; choices: { message: { content: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } },
  model: string
): ResponsesResponse {
  const text = data.choices?.[0]?.message?.content ?? "";
  return {
    id: data.id ?? `resp_${Date.now()}`,
    object: "response",
    model,
    output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }],
    usage: data.usage ? { input_tokens: data.usage.prompt_tokens, output_tokens: data.usage.completion_tokens, total_tokens: data.usage.total_tokens } : undefined,
  };
}

function anthropicToResponses(
  data: { id?: string; content: { type: string; text?: string }[]; model: string; usage?: { input_tokens: number; output_tokens: number } },
  model: string
): ResponsesResponse {
  const text = data.content?.find(b => b.type === "text")?.text ?? "";
  return {
    id: data.id ?? `resp_${Date.now()}`,
    object: "response",
    model,
    output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }],
    usage: data.usage ? { input_tokens: data.usage.input_tokens, output_tokens: data.usage.output_tokens, total_tokens: data.usage.input_tokens + data.usage.output_tokens } : undefined,
  };
}

function googleToResponses(
  data: {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  },
  model: string
): ResponsesResponse {
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const inputTokens = data.usageMetadata?.promptTokenCount;
  const outputTokens = data.usageMetadata?.candidatesTokenCount;
  const totalTokens = data.usageMetadata?.totalTokenCount ??
    (inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined);
  return {
    id: `resp_${Date.now()}`,
    object: "response",
    model,
    output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }],
    usage: inputTokens !== undefined || outputTokens !== undefined || totalTokens !== undefined
      ? {
          input_tokens: inputTokens ?? 0,
          output_tokens: outputTokens ?? 0,
          total_tokens: totalTokens ?? (inputTokens ?? 0) + (outputTokens ?? 0),
        }
      : undefined,
  };
}

  // --- Codex request builder ---
function buildCodexBody(req: ResponsesRequest, model: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    input: req.input,
    stream: true,
    store: req.store ?? false,
    reasoning: req.reasoning ?? { effort: "low", summary: "auto" },
    include: req.include ?? ["reasoning.encrypted_content"],
  };
  if (req.instructions) body.instructions = req.instructions;
  if (req.temperature !== undefined) body.temperature = req.temperature;
  if (req.max_output_tokens !== undefined) body.max_output_tokens = req.max_output_tokens;
  if (req.previous_response_id) body.previous_response_id = req.previous_response_id;
  if (req.tools) body.tools = req.tools;
  if (req.tool_choice) body.tool_choice = req.tool_choice;
  return body;
}

  // --- Codex OAuth transparent passthrough ---
// Forwards the FULL original request body (tools, previous_response_id, etc.)
// so Codex-native models (gpt-5.5 etc.) can execute shell/file tools normally.
export async function tryCodexPassthrough(
  rawBody: Record<string, unknown>,
  config: GatewayConfig,
  signal?: AbortSignal
): Promise<{ res: Response; account: Account; model: string } | null> {
  const model = rawBody.model as string;
  if (!model) return null;

  const candidates = resolveAccounts(model, config);
  const first = candidates[0];

  const hasPrevId = !!rawBody.previous_response_id;
  // If previous_response_id is in our convStore, we handled that turn - don't
  // passthrough, the follow-up also belongs to our proxy (e.g. Claude tool result)
  const prevIdIsOurs = hasPrevId && convStore.has(rawBody.previous_response_id as string);

  let codexCandidate: (typeof candidates)[0] | undefined;
  if (!prevIdIsOurs) {
    if (first?.account.method === "oauth-official" && first.account.provider === "openai") {
      // Codex OAuth is slot 1 - always passthrough
      codexCandidate = first;
    } else if (hasPrevId) {
      // previous_response_id not from our proxy - may be a Codex-native multi-turn ID
      // Look for any Codex OAuth as fallback (only for hasPrevId, NOT hasTools alone)
      codexCandidate = candidates.find(
        c => c.account.method === "oauth-official" && c.account.provider === "openai"
      );
    }
    // NOTE: hasTools alone no longer triggers passthrough - Claude/Gemini/Ollama handle tools too
  }
  if (!codexCandidate) return null;

  const account = await ensureFreshToken(codexCandidate.account);
  if (!account.oauthToken) return null;

  const body: Record<string, unknown> = { ...rawBody, model: codexCandidate.model, stream: true };
  try {
    const res = await callCodexAPI(account.oauthToken, body, signal);
    if (!res.ok) {
      gerr(`[gateway] Codex passthrough error: ${res.status}`);
      return null;
    }
    glog(`[gateway] Codex passthrough: ${codexCandidate.model}`);
    return { res, account, model: codexCandidate.model };
  } catch (err) {
    gerr(`[gateway] Codex passthrough failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

  // --- SSE stream reader ---
async function* readSSE(
  res: Response,
  extract: (evt: Record<string, unknown>) => string | null
): AsyncGenerator<string> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") return;
        try {
          const delta = extract(JSON.parse(raw) as Record<string, unknown>);
          if (delta) yield delta;
        } catch { /* skip malformed */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

  // --- Codex (Responses API) SSE reader - passes through reasoning + text ---
async function* readCodexSSEWithUsage(
  res: Response,
  usage: { inputTokens?: number; outputTokens?: number }
): AsyncGenerator<StreamChunk> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") return;
        try {
          const evt = JSON.parse(raw) as Record<string, unknown>;
          if (evt.type === "response.reasoning.delta") {
            const d = (evt as { delta?: { type?: string; text?: string } }).delta;
            if (d?.text) yield { type: 'reasoning', content: d.text };
          } else if (evt.type === "response.output_text.delta") {
            const delta = (evt as { delta?: string }).delta;
            if (delta) yield { type: 'text', content: delta };
          } else if (evt.type === "response.completed") {
            const resp = (evt as { response?: { usage?: { input_tokens?: number; output_tokens?: number } } }).response;
            if (resp?.usage?.input_tokens) usage.inputTokens = resp.usage.input_tokens;
            if (resp?.usage?.output_tokens) usage.outputTokens = resp.usage.output_tokens;
          }
        } catch { /* skip malformed */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

  // --- <think> tag parser (stateful, handles partial tags across chunks) ---
function* parseThinkChunks(
  state: { buf: string; inThink: boolean },
  incoming: string,
  final = false
): Generator<StreamChunk> {
  state.buf += incoming;
  const OPEN = "<think>", CLOSE = "</think>";
  while (true) {
    if (!state.inThink) {
      const s = state.buf.indexOf(OPEN);
      if (s === -1) {
        const safe = final ? state.buf.length : Math.max(0, state.buf.length - OPEN.length + 1);
        if (safe > 0) { yield { type: 'text', content: state.buf.slice(0, safe) }; state.buf = state.buf.slice(safe); }
        break;
      }
      if (s > 0) yield { type: 'text', content: state.buf.slice(0, s) };
      state.buf = state.buf.slice(s + OPEN.length);
      state.inThink = true;
    } else {
      const e = state.buf.indexOf(CLOSE);
      if (e === -1) {
        const safe = final ? state.buf.length : Math.max(0, state.buf.length - CLOSE.length + 1);
        if (safe > 0) { yield { type: 'reasoning', content: state.buf.slice(0, safe) }; state.buf = state.buf.slice(safe); }
        break;
      }
      if (e > 0) yield { type: 'reasoning', content: state.buf.slice(0, e) };
      state.buf = state.buf.slice(e + CLOSE.length);
      state.inThink = false;
    }
  }
}

  // --- OpenAI-format SSE reader - captures usage, <think> tags, and tool_calls ---
async function* readOpenAISSEWithUsage(
  res: Response,
  usage: { inputTokens?: number; outputTokens?: number },
  capturedTools?: { id: string; name: string; input: Record<string, unknown>; rawArgs?: string }[],
  capturedText?: { value: string },
  disableTextTools?: boolean
): AsyncGenerator<StreamChunk> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const thinkState = { buf: '', inThink: false };
  let textBufForToolMarkup = "";
  let channelBuf = "";
  let suppressUntilChannel = false;
  // OpenAI tool calls stream as index-keyed deltas
  const toolCalls = new Map<number, { id: string; name: string; args: string }>();

  type ToolCallDelta = { index: number; id?: string; function?: { name?: string; arguments?: unknown } };
  type Choice = { delta?: { content?: string; tool_calls?: ToolCallDelta[] }; finish_reason?: string | null };

  function toolArgsDelta(value: unknown): string | null {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") return JSON.stringify(value);
    return null;
  }

  function takeChannelMarker(input: string): { index: number; length: number } | null {
    const match = input.match(/<\|?channel\|?>/);
    return match?.index === undefined ? null : { index: match.index, length: match[0].length };
  }

  // Splits channel-markup buffer into thought segments (reasoning) and visible segments (text/tool).
  // Gemma models emit: thought\n[thinking]\n<channel|>\n[visible response]
  function splitChannelMarkup(text: string, final: boolean): { kind: 'thought' | 'visible'; content: string }[] {
    channelBuf += text;
    const segs: { kind: 'thought' | 'visible'; content: string }[] = [];
    while (channelBuf) {
      if (suppressUntilChannel) {
        const marker = takeChannelMarker(channelBuf);
        if (!marker) {
          if (final) {
            if (channelBuf.trim()) segs.push({ kind: 'thought', content: channelBuf });
            channelBuf = "";
            suppressUntilChannel = false;
          }
          return segs;
        }
        const thought = channelBuf.slice(0, marker.index);
        if (thought.trim()) segs.push({ kind: 'thought', content: thought });
        channelBuf = channelBuf.slice(marker.index + marker.length);
        suppressUntilChannel = false;
        continue;
      }
      if (/^thought\b\s*/.test(channelBuf)) {
        channelBuf = channelBuf.replace(/^thought\b\s*/, "");
        suppressUntilChannel = true;
        continue;
      }
      const marker = takeChannelMarker(channelBuf);
      if (marker) {
        const before = channelBuf.slice(0, marker.index);
        if (before) segs.push({ kind: 'visible', content: before });
        channelBuf = channelBuf.slice(marker.index + marker.length);
        continue;
      }
      const keep = final ? 0 : 32;
      if (channelBuf.length <= keep) return segs;
      segs.push({ kind: 'visible', content: channelBuf.slice(0, channelBuf.length - keep) });
      channelBuf = channelBuf.slice(-keep);
      return segs;
    }
    return segs;
  }

  function* flushToolCalls(): Generator<StreamChunk> {
    for (const [idx, call] of toolCalls) {
      let rawInput: Record<string, unknown> = {};
      try { rawInput = JSON.parse(call.args || "{}"); } catch { /* ignore */ }
      const { name: finalName, input: finalInput } = remapOllamaTool(call.name, rawInput);
      if (finalName !== call.name) glog(`[ollama] remap tool: ${call.name} -> ${finalName}(${JSON.stringify(finalInput)})`);
      else glog(`[ollama] tool call: ${finalName}(${call.args})`);
      const finalArgs = JSON.stringify(finalInput);
      yield { type: 'tool_call_start', id: call.id, name: finalName, index: idx };
      yield { type: 'tool_call_delta', id: call.id, delta: finalArgs, index: idx };
      yield { type: 'tool_call_end', id: call.id, name: finalName, arguments: finalArgs, index: idx };
      if (capturedTools) capturedTools.push({ id: call.id, name: finalName, input: finalInput, rawArgs: finalArgs });
    }
    toolCalls.clear();
  }

  function* emitTextToolCall(buf: string): Generator<StreamChunk> {
    const parsedTool = parseGeminiTextToolCall(buf);
    if (!parsedTool) return;
    if (parsedTool.before) {
      if (capturedText) capturedText.value += parsedTool.before;
      yield* parseThinkChunks(thinkState, parsedTool.before);
    }
    const { name: finalName, input: finalInput } = remapOllamaTool(parsedTool.name, parsedTool.args);
    const id = `call_${Date.now()}_${toolCalls.size}`;
    const argText = JSON.stringify(finalInput);
    yield { type: 'tool_call_start', id, name: finalName, index: 0 };
    yield { type: 'tool_call_delta', id, delta: argText, index: 0 };
    yield { type: 'tool_call_end', id, name: finalName, arguments: argText, index: 0 };
    if (capturedTools) capturedTools.push({ id, name: finalName, input: finalInput, rawArgs: argText });
    // Preserve text after </invoke></function_calls> instead of discarding it
    textBufForToolMarkup = extractAfterInvokeBlock(buf);
  }

  function* handleTextDelta(text: string, final = false): Generator<StreamChunk> {
    const segs = splitChannelMarkup(text, final);
    for (const seg of segs) {
      if (seg.kind === 'thought') {
        // Gemma thought channel - show as reasoning (gray in Codex UI)
        yield { type: 'reasoning', content: seg.content };
        continue;
      }
      if (disableTextTools) {
        // Summarize turn: emit text directly, no tool markup parsing
        if (capturedText) capturedText.value += seg.content;
        yield* parseThinkChunks(thinkState, seg.content);
        continue;
      }
      // Visible segment - run through tool-markup detection and think-tag parser
      textBufForToolMarkup += seg.content;
      const parsedTool = parseGeminiTextToolCall(textBufForToolMarkup);
      if (parsedTool) {
        yield* emitTextToolCall(textBufForToolMarkup);
        continue;
      }
      const markerStart = toolMarkupStart(textBufForToolMarkup);
      if (markerStart >= 0) continue;  // hold back - more chunks may complete the markup
      const safe = Math.max(0, textBufForToolMarkup.length - 32);
      if (safe > 0) {
        const out = textBufForToolMarkup.slice(0, safe);
        if (capturedText) capturedText.value += out;
        yield* parseThinkChunks(thinkState, out);
        textBufForToolMarkup = textBufForToolMarkup.slice(safe);
      }
    }
    // Final flush: try tool parse first (catches multi-chunk markup), then emit as text
    if (final && textBufForToolMarkup) {
      if (disableTextTools) {
        if (capturedText) capturedText.value += textBufForToolMarkup;
        yield* parseThinkChunks(thinkState, textBufForToolMarkup);
        textBufForToolMarkup = "";
      } else {
        // Loop: one response may contain multiple sequential tool calls (e.g. Claude XML format)
        let guard = 0;
        while (textBufForToolMarkup && guard++ < 20) {
          const parsedTool = parseGeminiTextToolCall(textBufForToolMarkup);
          if (parsedTool) {
            yield* emitTextToolCall(textBufForToolMarkup);  // updates textBufForToolMarkup to after
          } else {
            const cleaned = stripUnparsedToolMarkup(textBufForToolMarkup);
            if (cleaned) {
              if (capturedText) capturedText.value += cleaned;
              yield* parseThinkChunks(thinkState, cleaned);
            }
            textBufForToolMarkup = "";
          }
        }
      }
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") {
          yield* handleTextDelta('', true);
          yield* parseThinkChunks(thinkState, '', true);
          yield* flushToolCalls();
          return;
        }
        try {
          const evt = JSON.parse(raw) as Record<string, unknown>;
          const choice = (evt.choices as Choice[] | undefined)?.[0];
          const delta = choice?.delta;
          if (delta?.content) {
            yield* handleTextDelta(delta.content);
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              let existing = toolCalls.get(tc.index);
              const argsDelta = toolArgsDelta(tc.function?.arguments);
              if (!existing && tc.function?.name !== undefined) {
                const id = tc.id ?? `call_${Date.now()}_${tc.index}`;
                existing = { id, name: tc.function.name, args: "" };
                toolCalls.set(tc.index, existing);
                // Don't emit tool_call_start yet - normalize name+args in flushToolCalls
              }
              if (existing && argsDelta) {
                existing.args += argsDelta;
                // Don't emit tool_call_delta yet - emit normalized version in flushToolCalls
              }
            }
          }
          // On summarize turns (disableTextTools), skip native tool_calls too - some models
          // (qwen3) emit tool_calls even when tools are absent; ignoring prevents infinite loops.
          if (choice?.finish_reason === "tool_calls" && !disableTextTools) yield* flushToolCalls();
          const u = evt.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
          if (u?.prompt_tokens) usage.inputTokens = u.prompt_tokens;
          if (u?.completion_tokens) usage.outputTokens = u.completion_tokens;
        } catch { /* skip malformed */ }
      }
    }
    yield* handleTextDelta('', true);
    yield* parseThinkChunks(thinkState, '', true);
    if (!disableTextTools) yield* flushToolCalls();
  } finally {
    reader.releaseLock();
  }
}

  // --- Token refresh ---
export async function ensureFreshToken(account: Account): Promise<Account> {
  if (account.method !== "oauth-official" || !account.oauthRefresh || !account.oauthExpiry) return account;
  if (Date.now() < account.oauthExpiry - 5 * 60 * 1000) return account;
  try {
    const tokens = account.provider === "anthropic"
      ? await refreshClaudeAccessToken(account.oauthRefresh)
      : account.provider === "antigravity"
        ? await refreshAntigravityAccessToken(account.oauthRefresh)
        : await refreshOpenAIAccessToken(account.oauthRefresh);
    const expiry = Date.now() + tokens.expiresIn * 1000;
    updateAccountOAuth(account.id, tokens.accessToken, tokens.refreshToken, expiry);
    glog(`[gateway] token refreshed: ${account.provider}(${account.label})`);
    return { ...account, oauthToken: tokens.accessToken, oauthRefresh: tokens.refreshToken, oauthExpiry: expiry };
  } catch (err) {
    gerr(`[gateway] token refresh failed: ${account.provider} -> ${err instanceof Error ? err.message : String(err)}`);
    return account;
  }
}

  // --- Anthropic SSE reader that also captures usage and tool_use blocks ---
async function* readAnthropicSSEWithUsage(
  res: Response,
  usage: { inputTokens?: number; outputTokens?: number },
  capturedTools?: { id: string; name: string; input: Record<string, unknown> }[],
  capturedText?: { value: string }
): AsyncGenerator<StreamChunk> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  // Track tool_use blocks being streamed, keyed by content block index
  const toolBlocks = new Map<number, { id: string; name: string; args: string }>();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") return;
        try {
          const evt = JSON.parse(raw) as Record<string, unknown>;
          if (evt.type === "message_start") {
            const u = (evt.message as Record<string, unknown> | undefined)?.usage as { input_tokens?: number } | undefined;
            if (u?.input_tokens) usage.inputTokens = u.input_tokens;
          } else if (evt.type === "message_delta") {
            const u = (evt as { usage?: { output_tokens?: number } }).usage;
            if (u?.output_tokens) usage.outputTokens = u.output_tokens;
          } else if (evt.type === "content_block_start") {
            const idx = evt.index as number;
            const cb = evt.content_block as { type?: string; id?: string; name?: string } | undefined;
            if (cb?.type === "tool_use" && cb.id && cb.name) {
              toolBlocks.set(idx, { id: cb.id, name: cb.name, args: "" });
              yield { type: 'tool_call_start', id: cb.id, name: cb.name, index: idx };
            }
          } else if (evt.type === "content_block_delta") {
            const idx = evt.index as number;
            const d = evt.delta as { type?: string; text?: string; thinking?: string; partial_json?: string } | undefined;
            if (d?.type === "thinking_delta" && d.thinking) {
              yield { type: 'reasoning', content: d.thinking };
            } else if (d?.type === "text_delta" && d.text) {
              if (capturedText) capturedText.value += d.text;
              yield { type: 'text', content: d.text };
            } else if (d?.type === "input_json_delta" && d.partial_json) {
              const block = toolBlocks.get(idx);
              if (block) {
                block.args += d.partial_json;
                yield { type: 'tool_call_delta', id: block.id, delta: d.partial_json, index: idx };
              }
            }
          } else if (evt.type === "content_block_stop") {
            const idx = evt.index as number;
            const block = toolBlocks.get(idx);
            if (block) {
              yield { type: 'tool_call_end', id: block.id, name: block.name, arguments: block.args, index: idx };
              if (capturedTools) {
                try { capturedTools.push({ id: block.id, name: block.name, input: JSON.parse(block.args || "{}") }); }
                catch { capturedTools.push({ id: block.id, name: block.name, input: {} }); }
              }
              toolBlocks.delete(idx);
            }
          }
        } catch { /* skip malformed */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

  // --- Google / Antigravity SSE reader ---
async function* readGoogleSSEWithUsage(
  res: Response,
  usage: { inputTokens?: number; outputTokens?: number },
  capturedTools?: { id: string; name: string; input: Record<string, unknown>; thoughtSignature?: string }[],
  capturedText?: { value: string }
): AsyncGenerator<StreamChunk> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let toolIdx = 0;
  // thoughtSignature arrives on the thought part, not the functionCall part - track across SSE events
  let pendingThoughtSig: string | undefined;
  type GPart = { text?: string; thought?: boolean; thoughtSignature?: string; functionCall?: { name?: string; args?: Record<string, unknown> } };
  type GEvt = { candidates?: { content?: { parts?: GPart[] } }[]; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }; response?: GEvt };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") return;
        try {
          const parsed = JSON.parse(raw) as GEvt;
          // Antigravity wraps payload in { response: { candidates, usageMetadata, ... } }
          const evt = parsed.response ?? parsed;
          if (evt.usageMetadata?.promptTokenCount) usage.inputTokens = evt.usageMetadata.promptTokenCount;
          if (evt.usageMetadata?.candidatesTokenCount) usage.outputTokens = evt.usageMetadata.candidatesTokenCount;
          for (const part of evt.candidates?.[0]?.content?.parts ?? []) {
            if (part.thought) {
              // capture thoughtSignature from thought part; attach to the next functionCall
              if (part.thoughtSignature) pendingThoughtSig = part.thoughtSignature;
              continue;
            }
            if (part.text) {
              if (capturedText) capturedText.value += part.text;
              yield { type: 'text', content: part.text };
            }
            if (part.functionCall?.name) {
              const id = `call_g_${Date.now()}_${toolIdx}`;
              const args = part.functionCall.args ?? {};
              const argText = JSON.stringify(args);
              const thoughtSig = pendingThoughtSig ?? part.thoughtSignature;
              pendingThoughtSig = undefined;
              if (capturedTools) capturedTools.push({ id, name: part.functionCall.name, input: args, thoughtSignature: thoughtSig });
              yield { type: 'tool_call_start', id, name: part.functionCall.name, index: toolIdx };
              yield { type: 'tool_call_delta', id, delta: argText, index: toolIdx };
              yield { type: 'tool_call_end', id, name: part.functionCall.name, arguments: argText, index: toolIdx };
              toolIdx++;
            }
          }
        } catch { /* skip malformed */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

  // --- SSE extractors ---
const chatExtract = (evt: Record<string, unknown>): string | null => {
  const choices = evt.choices as { delta?: { content?: string } }[] | undefined;
  return choices?.[0]?.delta?.content ?? null;
};
const codexExtract = (evt: Record<string, unknown>): string | null =>
  (evt as { type?: string; delta?: string }).type === "response.output_text.delta"
    ? ((evt as { delta?: string }).delta ?? null) : null;
const anthropicExtract = (evt: Record<string, unknown>): string | null =>
  evt.type === "content_block_delta" &&
  (evt.delta as Record<string, unknown>)?.type === "text_delta"
    ? (evt.delta as Record<string, string>).text ?? null : null;

  // --- Account resolution: sorted by priority (slot order) ---
function resolveAccounts(requestedModel: string, config: GatewayConfig): { account: Account; model: string }[] {
  const safeDefault: Record<string, string> = {
    anthropic: "claude-opus-4-7-20250514",
    openai: "gpt-4o",
    google: "gemini-2.0-flash",
    ollama: requestedModel,
    antigravity: "ag/gemini-3.1-pro-high",
    copilot: "gpt-4o",
    kiro: "claude-sonnet-4.5",
    vertex: "gemini-3.1-pro-preview",
    opencode: "nemotron-3-super-free",
  };

  for (const pDef of FREETIER_PROVIDERS) {
    safeDefault[pDef.id] = pDef.models[0]?.id || "auto";
  }

  const providerFromModel =
    isAnthropicModel(requestedModel)   ? "anthropic"   :
    isOpenAIModel(requestedModel)      ? "openai"      :
    isGoogleModel(requestedModel)      ? "google"      :
    isOllamaModel(requestedModel)      ? "ollama"      :
    isAntigravityModel(requestedModel) ? "antigravity" :
    isKiroModel(requestedModel)        ? "kiro"        :
    isVertexModel(requestedModel)      ? "vertex"      :
    isVertexPartnerModel(requestedModel) ? "vertex"    :
    isOpenCodeModel(requestedModel)    ? "opencode"    :
    findFreetierProviderForModel(requestedModel) ?? null;

  const candidates: { account: Account; model: string; order: number }[] = [];

  for (const account of config.accounts) {
    if (account.activeModels?.length) {
      // New multi-slot routing
      for (const slot of account.activeModels) {
        const model = slot.model || safeDefault[account.provider] || requestedModel;
        candidates.push({ account, model, order: slot.order });
      }
    } else if (account.connectedToOut) {
      // Legacy single-connection fallback
      const model = account.selectedModel ||
        (providerFromModel === account.provider ? requestedModel : safeDefault[account.provider] || requestedModel);
      candidates.push({ account, model, order: account.connectedOrder ?? 999 });
    } else if (account.connectedToPi && account.piModels?.includes(requestedModel)) {
      candidates.push({ account, model: requestedModel, order: -1 });
    }
  }

  return candidates
    .sort((a, b) => a.order - b.order)
    .map(({ account, model }) => ({ account, model }));
}

  // --- Strip Codex tool instructions for non-Codex providers ---
// Codex always includes tool definitions (exec_command, shell_exec, etc.) in the
// system prompt. Non-Codex providers (Claude, Gemini, Ollama) would try to output
// tool calls in their own format (e.g., Claude's XML <function_calls> tags),
// which appears as raw text in Codex UI. Strip them so the model responds as
// a plain assistant without tool use.
const CODEX_TOOL_MARKERS = ['exec_command', 'shell_exec', 'read_file', 'write_file', 'workspace-write', 'function_calls', 'computer_call'];
function cleanInstructions(instructions: string | undefined): string | undefined {
  if (!instructions) return undefined;
  if (CODEX_TOOL_MARKERS.some(m => instructions.includes(m))) return undefined;
  return instructions;
}

function buildOpenAIToolsForProvider(req: ResponsesRequest, skipTypes = new Set<string>()): Record<string, unknown>[] | undefined {
  if (!Array.isArray(req.tools) || req.tools.length === 0) return undefined;
  const tools = (req.tools as Record<string, unknown>[])
    .filter(t => {
      const type = t.type as string | undefined;
      if (type && skipTypes.has(type)) return false;
      return toolName(t) != null;
    })
    .map(toOpenAIFunctionTool)
    .filter((t): t is Record<string, unknown> => t !== null);
  return tools.length > 0 ? tools : undefined;
}

function copilotInstructions(req: ResponsesRequest, tools?: unknown[]): string | undefined {
  if (!tools || tools.length === 0) return cleanInstructions(req.instructions);
  return [
    "You are an AI assistant. Respond in the same language as the user.",
    "Use the provided function tools for file, command, filesystem, browser, or web tasks.",
    "Never claim that a file was created, modified, read, or that a website was visited unless a tool result confirms it.",
    "Do not output XML, <function_calls>, <browser>, <file>, <tool_code>, or pseudo-tool tags as text.",
  ].join("\n");
}

  // --- Single provider call (non-streaming) ---
async function callSingleProvider(
  rawAccount: Account,
  model: string,
  req: ResponsesRequest,
  config: GatewayConfig,
  signal?: AbortSignal
): Promise<ResponsesResponse> {
  let account = rawAccount;
  const messages = parseInput(req.input);
  const { instructions } = req;

  if (account.provider === "anthropic") {
    account = await ensureFreshToken(account);
    const auth = accountToProviderAuth(account);
    const res = await callAnthropic(auth, model, messages, cleanInstructions(instructions), false, signal);
    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
    return anthropicToResponses(await res.json() as Parameters<typeof anthropicToResponses>[0], model);
  }

  if (account.provider === "google") {
    const auth = accountToProviderAuth(account);
    const res = await callGoogle(auth, model, messages, cleanInstructions(instructions), false, signal);
    if (!res.ok) throw new Error(`Google error ${res.status}: ${await res.text()}`);
    return googleToResponses(await res.json() as Parameters<typeof googleToResponses>[0], model);
  }

  if (account.provider === "antigravity") {
    account = await ensureFreshToken(account);
    const accessToken = account.oauthToken;
    if (!accessToken) throw new Error("Antigravity: no access token - re-login required");
    if (!account.projectId) {
      try {
        const projectId = await loadAntigravityProject(accessToken);
        account.projectId = projectId;
        const cfg = loadConfig();
        const stored = cfg.accounts.find(a => a.id === account.id);
        if (stored) { stored.projectId = projectId; saveConfig(cfg); }
      } catch { /* ignore */ }
    }
    const agMessages = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: typeof m.content === "string" ? m.content : (m.content as { text?: string }[]).map(c => c.text ?? "").join("") }],
    }));
    const agSysInstruction = cleanInstructions(instructions) ? { parts: [{ text: cleanInstructions(instructions) }] } : undefined;
    const res = await callAntigravity(accessToken, model, agMessages, agSysInstruction, undefined, false, signal, account.projectId);
    if (!res.ok) throw new Error(`Antigravity error ${res.status}: ${await res.text()}`);
    const data = await res.json() as Record<string, unknown>;
    const inner = ((data.response ?? data) as Parameters<typeof googleToResponses>[0]);
    return googleToResponses(inner, model);
  }

  if (account.provider === "ollama") {
    const res = await callOllama(config.ollamaBaseUrl, model, messages, cleanInstructions(instructions), false, signal);
    if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
    return chatToResponses(await res.json() as Parameters<typeof chatToResponses>[0], model);
  }

  if (account.provider === "copilot") {
    const openaiMessages = toOpenAIChatMessages(req.input, messages);
    const tools = buildOpenAIToolsForProvider(req, COMPUTER_USE_TYPES);
    const copilotMessages = sanitizeOpenAIChatHistoryForStrictTools(openaiMessages);
    const res = await callCopilot(account.oauthToken ?? "", model, copilotMessages, copilotInstructions(req, tools), false, signal, tools);
    if (!res.ok) throw new Error(`Copilot error ${res.status}: ${await res.text()}`);
    return chatToResponses(await res.json() as Parameters<typeof chatToResponses>[0], model);
  }

  if (account.provider === "kiro") {
    const kiroMsgs = toOpenAIChatMessages(req.input, messages) as { role: string; content: string | unknown }[];
    const res = await callKiro(account.apiKey ?? "", model, kiroMsgs, cleanInstructions(instructions), signal, buildOpenAIToolsForProvider(req));
    if (!res.ok) throw new Error(`Kiro error ${res.status}: ${await res.text()}`);
    let text = "";
    const usageObj: { inputTokens?: number; outputTokens?: number } = {};
    for await (const chunk of readKiroEventStream(res, usageObj)) {
      if (chunk.type === "text") text += chunk.content;
    }
    return {
      id: `resp_${Date.now()}`,
      object: "response",
      model,
      output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }],
      usage: usageObj.inputTokens !== undefined || usageObj.outputTokens !== undefined ? {
        input_tokens: usageObj.inputTokens ?? 0,
        output_tokens: usageObj.outputTokens ?? 0,
        total_tokens: (usageObj.inputTokens ?? 0) + (usageObj.outputTokens ?? 0),
      } : undefined,
    };
  }

  if (account.provider === "vertex") {
    if (isVertexModel(model)) {
      const res = await callVertex(account.apiKey ?? "", model, messages, cleanInstructions(instructions), false, signal, buildOpenAIToolsForProvider(req));
      if (!res.ok) throw new Error(`Vertex error ${res.status}: ${await res.text()}`);
      return googleToResponses(await res.json() as Parameters<typeof googleToResponses>[0], model);
    } else {
      const res = await callVertexPartner(account.apiKey ?? "", model, messages, cleanInstructions(instructions), false, signal);
      if (!res.ok) throw new Error(`Vertex Partner error ${res.status}: ${await res.text()}`);
      return chatToResponses(await res.json() as Parameters<typeof chatToResponses>[0], model);
    }
  }

  if (account.provider === "opencode") {
    const res = await callOpenCode(model, messages, cleanInstructions(instructions), false, signal);
    if (!res.ok) throw new Error(`OpenCode error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (model === "big-pickle") {
      return anthropicToResponses(data as Parameters<typeof anthropicToResponses>[0], model);
    }
    return chatToResponses(data as Parameters<typeof chatToResponses>[0], model);
  }

  if (isFreetierProvider(account.provider)) {
    const res = await callFreetier(account.provider, account.apiKey ?? "", model, messages, cleanInstructions(instructions), false, signal);
    if (!res.ok) throw new Error(`Free-tier provider ${account.provider} error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const providerDef = FREETIER_PROVIDERS.find(p => p.id === account.provider);
    if (providerDef?.format === "claude") {
      return anthropicToResponses(data as Parameters<typeof anthropicToResponses>[0], model);
    }
    return chatToResponses(data as Parameters<typeof chatToResponses>[0], model);
  }

  // OpenAI
  account = await ensureFreshToken(account);
  if (account.method === "oauth-official") {
    if (!account.oauthToken) throw new Error("OpenAI OAuth token missing");
    const res = await callCodexAPI(account.oauthToken, buildCodexBody(req, model), signal);
    if (!res.ok) throw new Error(`Codex error ${res.status}: ${await res.text()}`);
    let fullText = "";
    for await (const delta of readSSE(res, codexExtract)) fullText += delta;
    return { id: `resp_${Date.now()}`, object: "response", model, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: fullText }] }] };
  }
  if (account.method === "oauth-unofficial") {
    const auth = accountToProviderAuth(account);
    return callOpenAIAndParse(auth, model, messages, instructions, signal);
  }
  const auth = accountToProviderAuth(account);
  const res = await callOpenAI(auth, model, messages, instructions, false, signal);
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  return chatToResponses(await res.json() as Parameters<typeof chatToResponses>[0], model);
}

  // --- Single provider stream ---
async function* streamSingleProvider(
  rawAccount: Account,
  model: string,
  req: ResponsesRequest,
  config: GatewayConfig,
  signal?: AbortSignal,
  usage: { inputTokens?: number; outputTokens?: number } = {},
  responseId?: string
): AsyncGenerator<StreamChunk> {
  let account = rawAccount;
  const messages = parseInput(req.input);
  const { instructions } = req;

  if (account.provider === "anthropic") {
    account = await ensureFreshToken(account);
    const auth = accountToProviderAuth(account);
    const useThinking = supportsThinking(model);
    const cleanedInstructions = cleanInstructions(instructions);

    // Multi-turn tool use: reconstruct conversation from stored state
    let anthropicMessages: Message[];
    if (req.previous_response_id) {
      const prior = convStore.get(req.previous_response_id);
      if (prior) {
        anthropicMessages = [...prior.messages];
        const inputItems = Array.isArray(req.input) ? req.input as unknown as Record<string, unknown>[] : [];
        const toolResults = inputItems
          .filter(item => (item.type as string) === "function_call_output")
          .map(item => ({
            type: "tool_result",
            tool_use_id: item.call_id as string,
            content: typeof item.output === "string" ? item.output : JSON.stringify(item.output),
          } as ContentPart));
        if (toolResults.length > 0) anthropicMessages.push({ role: "user", content: toolResults });
      } else {
        anthropicMessages = messages;
      }
    } else {
      anthropicMessages = messages;
    }

    // Anthropic doesn't accept role "developer" (OpenAI inline system role)
    // fold developer messages into the system prompt and drop them from the list.
    const developerContent = anthropicMessages
      .filter(m => m.role === "developer")
      .map(m => typeof m.content === "string" ? m.content : (m.content as ContentPart[]).map(c => c.text ?? "").join(""))
      .join("\n\n");
    const filteredMessages = anthropicMessages.filter(m => m.role === "user" || m.role === "assistant");
    const effectiveSystem = developerContent
      ? (cleanedInstructions ? `${cleanedInstructions}\n\n${developerContent}` : developerContent)
      : cleanedInstructions;

    // Filter to known-valid tools: function tools (have name) + computer_use types
    const rawTools = Array.isArray(req.tools) ? (req.tools as Record<string, unknown>[]) : [];
    const validTools = rawTools.filter(t =>
      (typeof t.name === "string" && t.name.length > 0) ||
      COMPUTER_USE_TYPES.has(t.type as string)
    );
    const anthropicTools = validTools.length > 0 ? validTools.map(toAnthropicTool) : undefined;
    const hasComputerUse = validTools.some(t => COMPUTER_USE_TYPES.has(t.type as string));
    const betas = hasComputerUse ? ["computer-use-2024-10-22"] : undefined;
    const capturedTools: { id: string; name: string; input: Record<string, unknown>; rawArgs?: string }[] = [];
    const capturedText = { value: "" };

    const res = await callAnthropic(auth, model, filteredMessages, effectiveSystem, true, signal, useThinking, anthropicTools, betas);
    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
    yield* readAnthropicSSEWithUsage(res, usage, capturedTools, capturedText);

    if (responseId && capturedTools.length > 0) {
      const assistantContent: ContentPart[] = [];
      if (capturedText.value) assistantContent.push({ type: "text", text: capturedText.value });
      for (const t of capturedTools) assistantContent.push({ type: "tool_use", id: t.id, name: t.name, input: t.input });
      convStore.set(responseId, {
        provider: "anthropic", model,
        messages: [...filteredMessages, { role: "assistant", content: assistantContent }],
        instructions: effectiveSystem, tools: req.tools, ts: Date.now(),
      });
      glog(`[gateway] conv stored: ${responseId} (${capturedTools.length} tools)`);
    }
    return;
  }

  if (account.provider === "google") {
    const auth = accountToProviderAuth(account);
    const hasToolInstructions = (Array.isArray(req.tools) && req.tools.length > 0) ||
      CODEX_TOOL_MARKERS.some(m => (instructions ?? "").includes(m));
    const googleSystem = hasToolInstructions
      ? "Use the provided function tools for all file, command, system, and web requests. Call tools directly without narrating what you plan to do."
      : cleanInstructions(instructions);
    const rawTools = Array.isArray(req.tools) ? (req.tools as Record<string, unknown>[]) : [];
    const googleTools = rawTools
      .filter(t => { const type = t.type as string | undefined; return !type || (!COMPUTER_USE_TYPES.has(type) && type !== "web_search"); })
      .map(toGoogleTool)
      .filter((t): t is Record<string, unknown> => t !== null);

    const inputArr = Array.isArray(req.input) ? req.input as unknown as Record<string, unknown>[] : [];
    let googleContents: unknown[] | undefined;
    if (req.previous_response_id) {
      const prior = convStore.get(req.previous_response_id);
      if (prior?.googleContents) {
        const fnResponses = inputArr
          .filter(item => (item.type as string) === "function_call_output")
          .map(item => {
            const name = prior.googleToolCalls?.find(t => t.id === item.call_id)?.name ?? (item.call_id as string);
            return { functionResponse: { name, response: { result: typeof item.output === "string" ? item.output : JSON.stringify(item.output) } } };
          });
        googleContents = fnResponses.length
          ? [...prior.googleContents, { role: "user", parts: fnResponses }]
          : [...prior.googleContents];
      }
    }

    const capturedTools: { id: string; name: string; input: Record<string, unknown> }[] = [];
    const capturedText = { value: "" };
    const res = await callGoogle(auth, model, messages, googleSystem, true, signal, googleTools, googleContents);
    if (!res.ok) throw new Error(`Google error ${res.status}: ${await res.text()}`);
    yield* readGoogleSSEWithUsage(res, usage, capturedTools, capturedText);

    if (responseId && capturedTools.length > 0) {
      const base = googleContents ?? messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: typeof m.content === "string" ? m.content : m.content.map((c) => c.text ?? "").join("") }],
      }));
      const assistantParts: unknown[] = [];
      if (capturedText.value) assistantParts.push({ text: capturedText.value });
      for (const t of capturedTools) assistantParts.push({ functionCall: { name: t.name, args: t.input } });
      convStore.set(responseId, {
        provider: "google", model,
        messages: [],
        googleContents: [...base, { role: "model", parts: assistantParts }],
        googleToolCalls: capturedTools.map(t => ({ id: t.id, name: t.name })),
        instructions: googleSystem, tools: req.tools, ts: Date.now(),
      });
      glog(`[gateway] conv stored (google): ${responseId} (${capturedTools.length} tools)`);
    }
    return;
  }

  // Antigravity (Google Gemini via daily-cloudcode-pa.googleapis.com)
  if (account.provider === "antigravity") {
    account = await ensureFreshToken(account);
    const accessToken = account.oauthToken;
    if (!accessToken) throw new Error("Antigravity: no access token - re-login required");

    // Fetch and persist projectId on first use if missing
    if (!account.projectId) {
      try {
        const projectId = await loadAntigravityProject(accessToken);
        account.projectId = projectId;
        const cfg = loadConfig();
        const stored = cfg.accounts.find(a => a.id === account.id);
        if (stored) { stored.projectId = projectId; saveConfig(cfg); }
        glog(`[gateway] antigravity: fetched projectId=${projectId}`);
      } catch (e) {
        gerr(`[gateway] antigravity: could not fetch projectId - ${(e as Error).message}`);
      }
    }

    const hasToolInstructions = (Array.isArray(req.tools) && req.tools.length > 0) ||
      CODEX_TOOL_MARKERS.some(m => (instructions ?? "").includes(m));
    const agSystem = hasToolInstructions
      ? "Use the provided function tools for all file, command, system, and web requests. Call tools directly without narrating what you plan to do."
      : cleanInstructions(instructions);

    const rawTools = Array.isArray(req.tools) ? (req.tools as Record<string, unknown>[]) : [];
    const agTools = rawTools
      .filter(t => { const type = t.type as string | undefined; return !type || (!COMPUTER_USE_TYPES.has(type) && type !== "web_search"); })
      .map(toGoogleTool)
      .filter((t): t is Record<string, unknown> => t !== null);

    const inputArr = Array.isArray(req.input) ? req.input as unknown as Record<string, unknown>[] : [];
    const hasFnItems = inputArr.some(i => (i.type as string) === "function_call" || (i.type as string) === "function_call_output");
    let agContents: unknown[] | undefined;
    if (req.previous_response_id) {
      const prior = convStore.get(req.previous_response_id);
      if (prior?.googleContents) {
        const callNames = new Map((prior.googleToolCalls ?? []).map(t => [t.id, t.name]));
        const responseParts = inputArr
          .filter(item => (item.type as string) === "function_call_output")
          .map(item => {
            const callId = item.call_id as string | undefined;
            const name = callId ? callNames.get(callId) : undefined;
            if (callId && name) {
              const output = typeof item.output === "string" ? item.output : JSON.stringify(item.output ?? "");
              return { functionResponse: { id: callId, name, response: { result: output } } };
            }
            return { text: `Tool result for ${callId ?? "tool"}:\n${parseCodexToolOutput(item.output)}` };
          });
        agContents = responseParts.length
          ? [...prior.googleContents, { role: "user", parts: responseParts }]
          : [...prior.googleContents];
        glog(`[gateway] antigravity: using stored googleContents (thoughtSignature preserved)`);
      }
    }
    if (!agContents && hasFnItems) {
      agContents = buildAntigravityTextContentsFromInput(inputArr);
      glog(`[gateway] antigravity: rebuilt stateless tool history as text (missing thoughtSignature)`);
    }

    const agFinalContents = agContents ?? messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: typeof m.content === "string" ? m.content : m.content.map(c => c.text ?? "").join("") }],
    }));
    const agSysInstruction = agSystem ? { parts: [{ text: agSystem }] } : undefined;

    const agCapturedTools: { id: string; name: string; input: Record<string, unknown>; thoughtSignature?: string }[] = [];
    const agCapturedText = { value: "" };

    // Retry with progressively truncated tool outputs on context overflow
    let agCurrentContents = agFinalContents;
    let agRes: Response | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      agRes = await callAntigravity(accessToken, model, agCurrentContents, agSysInstruction, agTools, true, signal, account.projectId);
      if (agRes.ok) break;
      const errText = await agRes.text();
      const isOverflow = agRes.status === 400 && (
        errText.includes("token count exceeds") ||
        errText.includes("maximum context length") ||
        errText.includes("longer than the model's context length") ||
        errText.includes("exceed max_num_tokens") ||
        errText.includes("exceeds the model's maximum context")
      );
      if (!isOverflow) throw new Error(`Antigravity error ${agRes.status}: ${errText}`);
      // Halve the largest functionResponse outputs and retry
      const factor = 0.5 ** (attempt + 1);
      agCurrentContents = agCurrentContents.map((c: unknown) => {
        const msg = c as { role: string; parts: { functionResponse?: { id?: string; name: string; response?: { result?: string } } }[] };
        if (msg.role !== "user") return c;
        return {
          ...msg,
          parts: msg.parts.map(p => {
            if (!p.functionResponse?.response?.result) return p;
            const orig = p.functionResponse.response.result;
            const limit = Math.max(500, Math.floor(orig.length * factor));
            if (orig.length <= limit) return p;
            return { ...p, functionResponse: { ...p.functionResponse, response: { result: orig.slice(0, limit) + `\n[truncated to ${limit}/${orig.length} chars due to context limit]` } } };
          }),
        };
      });
      glog(`[gateway] antigravity context overflow - retry ${attempt + 1} with tool outputs at ${Math.round(factor * 100)}%`);
    }
    if (!agRes!.ok) throw new Error(`Antigravity error ${agRes!.status}: context overflow after retries`);
    yield* readGoogleSSEWithUsage(agRes!, usage, agCapturedTools, agCapturedText);

    if (responseId && agCapturedTools.length > 0) {
      const assistantParts: unknown[] = [];
      if (agCapturedText.value) assistantParts.push({ text: agCapturedText.value });
      for (const t of agCapturedTools) {
        if (!t.thoughtSignature) {
          assistantParts.push({ text: `Tool call: ${t.name}\nArguments: ${JSON.stringify(t.input)}` });
          continue;
        }
        const fc: Record<string, unknown> = { name: t.name, args: t.input };
        assistantParts.push({ functionCall: fc, thoughtSignature: t.thoughtSignature });
      }
      convStore.set(responseId, {
        provider: "antigravity", model,
        messages: [],
        googleContents: [...agCurrentContents, { role: "model", parts: assistantParts }],
        googleToolCalls: agCapturedTools.filter(t => t.thoughtSignature).map(t => ({ id: t.id, name: t.name })),
        instructions: agSystem, tools: req.tools, ts: Date.now(),
      });
      glog(`[gateway] conv stored (antigravity): ${responseId} (${agCapturedTools.length} tools)`);
    }
    return;
  }

  if (account.provider === "ollama") {
    // Keep Codex/skill instructions. Add bridge rules so local models use native
    // function calls instead of falling back to generic "no filesystem access" text.
    // Add bridge rules whenever tools are available (req.tools) OR instructions mention tools.
    // Previously only checked instructions, so models got no bridge rules when req.tools was
    // present but instructions had no tool marker text (common with qwen/non-English models).
    const hasToolInstructions = (Array.isArray(req.tools) && req.tools.length > 0) ||
      CODEX_TOOL_MARKERS.some(m => (instructions ?? "").includes(m));
    // For tool requests: use a short Ollama-optimized prompt instead of passing the full
    // Claude-specific Codex instructions. Those instructions confuse local models (they are
    // thousands of tokens of Claude-specific guidance) and bury the bridge rules at the end.
    const ollamaSystem = hasToolInstructions
      ? [
          "You are an AI assistant. Respond in the same language as the user.",
          "",
          "Tool use rules:",
          "- For file/command/system tasks: call the tool immediately. Do not narrate what you plan to do.",
          "- Parent directory = '../' path. Current directory = './' path.",
          "- File creation example: exec_command(cmd=\"echo '# Hello' > ../Hello.md\")",
          "- URL/web requests: use web_fetch tool ONLY. Never use curl/wget via exec_command.",
          "- After receiving a tool result: continue toward the original goal. Do not stop or ask questions until done.",
          "- Do NOT output XML, <function_calls>, or tool markup as text.",
        ].join("\n")
      : cleanInstructions(instructions);

    // Pass all Codex function tools to Ollama except web_search-typed and computer_use tools.
    // web_search is handled by the gateway web_fetch fallback below.
    // computer_use is a GUI tool that local models cannot execute.
    const SKIP_FOR_OLLAMA = new Set(["web_search", ...Array.from(COMPUTER_USE_TYPES)]);
    const SKIP_TOOL_NAMES_FOR_OLLAMA = new Set(["viewimage", "image", "analyzeimage"]);
    const ollamaTools = Array.isArray(req.tools) && req.tools.length > 0
      ? (req.tools as Record<string, unknown>[])
          .filter(t => {
            const type = t.type as string | undefined;
            if (type && SKIP_FOR_OLLAMA.has(type)) return false;
            const name = toolName(t);
            if (!name) return false;
            if (SKIP_TOOL_NAMES_FOR_OLLAMA.has(name.toLowerCase().replace(/[_\-\s]/g, ""))) return false;
            return true;
          })
          .map(toOpenAIFunctionTool)
          .filter((t): t is Record<string, unknown> => t !== null)
      : undefined;

    // Check if Codex provides web_search with external access enabled.
    // When available, expose it to Ollama as an OpenAI function tool and let Codex execute it.
    // When not available, fall back to gateway-direct web_fetch.
    const codexWebSearch = Array.isArray(req.tools)
      ? (req.tools as Record<string, unknown>[]).find(
          t => (t.type as string) === "web_search" && t.external_web_access === true
        )
      : undefined;
    const codexWebSearchTool: Record<string, unknown> | undefined = codexWebSearch ? {
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web for current information. Use for news, facts, or any live internet data.",
        parameters: {
          type: "object",
          properties: { query: { type: "string", description: "Search query" } },
          required: ["query"],
        },
      },
    } : undefined;
    glog(`[ollama] web_search: ${codexWebSearch ? "codex(enabled)" : "gateway-fetch(fallback)"}`);

    // Multi-turn: Codex operates in stateless mode - it sends the full conversation every turn
    // in req.input as an array of typed items (message, function_call, function_call_output).
    // We parse the full array and reconstruct OpenAI-format messages so the model sees tool results.
    let prebuiltMessages: unknown[] | undefined;
    let isToolResultTurn = false;
    let currentToolDepth = 0;
    const MAX_TOOL_TURNS = 4;

    const inputArr = Array.isArray(req.input) ? req.input as unknown as Record<string, unknown>[] : [];
    const hasFunctionItems = inputArr.some(i =>
      (i.type as string) === "function_call" || (i.type as string) === "function_call_output"
    );

    if (hasFunctionItems) {
      // Stateless multi-turn: reconstruct full conversation from input array
      currentToolDepth = inputArr.filter(i => (i.type as string) === "function_call").length;
      glog(`[ollama] stateless turn: depth=${currentToolDepth} items=${inputArr.length}`);

      if (currentToolDepth > MAX_TOOL_TURNS) {
        // Too many rounds - force text-only summarize
        isToolResultTurn = true;
        const origQ = inputArr.find(i => (i.type as string) === "message" && i.role === "user");
        const origQuestion = typeof origQ?.content === "string" ? origQ.content
          : ((origQ?.content as { text?: string }[]) ?? []).map(c => c.text ?? "").join("");
        const resultsText = inputArr
          .filter(i => (i.type as string) === "function_call_output")
          .map(i => parseCodexToolOutput(i.output))
          .join("\n---\n");
        prebuiltMessages = [
          { role: "system", content: "Answer in the same language as the user. Do NOT call any tools. Respond with text only." },
          { role: "user", content: `User question: ${origQuestion}\n\nTool results:\n${resultsText}\n\nBased on the above results, answer the user's question concisely.` },
        ];
      } else {
        // Build OpenAI-format history: message -> function_call -> function_call_output
        const msgs: unknown[] = [{ role: "system", content: ollamaSystem }];
        let pendingToolCalls: unknown[] = [];
        let pendingText = "";
        const flushAssistant = () => {
          if (pendingToolCalls.length > 0 || pendingText) {
            msgs.push({ role: "assistant", content: pendingText || null, ...(pendingToolCalls.length > 0 ? { tool_calls: pendingToolCalls } : {}) });
            pendingToolCalls = []; pendingText = "";
          }
        };
        for (const item of inputArr) {
          const type = item.type as string;
          if (type === "message") {
            flushAssistant();
            const content = typeof item.content === "string" ? item.content
              : toOllamaContent(((item.content as { type?: string; text?: string; [key: string]: unknown }[]) ?? []).map(c => ({ ...c, type: normalizeContentType(c.type), ...(c.text != null ? { text: c.text } : {}) })));
            const role = (item.role as string) || "user";
            if (role === "assistant") { pendingText += typeof content === "string" ? content : JSON.stringify(content); }
            else { msgs.push({ role, content }); }
          } else if (type === "function_call") {
            pendingToolCalls.push({
              id: (item.id as string) ?? `call_${Date.now()}`,
              type: "function",
              function: {
                name: item.name as string,
                arguments: typeof item.arguments === "string" ? item.arguments : JSON.stringify(item.arguments ?? {}),
              },
            });
          } else if (type === "function_call_output") {
            flushAssistant();
            msgs.push({ role: "tool", tool_call_id: item.call_id as string, content: parseCodexToolOutput(item.output) });
          }
        }
        flushAssistant();
        prebuiltMessages = msgs;
      }
    } else if (req.previous_response_id) {
      // Stateful fallback (previous_response_id present, no function items in input)
      const prior = convStore.get(req.previous_response_id);
      if (prior?.openaiMessages) {
        prebuiltMessages = [...prior.openaiMessages];
      }
    }

    // If Codex web_search is not available, fall back to gateway-direct web_fetch.
    const webFetchSchema: Record<string, unknown> = {
      type: "function",
      function: {
        name: "web_fetch",
        description: "Fetch and read the text content of any URL from the internet. Use whenever the user asks to visit a website or read a specific URL.",
        parameters: { type: "object", properties: { url: { type: "string", description: "Full URL to fetch" } }, required: ["url"] },
      },
    };
    // GATEWAY_TOOL_NAMES is empty: web_fetch function_call events now flow to Codex (for gray-section display),
    // while the gateway ALSO executes the fetch internally via the loop below.
    const GATEWAY_TOOL_NAMES = new Set<string>();
    const MAX_WEB_FETCHES = 2;
    let gatewayFetchCount = 0;

    // Don't offer tools in the summarize turn - model must answer in text.
    // Ollama always uses gateway web_fetch - Codex web_search is unreliable for local models.
    const turnTools = isToolResultTurn ? undefined : [...(ollamaTools ?? []), webFetchSchema];

    // Build initial conversation history for the gateway tool loop.
    const loopInitialMsgs: unknown[] = prebuiltMessages ?? (() => {
      const msgs: unknown[] = [];
      if (ollamaSystem) msgs.push({ role: "system", content: ollamaSystem });
      msgs.push(...messages.map(m => ({
        role: m.role,
        content: toOllamaContent(m.content),
      })));
      return msgs;
    })();
    let loopMsgs: unknown[] = loopInitialMsgs;
    let activeTurnTools = turnTools;

    let capturedOllamaTools: { id: string; name: string; input: Record<string, unknown>; rawArgs?: string }[] = [];
    let capturedOllamaText = { value: "" };

    // Open reasoning item early so Codex idle timer stays alive during model load
    yield { type: 'reasoning' as const, content: '' };

    while (true) {
      capturedOllamaTools = [];
      capturedOllamaText = { value: "" };

      const res = await callOllama(config.ollamaBaseUrl, model, messages, ollamaSystem, true, signal, activeTurnTools, loopMsgs);
      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 400 && /does not support tools/i.test(errorText) && activeTurnTools?.length) {
          gwarn(`[ollama] ${model} does not support tools; retrying without tools`);
          activeTurnTools = undefined;
          continue;
        }
        if (res.status === 500 && /missing data required for image input/i.test(errorText)) {
          const msg = `Ollama model "${model}" cannot process image input. Use a vision-capable Ollama model with its projector/data installed, such as llama3.2-vision or llava.`;
          gerr(`[ollama] vision input unsupported by ${model}: ${errorText}`);
          capturedOllamaText.value += msg;
          yield { type: "text", content: msg };
          return;
        }
        throw new Error(`Ollama error ${res.status}: ${errorText}`);
      }

      // Stream chunks to server.ts, suppressing tool_call events for gateway-handled tools
      const gatewayCallIds = new Set<string>();
      for await (const chunk of readOpenAISSEWithUsage(res, usage, capturedOllamaTools, capturedOllamaText, isToolResultTurn)) {
        if (chunk.type === 'tool_call_start' && GATEWAY_TOOL_NAMES.has(chunk.name)) {
          gatewayCallIds.add(chunk.id);
          continue;
        }
        if ((chunk.type === 'tool_call_delta' || chunk.type === 'tool_call_end') && gatewayCallIds.has(chunk.id)) {
          continue;
        }
        yield chunk;
      }

      const webFetchCalls = capturedOllamaTools.filter(t => t.name === "web_fetch");
      const codexToolCalls = capturedOllamaTools.filter(t => t.name !== "web_fetch");

      if (webFetchCalls.length === 0 || gatewayFetchCount >= MAX_WEB_FETCHES) break;
      gatewayFetchCount += webFetchCalls.length;

      // Append assistant turn with all tool calls to conversation history
      loopMsgs = [
        ...loopMsgs,
        {
          role: "assistant",
          content: capturedOllamaText.value || null,
          tool_calls: capturedOllamaTools.map(t => ({
            id: t.id, type: "function",
            function: { name: t.name, arguments: t.rawArgs ?? JSON.stringify(t.input) },
          })),
        },
      ];

      // Execute each web_fetch via the gateway and append results
      for (const call of webFetchCalls) {
        const url = ((call.input.url ?? call.input.uri ?? call.input.link ?? "") as string).trim();
        // web_fetch status already emitted as text chunk at tool_call_end above
        let content: string;
        try {
          const webRes = await fetch(url, {
            signal: AbortSignal.timeout(15_000),
            headers: { "User-Agent": "Mozilla/5.0 (compatible; rcodex-Gateway/1.0)" },
          });
          const text = await webRes.text();
          // Extract title and meta description first - most informative even on JS-heavy sites
          const title = text.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
          const metaDesc = (
            text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
            text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ??
            text.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
            ""
          ).trim();
          const header = [title && `?�목: ${title}`, metaDesc && `?�명: ${metaDesc}`].filter(Boolean).join("\n");
          const body = text
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
            .replace(/\s+/g, " ").trim()
            .slice(0, 12000);
          content = header ? `${header}\n\n${body}` : body;
          if (text.length > 12000) content += "\n...(?�용 ?�림)";
        } catch (e) {
          content = `가?�오�??�패: ${e instanceof Error ? e.message : String(e)}`;
        }
        loopMsgs.push({ role: "tool", tool_call_id: call.id, content });
      }

  if (codexToolCalls.length > 0) break; // Codex tools also called - let Codex handle them
    }

    glog(`[ollama] turn done: tools=${capturedOllamaTools.filter(t => t.name !== "web_fetch").length} text=${capturedOllamaText.value.length}chars isResultTurn=${isToolResultTurn} preview="${capturedOllamaText.value.slice(0, 80).replace(/\n/g, ' ')}"`);

    const currentToolOutputs = (Array.isArray(req.input) ? req.input as unknown as Record<string, unknown>[] : [])
      .filter(item => (item.type as string) === "function_call_output");
    if (capturedOllamaTools.length === 0 && capturedOllamaText.value.trim() === "" && currentToolOutputs.length > 0) {
      // Model returned empty after tool result - synthesize a brief summary from the output.
      const lastOutput = currentToolOutputs[currentToolOutputs.length - 1];
      const parsed = parseCodexToolOutput(lastOutput?.output);
      let fallbackText: string;
      if (!parsed || parsed.includes("결과 ?�음") || parsed.includes("?�당 ?�일/??��??존재?��? ?�습?�다")) {
        fallbackText = parsed || "명령???�행?��?�?결과가 ?�습?�다.";
      } else {
        // Trim long listings - show first 20 lines so it's not a wall of text
        const lines = parsed.split("\n");
        const preview = lines.slice(0, 20).join("\n");
        const more = lines.length > 20 ? `\n... (${lines.length - 20}�???` : "";
        fallbackText = preview + more;
      }
      capturedOllamaText.value += fallbackText;
      yield { type: "text", content: fallbackText };
    }

    if (responseId && capturedOllamaTools.length > 0) {
      // Build OpenAI-format assistant message for next turn
      const assistantMsg = {
        role: "assistant",
        content: capturedOllamaText.value || null,
        tool_calls: capturedOllamaTools.map(t => ({
          id: t.id, type: "function",
          function: { name: t.name, arguments: t.rawArgs ?? JSON.stringify(t.input) },
        })),
      };
      const base: unknown[] = prebuiltMessages ?? (() => {
        const msgs: unknown[] = [];
        if (ollamaSystem) msgs.push({ role: "system", content: ollamaSystem });
        msgs.push(...messages.map(m => ({ role: m.role, content: toOllamaContent(m.content) })));
        return msgs;
      })();
      convStore.set(responseId, {
        provider: "ollama", model,
        messages: [],
        openaiMessages: [...base, assistantMsg],
        toolTurnDepth: currentToolDepth,
        instructions: ollamaSystem, tools: req.tools, ts: Date.now(),
      });
      glog(`[gateway] conv stored (ollama): ${responseId} (${capturedOllamaTools.length} tools, depth=${currentToolDepth})`);
    }
    return;
  }

  if (account.provider === "copilot") {
    const openaiMessages = toOpenAIChatMessages(req.input, messages);
    const tools = buildOpenAIToolsForProvider(req, COMPUTER_USE_TYPES);
    const capturedCopilotTools: { id: string; name: string; input: Record<string, unknown>; rawArgs?: string }[] = [];
    const capturedCopilotText = { value: "" };
    const copilotMessages = sanitizeOpenAIChatHistoryForStrictTools(openaiMessages);
    const res = await callCopilot(account.oauthToken ?? "", model, copilotMessages, copilotInstructions(req, tools), true, signal, tools);
    if (!res.ok) throw new Error(`Copilot error ${res.status}: ${await res.text()}`);
    yield* readOpenAISSEWithUsage(res, usage, capturedCopilotTools, capturedCopilotText);
    if (responseId && capturedCopilotTools.length > 0) {
      convStore.set(responseId, {
        provider: "copilot", model,
        messages: [],
        openaiMessages: [
          ...openaiMessages,
          {
            role: "assistant",
            content: capturedCopilotText.value || null,
            tool_calls: capturedCopilotTools.map(t => ({
              id: t.id,
              type: "function",
              function: { name: t.name, arguments: t.rawArgs ?? JSON.stringify(t.input) },
            })),
          },
        ],
        instructions: copilotInstructions(req, tools), tools: req.tools, ts: Date.now(),
      });
      glog(`[gateway] conv stored (copilot): ${responseId} (${capturedCopilotTools.length} tools)`);
    }
    return;
  }

  if (account.provider === "kiro") {
    const kiroMsgs = toOpenAIChatMessages(req.input, messages) as { role: string; content: string | unknown }[];
    const res = await callKiro(account.apiKey ?? "", model, kiroMsgs, cleanInstructions(instructions), signal, buildOpenAIToolsForProvider(req));
    if (!res.ok) throw new Error(`Kiro error ${res.status}: ${await res.text()}`);
    yield* readKiroEventStream(res, usage);
    return;
  }

  if (account.provider === "vertex") {
    if (isVertexModel(model)) {
      const rawTools = Array.isArray(req.tools) ? (req.tools as Record<string, unknown>[]) : [];
      const vertexTools = rawTools
        .filter(t => { const type = t.type as string | undefined; return !type || (!COMPUTER_USE_TYPES.has(type) && type !== "web_search"); })
        .map(toGoogleTool)
        .filter((t): t is Record<string, unknown> => t !== null);
      const res = await callVertex(account.apiKey ?? "", model, messages, cleanInstructions(instructions), true, signal, vertexTools);
      if (!res.ok) throw new Error(`Vertex error ${res.status}: ${await res.text()}`);
      yield* readGoogleSSEWithUsage(res, usage);
    } else {
      const res = await callVertexPartner(account.apiKey ?? "", model, messages, cleanInstructions(instructions), true, signal);
      if (!res.ok) throw new Error(`Vertex Partner error ${res.status}: ${await res.text()}`);
      yield* readOpenAISSEWithUsage(res, usage);
    }
    return;
  }

  if (account.provider === "opencode") {
    const res = await callOpenCode(model, messages, cleanInstructions(instructions), true, signal);
    if (!res.ok) throw new Error(`OpenCode error ${res.status}: ${await res.text()}`);
    if (model === "big-pickle") {
      yield* readAnthropicSSEWithUsage(res, usage);
    } else {
      yield* readOpenAISSEWithUsage(res, usage);
    }
    return;
  }

  if (isFreetierProvider(account.provider)) {
    const res = await callFreetier(account.provider, account.apiKey ?? "", model, messages, cleanInstructions(instructions), true, signal);
    if (!res.ok) throw new Error(`Free-tier provider ${account.provider} error ${res.status}: ${await res.text()}`);
    const providerDef = FREETIER_PROVIDERS.find(p => p.id === account.provider);
    if (providerDef?.format === "claude") {
      yield* readAnthropicSSEWithUsage(res, usage);
    } else {
      yield* readOpenAISSEWithUsage(res, usage);
    }
    return;
  }

  // OpenAI
  account = await ensureFreshToken(account);
  if (account.method === "oauth-official") {
    if (!account.oauthToken) throw new Error("OpenAI OAuth token missing");
    const res = await callCodexAPI(account.oauthToken, buildCodexBody(req, model), signal);
    if (!res.ok) throw new Error(`Codex error ${res.status}: ${await res.text()}`);
    yield* readCodexSSEWithUsage(res, usage);
    return;
  }
  if (account.method === "oauth-unofficial") {
    const result = await callSingleProvider(account, model, req, config, signal);
    const text = result.output[0]?.content[0]?.text ?? "";
    if (text) yield { type: 'text', content: text };
    return;
  }
  const auth = accountToProviderAuth(account);
  const res = await callOpenAI(auth, model, messages, instructions, true, signal);
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  yield* readOpenAISSEWithUsage(res, usage);
}

  // --- Streaming proxy with fallback ---
export async function* streamProxyRequest(
  req: ResponsesRequest,
  config: GatewayConfig,
  signal?: AbortSignal,
  responseId?: string
): AsyncGenerator<StreamChunk> {
  const candidates = resolveAccounts(req.model, config);
  if (!candidates.length) throw new Error("No provider connected to output");

  const order = candidates.map((c, i) => `${i + 1}.${c.account.provider}(${c.model})`).join(" -> ");
  glog(`[gateway] stream routing order: ${order}`);

  const t0 = Date.now();
  let lastError: Error | null = null;
  const failedModels: string[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const { account, model } = candidates[i];
    let yielded = false;
    let entry: RequestLogEntry | null = null;
    const usage: { inputTokens?: number; outputTokens?: number } = {};
    try {
      for await (const chunk of streamSingleProvider(account, model, req, config, signal, usage, responseId)) {
        if (!yielded) {
          if (i > 0) gwarn(`[gateway] stream fallback: ${account.provider}(${model})`);
          else glog(`[gateway] stream ${account.provider}(${model})`);
          entry = pushLog({ ts: Date.now(), requestedModel: req.model, provider: account.provider, usedModel: model, fallback: i > 0, failedModels: failedModels.length ? [...failedModels] : undefined, ms: Date.now() - t0, status: "ok" });
          yielded = true;
        }
        yield chunk;
      }
      // Update entry with usage + final latency, then persist
      if (entry) {
        entry.ms = Date.now() - t0;
        if (usage.inputTokens) entry.inputTokens = usage.inputTokens;
        if (usage.outputTokens) entry.outputTokens = usage.outputTokens;
      }
      flushLog();
      return;
    } catch (err) {
      if (yielded) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      failedModels.push(model);
      gerr(`[gateway] stream ${account.provider}(${model}) failed: ${lastError.message}${i < candidates.length - 1 ? " -> trying next" : ""}`);
    }
  }
  const lastCand = candidates[candidates.length - 1];
  pushLog({ ts: Date.now(), requestedModel: req.model, provider: lastCand?.account.provider ?? "", usedModel: "", fallback: false, failedModels: failedModels.length ? [...failedModels] : undefined, ms: Date.now() - t0, status: "error", error: lastError?.message });
  flushLog();
  throw lastError ?? new Error("All providers failed");
}

  // --- Non-streaming proxy with fallback ---
export async function proxyRequest(
  req: ResponsesRequest,
  config: GatewayConfig,
  signal?: AbortSignal
): Promise<ResponsesResponse> {
  const candidates = resolveAccounts(req.model, config);
  if (!candidates.length) throw new Error("No provider connected to output");

  const order = candidates.map((c, i) => `${i + 1}.${c.account.provider}(${c.model})`).join(" -> ");
  glog(`[gateway] routing order: ${order}`);

  const t0 = Date.now();
  let lastError: Error | null = null;
  const failedModels: string[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const { account, model } = candidates[i];
    try {
      const result = await callSingleProvider(account, model, req, config, signal);
      if (i > 0) gwarn(`[gateway] fallback used: ${account.provider}(${model}) (primary failed)`);
      else glog(`[gateway] ${account.provider}(${model})`);
      pushLog({ ts: Date.now(), requestedModel: req.model, provider: account.provider, usedModel: model, fallback: i > 0, failedModels: failedModels.length ? [...failedModels] : undefined, ms: Date.now() - t0, status: "ok", inputTokens: result.usage?.input_tokens, outputTokens: result.usage?.output_tokens });
      flushLog();
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      failedModels.push(model);
      gerr(`[gateway] ${account.provider}(${model}) failed: ${lastError.message}${i < candidates.length - 1 ? " -> trying next" : ""}`);
    }
  }
  const lastCandNS = candidates[candidates.length - 1];
  pushLog({ ts: Date.now(), requestedModel: req.model, provider: lastCandNS?.account.provider ?? "", usedModel: "", fallback: false, failedModels: failedModels.length ? [...failedModels] : undefined, ms: Date.now() - t0, status: "error", error: lastError?.message });
  flushLog();
  throw lastError ?? new Error("All providers failed");
}
