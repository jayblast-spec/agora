import type { RoundState } from "../core/types.js";
import type { RoundStore } from "./types.js";

/** Reference implementation for tests, demos, and single-process use. Not durable. */
export class InMemoryRoundStore implements RoundStore {
  private readonly states = new Map<string, RoundState>();

  async save(state: RoundState): Promise<void> {
    this.states.set(state.proposal.id, structuredClone(state));
  }

  async load(id: string): Promise<RoundState | null> {
    const state = this.states.get(id);
    return state ? structuredClone(state) : null;
  }

  async delete(id: string): Promise<void> {
    this.states.delete(id);
  }

  async listIds(): Promise<string[]> {
    return [...this.states.keys()];
  }
}
