import type { RoundState } from "../core/types.js";

/**
 * Storage is intentionally minimal and synchronous-result-free (all methods
 * return Promises) so any backing store — Postgres, Redis, a file, a KV
 * service — can implement it without adapting to a richer query surface.
 */
export interface RoundStore {
  save(state: RoundState): Promise<void>;
  load(id: string): Promise<RoundState | null>;
  delete(id: string): Promise<void>;
  listIds(): Promise<string[]>;
}
