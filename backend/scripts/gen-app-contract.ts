import { writeFileSync } from "fs";
import { APP_CONTRACT_PATH, renderAppContract } from "../src/contracts/app-contract-file";

writeFileSync(APP_CONTRACT_PATH, renderAppContract());
console.log(`Wrote ${APP_CONTRACT_PATH}`);
