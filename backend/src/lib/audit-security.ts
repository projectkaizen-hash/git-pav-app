import crypto from "crypto";
import { env } from "../config/env";

export function pseudonymiseIp(ip: string): string {
  return crypto
    .createHmac("sha256", env.auditIpHmacSecret)
    .update(ip)
    .digest("hex");
}
