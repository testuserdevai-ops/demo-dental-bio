import { describe, expect, it } from "bun:test";

import { createLatestTaskQueue } from "./latest-task-queue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("createLatestTaskQueue", () => {
  it("serializes saves and coalesces rapid changes to the latest value", async () => {
    const firstSave = deferred<boolean>();
    const calls: Array<{ answer: string; expectedRevision: number }> = [];
    let revision = 4;
    const queue = createLatestTaskQueue(async (answer: string) => {
      calls.push({ answer, expectedRevision: revision });
      if (calls.length === 1) await firstSave.promise;
      revision += 1;
      return true;
    });

    void queue.enqueue("first");
    void queue.enqueue("superseded");
    void queue.enqueue("latest");

    expect(calls).toEqual([{ answer: "first", expectedRevision: 4 }]);
    firstSave.resolve(true);
    expect(await queue.flush()).toBe(true);
    expect(calls).toEqual([
      { answer: "first", expectedRevision: 4 },
      { answer: "latest", expectedRevision: 5 },
    ]);
    expect(queue.hasPending()).toBe(false);
  });
});
