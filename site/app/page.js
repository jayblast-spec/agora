const install = "npm install agora-protocol";

const usage = `import { Round } from "agora-protocol";

const round = Round.propose({
  id: "deploy-2026-09-15",
  proposerId: "planner-agent",
  action: { type: "deploy", service: "checkout-api", version: "4.2.0" },
  voters: ["planner-agent", "reviewer-agent", "ops-agent"],
  quorum: { type: "fraction", value: 2 / 3 },
});

round.castVote({ agentId: "planner-agent", choice: "yes" });
round.castVote({ agentId: "reviewer-agent", choice: "yes" });

const resolution = round.evaluate();
// { outcome: "approved", tally: {...}, resolvedAt: ... }`;

const veto = `round.castVeto({
  agentId: "safety-agent",
  reason: "no confirmed backup exists for this bucket",
});

round.evaluate();
// { outcome: "vetoed", veto: {...}, resolvedAt: ... }`;

const demo = "npx tsx examples/demo.ts";

export default function HomePage() {
  return (
    <main className="wrap">
      <header>
        <p className="kicker">agora-protocol</p>
        <h1>Agora</h1>
        <p className="lede">
          Propose, vote, veto, and quorum semantics for multi-agent systems —
          layered on top of MCP and A2A without changing either spec.
        </p>
        <nav aria-label="On this page">
          <a href="#what">What it does</a>
          <a href="#install">Install</a>
          <a href="#usage">Usage</a>
          <a href="#links">Links</a>
        </nav>
      </header>

      <img
        className="banner"
        src="/agora/banner.svg"
        width="860"
        height="280"
        alt="Agora: propose, vote or veto, resolve"
      />

      <section id="what">
        <h2>What it does</h2>
        <p>
          A 2026 protocol analysis,{" "}
          <a href="https://arxiv.org/abs/2606.31498">
            Governance Gaps in Agent Interoperability Protocols
          </a>
          , looked at MCP, A2A, ACP, ANP, and ERC-8004 and found that voting
          and dissent preservation are absent from all five. None of them
          define a quorum, a preference-aggregation rule, or a way to record
          that a proposal was rejected and why.
        </p>
        <p>
          Agora is a reference implementation of those missing primitives: a
          small, dependency-free state machine for propose, then vote or veto,
          then resolve. Reference adapters carry that deliberation over real
          A2A messages and real MCP tool calls, so you keep the protocols you
          already run.
        </p>
        <ul>
          <li>The core has no I/O and no protocol knowledge. Adapters only translate messages.</li>
          <li>A veto is a distinct outcome and overrides the tally, including a unanimous yes.</li>
          <li>Ties resolve to rejected. Fraction quorum is measured against registered voters.</li>
          <li>Resolution is idempotent. A timeout stays its own outcome and keeps the partial tally.</li>
        </ul>
      </section>

      <section id="install">
        <h2>Install</h2>
        <pre>
          <code>{install}</code>
        </pre>
      </section>

      <section id="usage">
        <h2>Usage</h2>
        <p>Open a round, collect votes, and resolve it:</p>
        <pre>
          <code>{usage}</code>
        </pre>
        <p>A registered vetoer can stop the round no matter how the votes add up:</p>
        <pre>
          <code>{veto}</code>
        </pre>
        <p>The annotated demo in the repository runs both scenarios and prints the wire messages:</p>
        <pre>
          <code>{demo}</code>
        </pre>
      </section>

      <section id="links">
        <h2>Links</h2>
        <ul className="links">
          <li>
            <a href="https://github.com/jayblast-spec/agora">Repository</a>
            <span>Source, issues, and the annotated demo</span>
          </li>
          <li>
            <a href="https://www.npmjs.com/package/agora-protocol">npm</a>
            <span>agora-protocol package</span>
          </li>
          <li>
            <a href="https://arxiv.org/abs/2606.31498">Research note</a>
            <span>Governance Gaps in Agent Interoperability Protocols</span>
          </li>
          <li>
            <a href="https://modelcontextprotocol.io">Model Context Protocol</a>
            <span>MCP, which the adapter speaks without a spec change</span>
          </li>
          <li>
            <a href="https://a2a-protocol.org">Agent2Agent</a>
            <span>A2A, which the adapter speaks without a spec change</span>
          </li>
          <li>
            <a href="https://github.com/jayblast-spec/agora/blob/main/LICENSE">MIT license</a>
            <span>Free to use</span>
          </li>
        </ul>
      </section>

      <footer>
        <p>
          Built by <a href="https://github.com/jayblast-spec">ArkNet Digital</a>.
        </p>
      </footer>
    </main>
  );
}
