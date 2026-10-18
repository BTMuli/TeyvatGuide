/**
 * 米游社回复交互锁回归测试。
 * @since Beta v0.12.6
 */

import { describe, expect, it } from "vitest";

import { createReplyInteraction } from "../src/hooks/useReplyInteraction.js";

/**
 * 可手动完成的异步测试信号。
 * @since Beta v0.12.6
 */
type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

/**
 * 创建可手动完成的异步测试信号。
 * @since Beta v0.12.6
 * @returns 可手动完成的异步测试信号
 */
function createDeferred(): Deferred {
  let resolvePromise = (): void => undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: () => resolvePromise() };
}

describe("createReplyInteraction", () => {
  it("locks synchronously and rejects concurrent actions without queuing", async () => {
    const interaction = createReplyInteraction();
    const deferred = createDeferred();
    const calls: Array<string> = [];
    const first = interaction.run(async () => {
      calls.push("first");
      await deferred.promise;
    });

    expect(interaction.busy.value).toBe(true);
    const second = await interaction.run(async () => {
      calls.push("second");
    });
    expect(second).toBe(false);
    expect(calls).toEqual(["first"]);

    deferred.resolve();
    await expect(first).resolves.toBe(true);
    expect(interaction.busy.value).toBe(false);
  });

  it("releases the shared lock after a rejected action", async () => {
    const interaction = createReplyInteraction();
    const error = new Error("mutation failed");

    await expect(
      interaction.run(async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(interaction.busy.value).toBe(false);

    await expect(interaction.run(async () => undefined)).resolves.toBe(true);
    expect(interaction.busy.value).toBe(false);
  });

  it("releases the lock when an action completes without mutating", async () => {
    const interaction = createReplyInteraction();

    await expect(interaction.run(async () => undefined)).resolves.toBe(true);
    expect(interaction.busy.value).toBe(false);
  });

  it("keeps busy true until the asynchronous action settles", async () => {
    const interaction = createReplyInteraction();
    const deferred = createDeferred();
    const action = interaction.run(async () => {
      await deferred.promise;
      expect(interaction.busy.value).toBe(true);
    });

    expect(interaction.busy.value).toBe(true);
    deferred.resolve();
    await expect(action).resolves.toBe(true);
    expect(interaction.busy.value).toBe(false);
  });
});
