import { describe, expect, it } from "vitest";
import { Round } from "../src/core/round.js";
import * as a2a from "../src/adapters/a2a/index.js";
import * as mcp from "../src/adapters/mcp/index.js";

const BASE_TIME = 1_700_000_000_000;

function twoVoterRound() {
  return Round.propose({
    id: "round-adapter",
    proposerId: "agent-a",
    action: { type: "restart-service", name: "billing" },
    voters: ["agent-a", "agent-b"],
    quorum: { type: "count", value: 2 },
    createdAt: BASE_TIME,
  });
}

describe("A2A adapter round-trip", () => {
  it("carries a full propose -> vote -> resolution cycle through A2A message envelopes", () => {
    const round = twoVoterRound();
    const proposal = round.getProposal();

    const proposeMsg = a2a.encodeProposal(proposal);
    expect(proposeMsg.metadata.agoraType).toBe("propose");
    const decodedProposal = a2a.decodeProposal(proposeMsg);
    expect(decodedProposal.id).toBe(proposal.id);

    const voteMsgA = a2a.encodeVote(proposal.id, { agentId: "agent-a", choice: "yes", castAt: BASE_TIME });
    const voteMsgB = a2a.encodeVote(proposal.id, { agentId: "agent-b", choice: "yes", castAt: BASE_TIME });
    round.castVote(a2a.decodeVote(voteMsgA), BASE_TIME);
    round.castVote(a2a.decodeVote(voteMsgB), BASE_TIME);

    const resolution = round.evaluate(BASE_TIME);
    expect(resolution?.outcome).toBe("approved");

    const resolutionMsg = a2a.encodeResolution(proposal.id, resolution!);
    const decodedResolution = a2a.decodeResolution(resolutionMsg);
    expect(decodedResolution).toEqual(resolution);
  });

  it("rejects decoding a message of the wrong agoraType", () => {
    const round = twoVoterRound();
    const voteMsg = a2a.encodeVote(round.getProposal().id, { agentId: "agent-a", choice: "yes", castAt: BASE_TIME });
    expect(() => a2a.decodeProposal(voteMsg)).toThrow();
  });
});

describe("MCP adapter round-trip", () => {
  it("carries a full propose -> vote -> veto cycle through MCP tool-call requests", () => {
    const round = twoVoterRound();
    const proposal = round.getProposal();

    const proposeCall = mcp.encodeProposalCall(proposal);
    expect(proposeCall.params.name).toBe("agora.propose");
    expect(mcp.decodeProposalCall(proposeCall).id).toBe(proposal.id);

    const voteCall = mcp.encodeVoteCall(proposal.id, { agentId: "agent-a", choice: "yes", castAt: BASE_TIME });
    const decodedVote = mcp.decodeVoteCall(voteCall);
    expect(decodedVote.roundId).toBe(proposal.id);
    round.castVote(decodedVote.vote, BASE_TIME);

    const vetoCall = mcp.encodeVetoCall(proposal.id, {
      agentId: "agent-b",
      reason: "insufficient rollback plan",
      castAt: BASE_TIME,
    });
    // agent-b is not a registered vetoer on this round by default -- adapter
    // decoding still succeeds, the core state machine is what enforces policy.
    const decodedVeto = mcp.decodeVetoCall(vetoCall);
    expect(decodedVeto.veto.reason).toBe("insufficient rollback plan");

    const toolResult = mcp.encodeToolResult(voteCall.id, { acknowledged: true });
    expect(toolResult.id).toBe(voteCall.id);
  });

  it("round-trips a resolution notification", () => {
    const round = twoVoterRound();
    round.castVote({ agentId: "agent-a", choice: "yes" }, BASE_TIME);
    round.castVote({ agentId: "agent-b", choice: "yes" }, BASE_TIME);
    const resolution = round.evaluate(BASE_TIME)!;

    const notification = mcp.encodeResolutionNotification(round.getProposal().id, resolution);
    const decoded = mcp.decodeResolutionNotification(notification);
    expect(decoded.roundId).toBe(round.getProposal().id);
    expect(decoded.resolution).toEqual(resolution);
  });
});
