export interface RealtimeEvent extends Record<string, unknown> {
  type: string;
  event_id?: string;
  timestamp?: string;
}

export interface TokenResponse extends Record<string, unknown> {
  value?: string;
}

export interface ToolCallOutput extends Record<string, unknown> {
  type: "function_call";
  name: string;
  arguments: string;
}

export interface ParsedToolArguments {
  theme: string;
  colors: string[];
}

export type ChatRole = "assistant" | "user" | "unknown";
export type ChatStatus = "streaming" | "final";

export interface TranscriptCandidate {
  itemId: string;
  role: ChatRole;
  text: string;
  sourceType: string;
  timestamp?: string;
  isFinal: boolean;
  priority: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt?: string;
  updatedAt?: string;
  status: ChatStatus;
  sourceType: string;
}

export interface SessionState {
  isSessionActive: boolean;
  isActivating: boolean;
  events: RealtimeEvent[];
  dataChannel: RTCDataChannel | null;
  peerConnection: RTCPeerConnection | null;
  functionAdded: boolean;
  functionCallOutput: ToolCallOutput | null;
  errorMessage: string | null;
}
