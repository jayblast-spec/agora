import type { Proposal, Resolution, Vote, Veto } from "../../core/types.js";

/**
 * Agora messages carried as MCP tool calls (for propose/vote/veto, which are
 * requests expecting a response) and MCP notifications (for resolution
 * broadcasts, which are fire-and-forget). Shapes follow MCP's JSON-RPC 2.0
 * `tools/call` request/result and notification structures. As with the A2A
 * adapter, this has no dependency on the MCP SDK — it produces and consumes
 * plain JSON-RPC-shaped objects.
 */
export interface MCPToolCallRequest {
  jsonrpc: "2.0";
  id: string;
  method: "tools/call";
  params: { name: `agora.${"propose" | "vote" | "veto"}`; arguments: Record<string, unknown> };
}

export interface MCPToolCallResult {
  jsonrpc: "2.0";
  id: string;
  result: { content: Array<{ type: "text"; text: string }>; structuredContent: Record<string, unknown> };
}

export interface MCPNotification {
  jsonrpc: "2.0";
  method: "notifications/agora/resolution";
  params: { roundId: string; resolution: Record<string, unknown> };
}

let requestCounter = 0;
function nextRequestId(): string {
  requestCounter += 1;
  return `agora-req-${Date.now()}-${requestCounter}`;
}

export function encodeProposalCall(proposal: Proposal): MCPToolCallRequest {
  return {
    jsonrpc: "2.0",
    id: nextRequestId(),
    method: "tools/call",
    params: { name: "agora.propose", arguments: proposal as unknown as Record<string, unknown> },
  };
}

export function encodeVoteCall(roundId: string, vote: Vote): MCPToolCallRequest {
  return {
    jsonrpc: "2.0",
    id: nextRequestId(),
    method: "tools/call",
    params: { name: "agora.vote", arguments: { roundId, ...vote } },
  };
}

export function encodeVetoCall(roundId: string, veto: Veto): MCPToolCallRequest {
  return {
    jsonrpc: "2.0",
    id: nextRequestId(),
    method: "tools/call",
    params: { name: "agora.veto", arguments: { roundId, ...veto } },
  };
}

export function encodeResolutionNotification(roundId: string, resolution: Resolution): MCPNotification {
  return {
    jsonrpc: "2.0",
    method: "notifications/agora/resolution",
    params: { roundId, resolution: resolution as unknown as Record<string, unknown> },
  };
}

export function decodeProposalCall(request: MCPToolCallRequest): Proposal {
  if (request.params.name !== "agora.propose") throw new Error(`expected agora.propose, got ${request.params.name}`);
  return request.params.arguments as unknown as Proposal;
}

export function decodeVoteCall(request: MCPToolCallRequest): { roundId: string; vote: Vote } {
  if (request.params.name !== "agora.vote") throw new Error(`expected agora.vote, got ${request.params.name}`);
  const { roundId, ...vote } = request.params.arguments as unknown as { roundId: string } & Vote;
  return { roundId, vote };
}

export function decodeVetoCall(request: MCPToolCallRequest): { roundId: string; veto: Veto } {
  if (request.params.name !== "agora.veto") throw new Error(`expected agora.veto, got ${request.params.name}`);
  const { roundId, ...veto } = request.params.arguments as unknown as { roundId: string } & Veto;
  return { roundId, veto };
}

export function decodeResolutionNotification(notification: MCPNotification): { roundId: string; resolution: Resolution } {
  return { roundId: notification.params.roundId, resolution: notification.params.resolution as unknown as Resolution };
}

export function encodeToolResult(requestId: string, resolution: Resolution | { acknowledged: true }): MCPToolCallResult {
  return {
    jsonrpc: "2.0",
    id: requestId,
    result: {
      content: [{ type: "text", text: JSON.stringify(resolution) }],
      structuredContent: resolution as unknown as Record<string, unknown>,
    },
  };
}
