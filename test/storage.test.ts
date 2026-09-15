import { describe, expect, it } from "vitest";
import { Round } from "../src/core/round.js";
import { InMemoryRoundStore } from "../src/storage/in-memory.js";

describe("InMemoryRoundStore", () => {
  it("saves, loads, lists, and deletes round state", async () => {
    const store = new InMemoryRoundStore();
    const round = Round.propose({
      id: "r1",
      proposerId: "a",
      action: { do: "thing" },
      voters: ["a", "b"],
      quorum: { type: "count", value: 1 },
    });
    await store.save(round.toState());

    expect(await store.listIds()).toEqual(["r1"]);
    const loaded = await store.load("r1");
    expect(loaded?.proposal.id).toBe("r1");

    await store.delete("r1");
    expect(await store.load("r1")).toBeNull();
    expect(await store.listIds()).toEqual([]);
  });

  it("returns null for an unknown id", async () => {
    const store = new InMemoryRoundStore();
    expect(await store.load("nope")).toBeNull();
  });

  it("does not let mutating a loaded state affect the stored copy", async () => {
    const store = new InMemoryRoundStore();
    const round = Round.propose({
      id: "r1",
      proposerId: "a",
      action: null,
      voters: ["a"],
      quorum: { type: "count", value: 1 },
    });
    await store.save(round.toState());
    const loaded = await store.load("r1");
    loaded!.proposal.voters.push("intruder");
    const reloaded = await store.load("r1");
    expect(reloaded?.proposal.voters).toEqual(["a"]);
  });
});
