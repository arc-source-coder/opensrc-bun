import { removeSource, packageExists } from '../lib/git.js';

export interface RemoveOptions {
  cwd?: string;
}

/**
 * Remove source code for one or more packages
 */
export async function removeCommand(
  packages: string[],
  options: RemoveOptions = {}
): Promise<void> {
  const cwd = options.cwd || process.cwd();
  let removed = 0;
  let notFound = 0;
  
  for (const packageName of packages) {
    if (!packageExists(packageName, cwd)) {
      console.log(`  ⚠ ${packageName} not found`);
      notFound++;
      continue;
    }
    
    const success = await removeSource(packageName, cwd);
    
    if (success) {
      console.log(`  ✓ Removed ${packageName}`);
      removed++;
    } else {
      console.log(`  ✗ Failed to remove ${packageName}`);
    }
  }
  
  console.log(`\nRemoved ${removed} package(s)${notFound > 0 ? `, ${notFound} not found` : ''}`);
}
