import { describe, expect, it } from "vitest";
import { Round } from "../src/core/round.js";
import {
  InvalidProposalError,
  NotAVetoerError,
  NotAVoterError,
  RoundAlreadyResolvedError,
} from "../src/core/types.js";

const BASE_TIME = 1_700_000_000_000;

function propose(overrides: Partial<Parameters<typeof Round.propose>[0]> = {}) {
  return Round.propose({
    id: "round-1",
    proposerId: "agent-a",
    action: { type: "deploy", target: "prod" },
    voters: ["agent-a", "agent-b", "agent-c"],
    quorum: { type: "count", value: 2 },
    createdAt: BASE_TIME,
    ...overrides,
  });
}

describe("Round construction", () => {
  it("rejects an empty voter list", () => {
    expect(() =>
      Round.propose({ id: "r", proposerId: "a", action: null, voters: [], quorum: { type: "count", value: 1 } })
    ).toThrow(InvalidProposalError);
  });

  it("rejects a count quorum higher than the registered voter count", () => {
    expect(() =>
      Round.propose({
        id: "r",
        proposerId: "a",
        action: null,
        voters: ["a", "b"],
        quorum: { type: "count", value: 3 },
      })
    ).toThrow(InvalidProposalError);
  });

  it("rejects a fraction quorum outside (0, 1]", () => {
    expect(() =>
      Round.propose({
        id: "r",
        proposerId: "a",
        action: null,
        voters: ["a"],
        quorum: { type: "fraction", value: 0 },
      })
    ).toThrow(InvalidProposalError);
    expect(() =>
      Round.propose({
        id: "r",
        proposerId: "a",
        action: null,
        voters: ["a"],
        quorum: { type: "fraction", value: 1.5 },
      })
    ).toThrow(InvalidProposalError);
  });
});

describe("voting and quorum", () => {
  it("stays pending until quorum is met", () => {
    const round = propose();
    expect(round.evaluate(BASE_TIME)).toBeNull();
    round.castVote({ agentId: "agent-a", choice: "yes" }, BASE_TIME);
    expect(round.evaluate(BASE_TIME)).toBeNull();
  });

  it("approves once quorum is met and yes outweighs no", () => {
    const round = propose();
    round.castVote({ agentId: "agent-a", choice: "yes" }, BASE_TIME);
    round.castVote({ agentId: "agent-b", choice: "yes" }, BASE_TIME);
    const resolution = round.evaluate(BASE_TIME);
    expect(resolution?.outcome).toBe("approved");
  });

  it("rejects once quorum is met and no outweighs yes", () => {
    const round = propose();
    round.castVote({ agentId: "agent-a", choice: "no" }, BASE_TIME);
    round.castVote({ agentId: "agent-b", choice: "no" }, BASE_TIME);
    const resolution = round.evaluate(BASE_TIME);
    expect(resolution?.outcome).toBe("rejected");
  });

  it("resolves an exact tie as rejected", () => {
    const round = propose({ quorum: { type: "count", value: 2 } });
    round.castVote({ agentId: "agent-a", choice: "yes" }, BASE_TIME);
    round.castVote({ agentId: "agent-b", choice: "no" }, BASE_TIME);
    expect(round.evaluate(BASE_TIME)?.outcome).toBe("rejected");
  });

  it("counts abstentions toward quorum but not toward the yes/no tally", () => {
    const round = propose();
    round.castVote({ agentId: "agent-a", choice: "yes" }, BASE_TIME);
    round.castVote({ agentId: "agent-b", choice: "abstain" }, BASE_TIME);
    const resolution = round.evaluate(BASE_TIME);
    expect(resolution?.outcome).toBe("approved");
    if (resolution?.outcome === "approved") {
      expect(resolution.tally.abstainWeight).toBe(1);
      expect(resolution.tally.noWeight).toBe(0);
    }
  });

  it("evaluates a fraction quorum against registered voters, not votes cast", () => {
    const round = propose({ voters: ["a", "b", "c"], quorum: { type: "fraction", value: 2 / 3 } });
    round.castVote({ agentId: "a", choice: "yes" }, BASE_TIME);
    expect(round.evaluate(BASE_TIME)).toBeNull();
    round.castVote({ agentId: "b", choice: "yes" }, BASE_TIME);
    expect(round.evaluate(BASE_TIME)?.outcome).toBe("approved");
  });

  it("last-write-wins on duplicate votes from the same agent", () => {
    const round = propose({ quorum: { type: "count", value: 2 } });
    round.castVote({ agentId: "agent-a", choice: "yes" }, BASE_TIME);
    round.castVote({ agentId: "agent-a", choice: "no" }, BASE_TIME);
    round.castVote({ agentId: "agent-b", choice: "no" }, BASE_TIME);
    expect(round.evaluate(BASE_TIME)?.outcome).toBe("rejected");
  });

  it("rejects a vote from a non-registered agent", () => {
    const round = propose();
    expect(() => round.castVote({ agentId: "stranger", choice: "yes" }, BASE_TIME)).toThrow(NotAVoterError);
  });

  it("throws once a resolved round receives another vote", () => {
    const round = propose({ quorum: { type: "count", value: 1 } });
    round.castVote({ agentId: "agent-a", choice: "yes" }, BASE_TIME);
    round.evaluate(BASE_TIME);
    expect(() => round.castVote({ agentId: "agent-b", choice: "yes" }, BASE_TIME)).toThrow(RoundAlreadyResolvedError);
  });
});

describe("weighted voting", () => {
  it("lets a higher-weight voter outweigh two unit-weight voters", () => {
    const round = propose({
      voters: ["heavy", "a", "b"],
      quorum: { type: "count", value: 3 },
      weights: { heavy: 5, a: 1, b: 1 },
    });
    round.castVote({ agentId: "heavy", choice: "yes" }, BASE_TIME);
    round.castVote({ agentId: "a", choice: "no" }, BASE_TIME);
    round.castVote({ agentId: "b", choice: "no" }, BASE_TIME);
    expect(round.evaluate(BASE_TIME)?.outcome).toBe("approved");
  });
});

describe("veto", () => {
  it("short-circuits an otherwise-approving tally", () => {
    const round = propose({ vetoers: ["agent-c"] });
    round.castVote({ agentId: "agent-a", choice: "yes" }, BASE_TIME);
    round.castVote({ agentId: "agent-b", choice: "yes" }, BASE_TIME);
    round.castVeto({ agentId: "agent-c", reason: "violates safety policy" }, BASE_TIME);
    const resolution = round.evaluate(BASE_TIME);
    expect(resolution?.outcome).toBe("vetoed");
  });

  it("rejects a veto from an agent outside the vetoer set", () => {
    const round = propose({ vetoers: ["agent-c"] });
    expect(() => round.castVeto({ agentId: "agent-a", reason: "no" }, BASE_TIME)).toThrow(NotAVetoerError);
  });

  it("rejects any veto when no vetoers are registered", () => {
    const round = propose({ vetoers: [] });
    expect(() => round.castVeto({ agentId: "agent-a", reason: "no" }, BASE_TIME)).toThrow(NotAVetoerError);
  });
});

describe("timeout", () => {
  it("resolves as timed-out with a partial tally, never silently approved or rejected", () => {
    const round = propose({ timeoutMs: 1000, quorum: { type: "count", value: 3 } });
    round.castVote({ agentId: "agent-a", choice: "yes" }, BASE_TIME);
    expect(round.evaluate(BASE_TIME + 500)).toBeNull();
    const resolution = round.evaluate(BASE_TIME + 1000);
    expect(resolution?.outcome).toBe("timed-out");
    if (resolution?.outcome === "timed-out") {
      expect(resolution.tally.votesCast).toBe(1);
    }
  });

  it("resolves normally if quorum is met before the timeout", () => {
    const round = propose({ timeoutMs: 1000, quorum: { type: "count", value: 1 } });
    round.castVote({ agentId: "agent-a", choice: "yes" }, BASE_TIME + 100);
    expect(round.evaluate(BASE_TIME + 100)?.outcome).toBe("approved");
  });
});

describe("idempotent resolution", () => {
  it("returns the same resolution object on repeated evaluate() calls", () => {
    const round = propose({ quorum: { type: "count", value: 1 } });
    round.castVote({ agentId: "agent-a", choice: "yes" }, BASE_TIME);
    const first = round.evaluate(BASE_TIME);
    const second = round.evaluate(BASE_TIME + 10_000);
    expect(second).toBe(first);
  });
});

describe("state round-trip", () => {
  it("preserves behavior through toState/fromState", () => {
    const round = propose({ quorum: { type: "count", value: 2 } });
    round.castVote({ agentId: "agent-a", choice: "yes" }, BASE_TIME);
    const restored = Round.fromState(round.toState());
    restored.castVote({ agentId: "agent-b", choice: "yes" }, BASE_TIME);
    expect(restored.evaluate(BASE_TIME)?.outcome).toBe("approved");
  });
});
