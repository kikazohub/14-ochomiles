import { CHALLENGES } from "../data/challenges.ts";
import { GO_CHALLENGES } from "../data/challengesGo.ts";
import { runChallenge } from "../src/lib/executor.ts";

let failures = 0;
let count = 0;

for (const c of CHALLENGES) {
  count++;
  const res = await runChallenge(c, c.solution);
  if (!res.passed) {
    failures++;
    console.error(`FAIL ${c.id} (tier ${c.tier}) Python`, res.error ?? "", res.firstFailure ?? "");
  }

  const go = GO_CHALLENGES[c.id];
  if (go) {
    count++;
    const resGo = await runChallenge(c, go.solutionGo, "go", 30000);
    if (!resGo.passed) {
      failures++;
      console.error(`FAIL ${c.id} (tier ${c.tier}) Go`, resGo.error ?? "", resGo.firstFailure ?? "");
    }
  } else {
    failures++;
    console.error(`FAIL ${c.id} (tier ${c.tier}) falta el reto Go`);
  }
}

console.log(`\n${count - failures}/${count} retos validados (Python + Go)`);
process.exit(failures ? 1 : 0);