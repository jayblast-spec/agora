import { computeTally, majorityApproved, quorumMet, validateQuorumReachable } from "./tally.js";
import {
  AgentId,
  InvalidProposalError,
  NotAVetoerError,
  NotAVoterError,
  Proposal,
  ProposalInput,
  Resolution,
  RoundAlreadyResolvedError,
  RoundState,
  Vote,
  Veto,
} from "./types.js";

function normalizeProposal(input: ProposalInput): Proposal {
  if (!input.id) throw new InvalidProposalError("proposal id is required");
  if (!input.voters?.length) {
    throw new InvalidProposalError("a proposal must register at least one voter");
  }
  const reachability = validateQuorumReachable(input.quorum, input.voters.length);
  if (reachability) throw new InvalidProposalError(reachability);

  return {
    id: input.id,
    proposerId: input.proposerId,
    action: input.action,
    voters: [...input.voters],
    quorum: input.quorum,
    vetoers: input.vetoers ? [...input.vetoers] : [],
    weights: { ...input.weights },
    timeoutMs: input.timeoutMs,
    createdAt: input.createdAt ?? Date.now(),
  };
}

/**
 * A single propose -> vote/veto -> resolve decision round.
 *
 * `evaluate()` is the only method that produces a Resolution, and it is
 * idempotent: once resolved, a Round always returns the same Resolution
 * regardless of how many more votes or evaluate() calls arrive. This keeps
 * "what actually happened" unambiguous for anyone auditing the round later.
 */
export class Round {
  private readonly proposal: Proposal;
  private votes: Record<AgentId, Vote>;
  private veto: Veto | null;
  private resolution: Resolution | null;

  private constructor(proposal: Proposal, votes: Record<AgentId, Vote>, veto: Veto | null, resolution: Resolution | null) {
    this.proposal = proposal;
    this.votes = votes;
    this.veto = veto;
    this.resolution = resolution;
  }

  static propose(input: ProposalInput): Round {
    return new Round(normalizeProposal(input), {}, null, null);
  }

  static fromState(state: RoundState): Round {
    return new Round(state.proposal, { ...state.votes }, state.veto, state.resolution);
  }

  toState(): RoundState {
    return {
      proposal: this.proposal,
      votes: { ...this.votes },
      veto: this.veto,
      status: this.resolution ? "resolved" : "pending",
      resolution: this.resolution,
    };
  }

  getProposal(): Readonly<Proposal> {
    return this.proposal;
  }

  getResolution(): Resolution | null {
    return this.resolution;
  }

  getTally() {
    return computeTally(this.proposal, this.votes);
  }

  castVote(vote: { agentId: AgentId; choice: Vote["choice"]; reason?: string }, now = Date.now()): void {
    if (this.resolution) throw new RoundAlreadyResolvedError(`round ${this.proposal.id} is already resolved`);
    if (!this.proposal.voters.includes(vote.agentId)) {
      throw new NotAVoterError(`${vote.agentId} is not a registered voter for round ${this.proposal.id}`);
    }
    // Last-write-wins: an agent may change its vote until the round resolves.
    this.votes[vote.agentId] = { ...vote, castAt: now };
  }

  castVeto(veto: { agentId: AgentId; reason: string }, now = Date.now()): void {
    if (this.resolution) throw new RoundAlreadyResolvedError(`round ${this.proposal.id} is already resolved`);
    if (!this.proposal.vetoers.includes(veto.agentId)) {
      throw new NotAVetoerError(`${veto.agentId} is not a registered vetoer for round ${this.proposal.id}`);
    }
    this.veto = { ...veto, castAt: now };
  }

  /**
   * Checks veto, timeout, and quorum in that order and resolves the round if
   * any applies. Returns null while the round is still pending. Safe to call
   * after every vote and/or on a timer — it is a no-op once resolved.
   */
  evaluate(now = Date.now()): Resolution | null {
    if (this.resolution) return this.resolution;

    if (this.veto) {
      this.resolution = { outcome: "vetoed", veto: this.veto, resolvedAt: now };
      return this.resolution;
    }

    const tally = this.getTally();
    const timedOut = this.proposal.timeoutMs !== undefined && now - this.proposal.createdAt >= this.proposal.timeoutMs;

    if (!quorumMet(this.proposal.quorum, tally)) {
      if (timedOut) {
        this.resolution = { outcome: "timed-out", tally, resolvedAt: now };
        return this.resolution;
      }
      return null;
    }

    this.resolution = majorityApproved(tally)
      ? { outcome: "approved", tally, resolvedAt: now }
      : { outcome: "rejected", tally, resolvedAt: now };
    return this.resolution;
  }
}
