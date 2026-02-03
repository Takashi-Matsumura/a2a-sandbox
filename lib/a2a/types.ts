/**
 * A2A Protocol Type Definitions
 * Based on Google A2A (Agent-to-Agent) Protocol Specification
 */

// ============================================
// JSON-RPC 2.0 Types
// ============================================

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// Standard JSON-RPC error codes
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // A2A specific error codes
  TASK_NOT_FOUND: -32000,
  TASK_NOT_CANCELABLE: -32001,
  PUSH_NOTIFICATION_NOT_SUPPORTED: -32002,
  UNSUPPORTED_OPERATION: -32003,
} as const;

// ============================================
// Agent Card Types
// ============================================

export interface AgentCard {
  name: string;
  description?: string;
  url: string;
  provider?: AgentProvider;
  version?: string;
  documentationUrl?: string;
  capabilities: AgentCapabilities;
  authentication?: AgentAuthentication;
  defaultInputModes?: InputMode[];
  defaultOutputModes?: OutputMode[];
  skills: AgentSkill[];
  protocolVersions?: string[];
}

export interface AgentProvider {
  organization: string;
  url?: string;
}

export interface AgentCapabilities {
  streaming: boolean;
  pushNotifications: boolean;
  stateTransitionHistory?: boolean;
}

export interface AgentAuthentication {
  schemes: string[];
  credentials?: string;
}

export type InputMode = 'text' | 'file' | 'data';
export type OutputMode = 'text' | 'file' | 'data';

export interface AgentSkill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  examples?: string[];
  inputModes?: InputMode[];
  outputModes?: OutputMode[];
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
}

export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
  description?: string;
  [key: string]: unknown;
}

// ============================================
// Task Types
// ============================================

export type TaskState =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'completed'
  | 'failed'
  | 'canceled';

export interface Task {
  id: string;
  contextId?: string;
  status: TaskStatus;
  history?: Message[];
  artifacts?: Artifact[];
  metadata?: Record<string, unknown>;
}

export interface TaskStatus {
  state: TaskState;
  message?: Message;
  timestamp?: string;
}

export interface TaskStatusUpdateEvent {
  taskId: string;
  contextId?: string;
  status: TaskStatus;
  final: boolean;
}

export interface TaskArtifactUpdateEvent {
  taskId: string;
  contextId?: string;
  artifact: Artifact;
}

// ============================================
// Message Types
// ============================================

export type MessageRole = 'user' | 'agent';

export interface Message {
  role: MessageRole;
  parts: Part[];
  metadata?: Record<string, unknown>;
}

export type Part = TextPart | FilePart | DataPart;

export interface TextPart {
  type: 'text';
  text: string;
}

export interface FilePart {
  type: 'file';
  file: FileContent;
}

export interface FileContent {
  name?: string;
  mimeType: string;
  bytes?: string; // base64 encoded
  uri?: string;
}

export interface DataPart {
  type: 'data';
  data: Record<string, unknown>;
}

// ============================================
// Artifact Types
// ============================================

export interface Artifact {
  id?: string;
  name?: string;
  description?: string;
  mimeType: string;
  parts: ArtifactPart[];
  index?: number;
  append?: boolean;
  lastChunk?: boolean;
  metadata?: Record<string, unknown>;
}

export type ArtifactPart = TextPart | FilePart | DataPart;

// ============================================
// A2A Method Request/Response Types
// ============================================

// tasks/send
export interface TaskSendParams {
  id?: string;
  contextId?: string;
  message: Message;
  pushNotification?: PushNotificationConfig;
  historyLength?: number;
  metadata?: Record<string, unknown>;
}

export interface PushNotificationConfig {
  url: string;
  token?: string;
}

// tasks/get
export interface TaskGetParams {
  id: string;
  historyLength?: number;
}

// tasks/cancel
export interface TaskCancelParams {
  id: string;
}

// tasks/sendSubscribe (streaming)
export interface TaskSendSubscribeParams extends TaskSendParams {
  // Same as TaskSendParams, but returns SSE stream
}

// tasks/resubscribe (streaming)
export interface TaskResubscribeParams {
  id: string;
}

// ============================================
// Push Notification Types
// ============================================

export interface PushNotificationConfigGetParams {
  id: string;
}

export interface PushNotificationConfigSetParams {
  id: string;
  pushNotificationConfig: PushNotificationConfig;
}

// ============================================
// Agent Executor Interface
// ============================================

export interface AgentExecutor {
  execute(
    task: Task,
    message: Message,
    context: ExecutionContext
  ): Promise<AgentResponse>;
}

export interface ExecutionContext {
  taskId: string;
  contextId?: string;
  history: Message[];
  metadata?: Record<string, unknown>;
}

export interface AgentResponse {
  status: TaskStatus;
  artifacts?: Artifact[];
}

export type AgentEvent =
  | { type: 'status'; data: TaskStatusUpdateEvent }
  | { type: 'artifact'; data: TaskArtifactUpdateEvent };

// ============================================
// Task Store Interface
// ============================================

export interface TaskStore {
  createTask(params: { id?: string; contextId?: string; metadata?: Record<string, unknown> }): Promise<Task>;
  getTask(id: string): Promise<Task | null>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  addMessage(taskId: string, message: Message): Promise<void>;
  addArtifact(taskId: string, artifact: Artifact): Promise<void>;
  getMessages(taskId: string, limit?: number): Promise<Message[]>;
  getArtifacts(taskId: string): Promise<Artifact[]>;
}

// ============================================
// Utility Types
// ============================================

export interface TimeSlot {
  startTime: string; // ISO 8601 or HH:mm format
  endTime: string;
}

export interface AvailabilitySlot extends TimeSlot {
  status: 'available' | 'busy' | 'tentative';
}

export interface MeetingRequest {
  title?: string;
  duration: number; // minutes
  preferredDate: string; // ISO 8601 date
  participants: string[];
  timeRange?: TimeSlot;
}

export interface MeetingProposal {
  proposedSlots: TimeSlot[];
  unavailableParticipants?: string[];
  notes?: string;
}
