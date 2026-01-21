import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { hasTsConfig, hasOpensrcExclude, ensureTsconfigExclude } from "./tsconfig";

const TEST_DIR = join(process.cwd(), ".test-tsconfig");
const TSCONFIG_PATH = join(TEST_DIR, "tsconfig.json");

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  if (existsSync(TEST_DIR)) {
    await rm(TEST_DIR, { recursive: true, force: true });
  }
});

describe("hasTsConfig", () => {
  it("returns false if tsconfig.json does not exist", async () => {
    expect(await hasTsConfig(TEST_DIR)).toBe(false);
  });

  it("returns true if tsconfig.json exists", async () => {
    await Bun.write(TSCONFIG_PATH, "{}");
    expect(await hasTsConfig(TEST_DIR)).toBe(true);
  });
});

describe("hasOpensrcExclude", () => {
  it("returns false if tsconfig.json does not exist", async () => {
    expect(await hasOpensrcExclude(TEST_DIR)).toBe(false);
  });

  it("returns false if no exclude array", async () => {
    await Bun.write(TSCONFIG_PATH, JSON.stringify({ compilerOptions: {} }));
    expect(await hasOpensrcExclude(TEST_DIR)).toBe(false);
  });

  it("returns false if exclude array does not contain opensrc", async () => {
    await Bun.write(TSCONFIG_PATH, JSON.stringify({ exclude: ["node_modules", "dist"] }));
    expect(await hasOpensrcExclude(TEST_DIR)).toBe(false);
  });

  it("returns true if exclude contains opensrc", async () => {
    await Bun.write(TSCONFIG_PATH, JSON.stringify({ exclude: ["node_modules", "opensrc"] }));
    expect(await hasOpensrcExclude(TEST_DIR)).toBe(true);
  });

  it("returns true if exclude contains opensrc/", async () => {
    await Bun.write(TSCONFIG_PATH, JSON.stringify({ exclude: ["node_modules", "opensrc/"] }));
    expect(await hasOpensrcExclude(TEST_DIR)).toBe(true);
  });

  it("returns true if exclude contains ./opensrc", async () => {
    await Bun.write(TSCONFIG_PATH, JSON.stringify({ exclude: ["node_modules", "./opensrc"] }));
    expect(await hasOpensrcExclude(TEST_DIR)).toBe(true);
  });

  it("returns false for invalid JSON", async () => {
    await Bun.write(TSCONFIG_PATH, "{ invalid json }");
    expect(await hasOpensrcExclude(TEST_DIR)).toBe(false);
  });
});

describe("ensureTsconfigExclude", () => {
  it("returns false if tsconfig.json does not exist", async () => {
    const result = await ensureTsconfigExclude(TEST_DIR);
    expect(result).toBe(false);
  });

  it("returns false if opensrc already in exclude", async () => {
    await Bun.write(TSCONFIG_PATH, JSON.stringify({ exclude: ["opensrc"] }));

    const result = await ensureTsconfigExclude(TEST_DIR);
    expect(result).toBe(false);
  });

  it("adds opensrc to existing exclude array", async () => {
    await Bun.write(TSCONFIG_PATH, JSON.stringify({ exclude: ["node_modules", "dist"] }));

    const result = await ensureTsconfigExclude(TEST_DIR);
    expect(result).toBe(true);

    const content = await Bun.file(TSCONFIG_PATH).json();
    expect(content.exclude).toContain("opensrc");
    expect(content.exclude).toContain("node_modules");
    expect(content.exclude).toContain("dist");
  });

  it("creates exclude array if it does not exist", async () => {
    await Bun.write(TSCONFIG_PATH, JSON.stringify({ compilerOptions: { strict: true } }));

    const result = await ensureTsconfigExclude(TEST_DIR);
    expect(result).toBe(true);

    const content = await Bun.file(TSCONFIG_PATH).json();
    expect(content.exclude).toEqual(["opensrc"]);
    expect(content.compilerOptions.strict).toBe(true);
  });

  it("preserves other config options", async () => {
    const originalConfig = {
      compilerOptions: {
        target: "ES2020",
        module: "NodeNext",
        strict: true,
      },
      include: ["src/**/*"],
    };
    await Bun.write(TSCONFIG_PATH, JSON.stringify(originalConfig));

    await ensureTsconfigExclude(TEST_DIR);

    const content = await Bun.file(TSCONFIG_PATH).json();
    expect(content.compilerOptions).toEqual(originalConfig.compilerOptions);
    expect(content.include).toEqual(originalConfig.include);
    expect(content.exclude).toContain("opensrc");
  });

  it("uses 2-space indentation", async () => {
    await Bun.write(TSCONFIG_PATH, JSON.stringify({ compilerOptions: {} }));

    await ensureTsconfigExclude(TEST_DIR);

    const content = await Bun.file(TSCONFIG_PATH).text();
    // Check for 2-space indentation pattern
    expect(content).toMatch(/^  "/m);
  });

  it("adds trailing newline", async () => {
    await Bun.write(TSCONFIG_PATH, JSON.stringify({}));

    await ensureTsconfigExclude(TEST_DIR);

    const content = await Bun.file(TSCONFIG_PATH).text();
    expect(content).toMatch(/\n$/);
  });

  it("returns false for invalid JSON", async () => {
    await Bun.write(TSCONFIG_PATH, "{ invalid json }");

    const result = await ensureTsconfigExclude(TEST_DIR);
    expect(result).toBe(false);
  });
});
