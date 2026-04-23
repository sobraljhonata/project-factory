#!/usr/bin/env node
import { runCreateCommand } from "./create-command";
import { runDoctorCommand } from "./doctor";
import { runUpgradeDryRunCommand } from "./upgrade-dry-run";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv[0] === "doctor") {
    process.exitCode = await runDoctorCommand(argv.slice(1));
    return;
  }
  if (argv[0] === "upgrade") {
    process.exitCode = await runUpgradeDryRunCommand(argv.slice(1));
    return;
  }

  const createArgv = argv[0] === "create" ? argv.slice(1) : argv;
  process.exitCode = await runCreateCommand(createArgv);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[project-factory] ${msg}`);
  process.exit(1);
});
