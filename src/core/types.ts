export type AgentId = string;

export type VoteChoice = "yes" | "no" | "abstain";

export interface Vote {
  agentId: AgentId;
  choice: VoteChoice;
  reason?: string;
  castAt: number;
}

export interface Veto {
  agentId: AgentId;
  reason: string;
  castAt: number;
}

/**
 * `fraction` is evaluated against the registered voter count, not votes cast,
 * so a round can never satisfy quorum by attrition (e.g. two abstaining
 * voters can't shrink a 2/3-of-3 requirement down to 2/3-of-1).
 */
export type QuorumRule =
  | { type: "fraction"; value: number }
  | { type: "count"; value: number };

export interface ProposalInput {
  id: string;
  proposerId: AgentId;
  action: unknown;
  voters: AgentId[];
  quorum: QuorumRule;
  vetoers?: AgentId[];
  weights?: Record<AgentId, number>;
  timeoutMs?: number;
  createdAt?: number;
}

export interface Proposal {
  id: string;
  proposerId: AgentId;
  action: unknown;
  voters: AgentId[];
  quorum: QuorumRule;
  vetoers: AgentId[];
  weights: Record<AgentId, number>;
  timeoutMs?: number;
  createdAt: number;
}

export interface Tally {
  yesWeight: number;
  noWeight: number;
  abstainWeight: number;
  votesCast: number;
  votersRegistered: number;
}

export type Resolution =
  | { outcome: "approved"; tally: Tally; resolvedAt: number }
  | { outcome: "rejected"; tally: Tally; resolvedAt: number }
  | { outcome: "vetoed"; veto: Veto; resolvedAt: number }
  | { outcome: "quorum-failed"; tally: Tally; resolvedAt: number }
  | { outcome: "timed-out"; tally: Tally; resolvedAt: number };

export type RoundStatus = "pending" | "resolved";

export interface RoundState {
  proposal: Proposal;
  votes: Record<AgentId, Vote>;
  veto: Veto | null;
  status: RoundStatus;
  resolution: Resolution | null;
}

export class AgoraError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidProposalError extends AgoraError {}
export class NotAVoterError extends AgoraError {}
export class NotAVetoerError extends AgoraError {}
export class RoundAlreadyResolvedError extends AgoraError {}
