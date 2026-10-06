import { describe, expect, it } from "vitest";
import { cached, invalidateCache } from "./cache";

describe("cached", () => {
  it("reuses a value until the TTL expires", async () => {
    let t = 0;
    let calls = 0;
    const load = async () => ++calls;

    expect(await cached("a", 100, load, () => t)).toBe(1);
    t = 50;
    expect(await cached("a", 100, load, () => t)).toBe(1);
    t = 150;
    expect(await cached("a", 100, load, () => t)).toBe(2);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    let calls = 0;
    const load = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 5));
      return calls;
    };
    const [x, y] = await Promise.all([cached("b", 1000, load), cached("b", 1000, load)]);
    expect(x).toBe(1);
    expect(y).toBe(1);
    expect(calls).toBe(1);
  });

  it("does not cache failures", async () => {
    let calls = 0;
    const load = async () => {
      calls += 1;
      if (calls === 1) throw new Error("429");
      return "ok";
    };
    await expect(cached("c", 1000, load)).rejects.toThrow("429");
    expect(await cached("c", 1000, load)).toBe("ok");
  });

  it("invalidates by prefix", async () => {
    let calls = 0;
    const load = async () => ++calls;
    await cached("styles:x", 1000, load);
    invalidateCache("styles:");
    expect(await cached("styles:x", 1000, load)).toBe(2);
  });
});
