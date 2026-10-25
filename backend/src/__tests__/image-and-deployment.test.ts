/**
 * Automated tests for CS-45: Image and Deployment (DK-1, DK-2).
 *
 * Verifies:
 * 1. backend/Dockerfile:
 *    - Documents release command 'npx prisma migrate deploy'
 *    - Prunes devDependencies via 'npm prune --omit=dev'
 *    - Defines container HEALTHCHECK against /livez
 * 2. backend/.dockerignore:
 *    - Excludes secrets, uploads, node_modules, and test files
 * 3. backend/package.json:
 *    - prisma is in runtime dependencies for container migrate capability
 * 4. docker-compose.yml:
 *    - Published ports are bound strictly to 127.0.0.1 loopback
 *    - Contains developer security warning notice
 */

import fs from "fs";
import path from "path";

describe("CS-45 Image and Deployment Verification", () => {
  const backendDir = path.resolve(__dirname, "../..");
  const repoRoot = path.resolve(backendDir, "..");

  describe("DK-1: Dockerfile & .dockerignore Cleanliness", () => {
    it("backend/Dockerfile includes release command, npm prune, and HEALTHCHECK", () => {
      const dockerfilePath = path.join(backendDir, "Dockerfile");
      expect(fs.existsSync(dockerfilePath)).toBe(true);

      const content = fs.readFileSync(dockerfilePath, "utf-8");

      // Release command documented
      expect(content).toMatch(/Release command:\s*npx prisma migrate deploy/i);

      // Dev dependencies pruned
      expect(content).toContain("npm prune --omit=dev");

      // HEALTHCHECK configured
      expect(content).toContain("HEALTHCHECK");
      expect(content).toContain("/livez");
    });

    it("backend/.dockerignore excludes sensitive and unneeded directories", () => {
      const dockerignorePath = path.join(backendDir, ".dockerignore");
      expect(fs.existsSync(dockerignorePath)).toBe(true);

      const content = fs.readFileSync(dockerignorePath, "utf-8");
      const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);

      expect(lines).toContain(".env");
      expect(lines).toContain(".env.*");
      expect(lines).toContain("uploads");
      expect(lines).toContain("node_modules");
      expect(lines).toContain("dist");
      expect(lines).toContain(".git");
    });

    it("backend/package.json places prisma in runtime dependencies", () => {
      const pkgPath = path.join(backendDir, "package.json");
      expect(fs.existsSync(pkgPath)).toBe(true);

      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      expect(pkg.dependencies.prisma).toBeDefined();
    });
  });

  describe("DK-2: Compose Port Exposure & Dev Warning", () => {
    it("docker-compose.yml binds ports strictly to 127.0.0.1 loopback", () => {
      const composePath = path.join(repoRoot, "docker-compose.yml");
      expect(fs.existsSync(composePath)).toBe(true);

      const content = fs.readFileSync(composePath, "utf-8");

      // Verify all ports mappings specify 127.0.0.1:
      const portLines = content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("- \"") && l.includes(":"));

      expect(portLines.length).toBeGreaterThanOrEqual(3);
      for (const line of portLines) {
        expect(line).toMatch(/^-\s*"127\.0\.0\.1:\d+:\d+"$/);
      }

      // Verify warning comment is present
      expect(content).toMatch(/WARNING:.*strictly for local.*development/i);
    });
  });

  describe("Disaster Recovery Runbook", () => {
    it("docs/deploy/backup-and-restore-runbook.md exists and covers PITR", () => {
      const runbookPath = path.join(repoRoot, "docs/deploy/backup-and-restore-runbook.md");
      expect(fs.existsSync(runbookPath)).toBe(true);

      const content = fs.readFileSync(runbookPath, "utf-8");
      expect(content).toContain("Point-in-Time Recovery");
      expect(content).toContain("npx prisma migrate deploy");
    });
  });
});
