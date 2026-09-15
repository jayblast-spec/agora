import type { Proposal, Resolution, Vote, Veto } from "../../core/types.js";

/**
 * Minimal shape of an A2A (Agent2Agent) Message, matching the public A2A
 * spec's Message/Part structure closely enough to round-trip through a real
 * A2A transport. This package does not depend on any A2A SDK — it only
 * produces and consumes plain objects shaped like the wire format, so it
 * works whichever A2A client library the host application already uses.
 */
export interface A2AMessage {
  role: "agent";
  messageId: string;
  contextId: string;
  parts: Array<{ kind: "data"; data: Record<string, unknown> }>;
  metadata: { agoraType: "propose" | "vote" | "veto" | "resolution" };
}

let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `agora-msg-${Date.now()}-${messageCounter}`;
}

export function encodeProposal(proposal: Proposal): A2AMessage {
  return {
    role: "agent",
    messageId: nextMessageId(),
    contextId: proposal.id,
    parts: [{ kind: "data", data: proposal as unknown as Record<string, unknown> }],
    metadata: { agoraType: "propose" },
  };
}

export function encodeVote(roundId: string, vote: Vote): A2AMessage {
  return {
    role: "agent",
    messageId: nextMessageId(),
    contextId: roundId,
    parts: [{ kind: "data", data: vote as unknown as Record<string, unknown> }],
    metadata: { agoraType: "vote" },
  };
}

export function encodeVeto(roundId: string, veto: Veto): A2AMessage {
  return {
    role: "agent",
    messageId: nextMessageId(),
    contextId: roundId,
    parts: [{ kind: "data", data: veto as unknown as Record<string, unknown> }],
    metadata: { agoraType: "veto" },
  };
}

export function encodeResolution(roundId: string, resolution: Resolution): A2AMessage {
  return {
    role: "agent",
    messageId: nextMessageId(),
    contextId: roundId,
    parts: [{ kind: "data", data: resolution as unknown as Record<string, unknown> }],
    metadata: { agoraType: "resolution" },
  };
}

function firstDataPart(message: A2AMessage): Record<string, unknown> {
  const part = message.parts.find((p) => p.kind === "data");
  if (!part) throw new Error("A2A message has no data part to decode");
  return part.data;
}

export function decodeProposal(message: A2AMessage): Proposal {
  if (message.metadata.agoraType !== "propose") throw new Error(`expected propose message, got ${message.metadata.agoraType}`);
  return firstDataPart(message) as unknown as Proposal;
}

export function decodeVote(message: A2AMessage): Vote {
  if (message.metadata.agoraType !== "vote") throw new Error(`expected vote message, got ${message.metadata.agoraType}`);
  return firstDataPart(message) as unknown as Vote;
}

export function decodeVeto(message: A2AMessage): Veto {
  if (message.metadata.agoraType !== "veto") throw new Error(`expected veto message, got ${message.metadata.agoraType}`);
  return firstDataPart(message) as unknown as Veto;
}

export function decodeResolution(message: A2AMessage): Resolution {
  if (message.metadata.agoraType !== "resolution") throw new Error(`expected resolution message, got ${message.metadata.agoraType}`);
  return firstDataPart(message) as unknown as Resolution;
}
