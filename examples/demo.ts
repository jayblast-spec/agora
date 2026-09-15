/**
 * Runnable demo: three agents deliberate over a proposed production action.
 * A safety-reviewer agent can veto regardless of vote tally. Run with:
 *   npx tsx examples/demo.ts
 */
import { Round } from "../src/index.js";
import * as a2a from "../src/adapters/a2a/index.js";
import * as mcp from "../src/adapters/mcp/index.js";

function log(label: string, value: unknown) {
  console.log(`\n${label}`);
  console.log(JSON.stringify(value, null, 2));
}

console.log("=== Agora demo: three agents, one safety veto, two transports ===");

// --- Scenario 1: approved via quorum, transported as A2A messages ---
const round1 = Round.propose({
  id: "deploy-2026-09-15",
  proposerId: "planner-agent",
  action: { type: "deploy", service: "checkout-api", version: "4.2.0" },
  voters: ["planner-agent", "reviewer-agent", "ops-agent"],
  quorum: { type: "fraction", value: 2 / 3 },
  createdAt: Date.now(),
});

const proposalMsg = a2a.encodeProposal(round1.getProposal());
log("A2A propose message", proposalMsg);

round1.castVote(a2a.decodeVote(a2a.encodeVote(round1.getProposal().id, { agentId: "planner-agent", choice: "yes", castAt: Date.now() })));
round1.castVote(a2a.decodeVote(a2a.encodeVote(round1.getProposal().id, { agentId: "reviewer-agent", choice: "yes", castAt: Date.now() })));

const resolution1 = round1.evaluate();
log("Resolution (2/3 quorum reached, transported over A2A)", resolution1);

// --- Scenario 2: vetoed by a safety-reviewer, transported as MCP tool calls ---
const round2 = Round.propose({
  id: "delete-prod-bucket",
  proposerId: "cleanup-agent",
  action: { type: "delete", resource: "s3://prod-user-uploads" },
  voters: ["cleanup-agent", "ops-agent"],
  vetoers: ["safety-agent"],
  quorum: { type: "count", value: 2 },
  createdAt: Date.now(),
});

const proposeCall = mcp.encodeProposalCall(round2.getProposal());
log("MCP tools/call propose request", proposeCall);

round2.castVote({ agentId: "cleanup-agent", choice: "yes" });
round2.castVote({ agentId: "ops-agent", choice: "yes" });

const vetoCall = mcp.encodeVetoCall(round2.getProposal().id, {
  agentId: "safety-agent",
  reason: "no confirmed backup exists for this bucket",
  castAt: Date.now(),
});
round2.castVeto(mcp.decodeVetoCall(vetoCall).veto);

const resolution2 = round2.evaluate();
log("Resolution (unanimous yes, still vetoed, transported over MCP)", resolution2);

console.log("\n=== Done. Scenario 1 -> approved by quorum. Scenario 2 -> blocked by veto despite unanimous yes votes. ===");
