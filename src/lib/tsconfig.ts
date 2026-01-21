import { join } from "node:path";

const OPENSRC_DIR = "opensrc";

interface TsConfig {
  exclude?: string[];
  [key: string]: unknown;
}

/**
 * Check if tsconfig.json exists
 */
export async function hasTsConfig(cwd: string = process.cwd()): Promise<boolean> {
  return await Bun.file(join(cwd, "tsconfig.json")).exists();
}

/**
 * Check if tsconfig.json already excludes opensrc/
 */
export async function hasOpensrcExclude(cwd: string = process.cwd()): Promise<boolean> {
  const tsconfigPath = join(cwd, "tsconfig.json");
  const tsconfigFile = Bun.file(tsconfigPath);

  if (!(await tsconfigFile.exists())) {
    return false;
  }

  try {
    const config = (await tsconfigFile.json()) as TsConfig;

    if (!config.exclude) {
      return false;
    }

    return config.exclude.some(
      (entry) =>
        entry === OPENSRC_DIR || entry === `${OPENSRC_DIR}/` || entry === `./${OPENSRC_DIR}`,
    );
  } catch {
    return false;
  }
}

/**
 * Add opensrc/ to tsconfig.json exclude array
 */
export async function ensureTsconfigExclude(cwd: string = process.cwd()): Promise<boolean> {
  const tsconfigPath = join(cwd, "tsconfig.json");
  const tsconfigFile = Bun.file(tsconfigPath);

  if (!(await tsconfigFile.exists())) {
    return false;
  }

  // Already excluded
  if (await hasOpensrcExclude(cwd)) {
    return false;
  }

  try {
    const config = (await tsconfigFile.json()) as TsConfig;

    if (!config.exclude) {
      config.exclude = [];
    }

    config.exclude.push(OPENSRC_DIR);

    // Preserve formatting by using 2-space indent (most common for tsconfig)
    await Bun.write(tsconfigPath, JSON.stringify(config, null, 2) + "\n");
    return true;
  } catch {
    return false;
  }
}
