/**
 * Storage Seam — Exported repo singleton and factory switcher.
 *
 * Provides a single deep interface for all storage queries across the application.
 */

import { KvRepo } from "./kv-repo.ts";
import type { Repo } from "./repo.ts";

let currentRepo: Repo = new KvRepo();

export function getRepo(): Repo {
  return currentRepo;
}

export function setRepo(r: Repo): void {
  currentRepo = r;
}

export const repo = new Proxy({} as Repo, {
  get(_target, prop: keyof Repo) {
    const instance = getRepo();
    const val = instance[prop];
    return typeof val === "function" ? val.bind(instance) : val;
  },
});

export type { Repo } from "./repo.ts";
