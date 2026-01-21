import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { hasOpensrcEntry, ensureGitignore, removeFromGitignore } from "./gitignore";

const TEST_DIR = join(process.cwd(), ".test-gitignore");
const GITIGNORE_PATH = join(TEST_DIR, ".gitignore");

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  if (existsSync(TEST_DIR)) {
    await rm(TEST_DIR, { recursive: true, force: true });
  }
});

describe("hasOpensrcEntry", () => {
  it("returns false if .gitignore does not exist", async () => {
    expect(await hasOpensrcEntry(TEST_DIR)).toBe(false);
  });

  it("returns false if .gitignore has no opensrc entry", async () => {
    await Bun.write(GITIGNORE_PATH, "node_modules/\ndist/\n");
    expect(await hasOpensrcEntry(TEST_DIR)).toBe(false);
  });

  it("returns true if .gitignore has opensrc/ entry", async () => {
    await Bun.write(GITIGNORE_PATH, "node_modules/\nopensrc/\n");
    expect(await hasOpensrcEntry(TEST_DIR)).toBe(true);
  });

  it("returns true if .gitignore has opensrc entry (without slash)", async () => {
    await Bun.write(GITIGNORE_PATH, "node_modules/\nopensrc\n");
    expect(await hasOpensrcEntry(TEST_DIR)).toBe(true);
  });

  it("handles whitespace around entry", async () => {
    await Bun.write(GITIGNORE_PATH, "node_modules/\n  opensrc/  \n");
    expect(await hasOpensrcEntry(TEST_DIR)).toBe(true);
  });

  it("does not match partial entries", async () => {
    await Bun.write(GITIGNORE_PATH, "my-opensrc/\nopensrc-backup/\n");
    expect(await hasOpensrcEntry(TEST_DIR)).toBe(false);
  });
});

describe("ensureGitignore", () => {
  it("creates .gitignore with opensrc entry if file does not exist", async () => {
    const result = await ensureGitignore(TEST_DIR);
    expect(result).toBe(true);

    const gitignoreFile = Bun.file(GITIGNORE_PATH);
    expect(await gitignoreFile.exists()).toBe(true);

    const content = await gitignoreFile.text();
    expect(content).toContain("opensrc/");
    expect(content).toContain("# opensrc");
  });

  it("appends opensrc entry to existing .gitignore", async () => {
    await Bun.write(GITIGNORE_PATH, "node_modules/\ndist/");

    const result = await ensureGitignore(TEST_DIR);
    expect(result).toBe(true);

    const content = await Bun.file(GITIGNORE_PATH).text();
    expect(content).toContain("node_modules/");
    expect(content).toContain("dist/");
    expect(content).toContain("opensrc/");
  });

  it("returns false if entry already exists", async () => {
    await Bun.write(GITIGNORE_PATH, "node_modules/\nopensrc/\n");

    const result = await ensureGitignore(TEST_DIR);
    expect(result).toBe(false);
  });

  it("adds newline before entry if file does not end with newline", async () => {
    await Bun.write(GITIGNORE_PATH, "node_modules/");

    await ensureGitignore(TEST_DIR);

    const content = await Bun.file(GITIGNORE_PATH).text();
    // Should have proper separation
    expect(content).toMatch(/node_modules\/\n\n.*opensrc/);
  });

  it("adds separator newline if file has content", async () => {
    await Bun.write(GITIGNORE_PATH, "node_modules/\n");

    await ensureGitignore(TEST_DIR);

    const content = await Bun.file(GITIGNORE_PATH).text();
    // Should have blank line for separation
    expect(content).toContain("node_modules/\n\n");
  });
});

describe("removeFromGitignore", () => {
  it("returns false if .gitignore does not exist", async () => {
    const result = await removeFromGitignore(TEST_DIR);
    expect(result).toBe(false);
  });

  it("returns false if no opensrc entry exists", async () => {
    await Bun.write(GITIGNORE_PATH, "node_modules/\ndist/\n");

    const result = await removeFromGitignore(TEST_DIR);
    expect(result).toBe(false);
  });

  it("removes opensrc/ entry", async () => {
    await Bun.write(GITIGNORE_PATH, "node_modules/\nopensrc/\ndist/\n");

    const result = await removeFromGitignore(TEST_DIR);
    expect(result).toBe(true);

    const content = await Bun.file(GITIGNORE_PATH).text();
    expect(content).not.toContain("opensrc/");
    expect(content).toContain("node_modules/");
    expect(content).toContain("dist/");
  });

  it("removes opensrc entry (without slash)", async () => {
    await Bun.write(GITIGNORE_PATH, "node_modules/\nopensrc\ndist/\n");

    await removeFromGitignore(TEST_DIR);

    const content = await Bun.file(GITIGNORE_PATH).text();
    expect(content).not.toContain("opensrc");
  });

  it("removes marker comment", async () => {
    await Bun.write(
      GITIGNORE_PATH,
      "node_modules/\n\n# opensrc - source code for packages\nopensrc/\n",
    );

    await removeFromGitignore(TEST_DIR);

    const content = await Bun.file(GITIGNORE_PATH).text();
    expect(content).not.toContain("# opensrc");
    expect(content).not.toContain("opensrc/");
  });

  it("cleans up multiple consecutive blank lines", async () => {
    await Bun.write(GITIGNORE_PATH, "node_modules/\n\n\n\nopensrc/\n\n\n\ndist/\n");

    await removeFromGitignore(TEST_DIR);

    const content = await Bun.file(GITIGNORE_PATH).text();
    // Should not have more than 2 consecutive newlines
    expect(content).not.toMatch(/\n{3,}/);
  });
});
