import path from "path";
import { appContract } from "./app-api";
import { contractToTypeScript } from "./to-typescript";

export const APP_CONTRACT_PATH = path.resolve(__dirname, "../../../pavdental/src/features/api-contract.gen.ts");

const HEADER = `// Generated from backend/src/contracts/app-api.ts by \`npm run contract:app\`
// in backend/. Don't edit by hand: change the schema there and regenerate.
// The backend's app-contract test checks real responses against the same
// schemas, and fails if this file is out of date.`;

export function renderAppContract(): string {
  return contractToTypeScript(appContract, HEADER);
}
