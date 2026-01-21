import { join } from "node:path";

const OPENSRC_ENTRY = "opensrc/";
const MARKER_COMMENT = "# opensrc - source code for packages";

/**
 * Check if .gitignore already has .opensrc/ entry
 */
export async function hasOpensrcEntry(cwd: string = process.cwd()): Promise<boolean> {
  const gitignorePath = join(cwd, ".gitignore");
  const gitignoreFile = Bun.file(gitignorePath);

  if (!(await gitignoreFile.exists())) {
    return false;
  }

  try {
    const content = await gitignoreFile.text();
    const lines = content.split("\n");

    return lines.some((line) => {
      const trimmed = line.trim();
      return trimmed === OPENSRC_ENTRY || trimmed === "opensrc";
    });
  } catch {
    return false;
  }
}

/**
 * Add .opensrc/ to .gitignore if not already present
 */
export async function ensureGitignore(cwd: string = process.cwd()): Promise<boolean> {
  const gitignorePath = join(cwd, ".gitignore");

  // Check if already has entry
  if (await hasOpensrcEntry(cwd)) {
    return false; // No changes made
  }

  let content = "";
  const gitignoreFile = Bun.file(gitignorePath);

  if (await gitignoreFile.exists()) {
    content = await gitignoreFile.text();
    // Ensure there's a newline at the end before we append
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }
    // Add an extra newline for separation if there's content
    if (content.trim().length > 0) {
      content += "\n";
    }
  }

  content += `${MARKER_COMMENT}\n${OPENSRC_ENTRY}\n`;

  await Bun.write(gitignorePath, content);
  return true; // Changes made
}

/**
 * Remove .opensrc/ from .gitignore
 */
export async function removeFromGitignore(cwd: string = process.cwd()): Promise<boolean> {
  const gitignorePath = join(cwd, ".gitignore");
  const gitignoreFile = Bun.file(gitignorePath);

  if (!(await gitignoreFile.exists())) {
    return false;
  }

  try {
    const content = await gitignoreFile.text();
    const lines = content.split("\n");

    const newLines = lines.filter((line) => {
      const trimmed = line.trim();
      return trimmed !== OPENSRC_ENTRY && trimmed !== "opensrc" && trimmed !== MARKER_COMMENT;
    });

    // Clean up multiple consecutive blank lines
    const cleanedLines: string[] = [];
    let prevWasBlank = false;
    for (const line of newLines) {
      const isBlank = line.trim() === "";
      if (isBlank && prevWasBlank) {
        continue;
      }
      cleanedLines.push(line);
      prevWasBlank = isBlank;
    }

    const newContent = cleanedLines.join("\n");

    if (newContent !== content) {
      await Bun.write(gitignorePath, newContent);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
