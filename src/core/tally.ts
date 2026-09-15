import type { Proposal, QuorumRule, Tally, Vote } from "./types.js";

export function computeTally(proposal: Proposal, votes: Record<string, Vote>): Tally {
  let yesWeight = 0;
  let noWeight = 0;
  let abstainWeight = 0;
  let votesCast = 0;

  for (const agentId of proposal.voters) {
    const vote = votes[agentId];
    if (!vote) continue;
    const weight = proposal.weights[agentId] ?? 1;
    votesCast += 1;
    if (vote.choice === "yes") yesWeight += weight;
    else if (vote.choice === "no") noWeight += weight;
    else abstainWeight += weight;
  }

  return {
    yesWeight,
    noWeight,
    abstainWeight,
    votesCast,
    votersRegistered: proposal.voters.length,
  };
}

export function quorumMet(quorum: QuorumRule, tally: Tally): boolean {
  if (quorum.type === "count") {
    return tally.votesCast >= quorum.value;
  }
  return tally.votesCast >= quorum.value * tally.votersRegistered;
}

/** Ties resolve to "rejected" — an evenly split round shouldn't change the status quo. */
export function majorityApproved(tally: Tally): boolean {
  return tally.yesWeight > tally.noWeight;
}

export function validateQuorumReachable(quorum: QuorumRule, voterCount: number): string | null {
  if (voterCount === 0) return "a proposal must register at least one voter";
  if (quorum.type === "count") {
    if (!Number.isInteger(quorum.value) || quorum.value < 1) {
      return "count quorum must be a positive integer";
    }
    if (quorum.value > voterCount) {
      return `count quorum (${quorum.value}) exceeds registered voter count (${voterCount})`;
    }
  } else {
    if (quorum.value <= 0 || quorum.value > 1) {
      return "fraction quorum must be in (0, 1]";
    }
  }
  return null;
}
