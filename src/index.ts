export { Round } from "./core/round.js";
export { computeTally, quorumMet, majorityApproved, validateQuorumReachable } from "./core/tally.js";
export * from "./core/types.js";
export type { RoundStore } from "./storage/types.js";
export { InMemoryRoundStore } from "./storage/in-memory.js";
