import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * The seed entry point `prisma.config.ts` points at. It was configured but
 * missing, which meant `prisma migrate reset` failed at the seed step.
 *
 * Groups run first: they create the facilitator account and the groups, and
 * the user seed assigns its users into groups that must already exist.
 *
 * Each script calls `main()` at module load and disconnects when it finishes,
 * so they are run as separate processes rather than imported. Importing both
 * would start them concurrently and tear the client down under the other.
 */

const SCRIPTS = ["seed-groups.ts", "seed-users.ts"];

for (const script of SCRIPTS) {
    console.log(`\n=== ${script} ===`);
    execFileSync(
        "npx",
        ["ts-node", "--project", "tsconfig.seed.json", resolve(__dirname, script)],
        { stdio: "inherit", shell: process.platform === "win32" }
    );
}

console.log("\nSeeding complete.");
