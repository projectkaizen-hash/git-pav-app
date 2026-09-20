import app from "../server";
import http from "http";

describe("Auth API Integration Tests", () => {
  let server: http.Server;
  let baseUrl: string;
  let testUser: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(3003, resolve));
    baseUrl = "http://localhost:3003";

    // Generate unique test user data
    const timestamp = Date.now();
    testUser = {
      email: `test_auth_${timestamp}@pavdental.co.uk`,
      password: "TestPassword123!",
      firstName: "Test",
      lastName: "User",
      phone: `+4479${timestamp.toString().slice(-8)}`,
    };
  });

  afterAll(async () => {
    server.close();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new patient account", async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      });

      expect(response.status).toBe(201);
      const data: any = await response.json();
      
      expect(data).toHaveProperty("accessToken");
      expect(data).toHaveProperty("refreshToken");
      expect(data).toHaveProperty("user");
      expect(data.user).toHaveProperty("id");
      expect(data.user).toHaveProperty("email", testUser.email);
      expect(data.user).toHaveProperty("role", "patient");
      expect(data.user).toHaveProperty("firstName", testUser.firstName);
      expect(data.user).toHaveProperty("lastName", testUser.lastName);

      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
      userId = data.user.id;
    });

    it("should reject duplicate email registration", async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      });

      expect(response.status).toBe(409);
      const data: any = await response.json();
      expect(data).toHaveProperty("error");
    });

    it("should reject invalid email format", async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testUser,
          email: "invalid-email",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should reject weak password", async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testUser,
          email: `test_weak_${Date.now()}@pavdental.co.uk`,
          password: "weak",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      expect(response.status).toBe(200);
      const data: any = await response.json();
      
      expect(data).toHaveProperty("accessToken");
      expect(data).toHaveProperty("refreshToken");
      expect(data).toHaveProperty("user");
      expect(data.user.email).toBe(testUser.email);

      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    });

    it("should reject invalid credentials", async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: "wrongpassword",
        }),
      });

      expect(response.status).toBe(401);
      const data: any = await response.json();
      expect(data).toHaveProperty("error");
    });

    it("should reject non-existent user", async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nonexistent@pavdental.co.uk",
          password: testUser.password,
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      expect(response.status).toBe(200);
      const data: any = await response.json();
      
      expect(data).toHaveProperty("accessToken");
      expect(data).toHaveProperty("refreshToken");
      expect(data).toHaveProperty("user");
      
      // Refresh token should be rotated (new value)
      expect(data.refreshToken).not.toBe(refreshToken);
      
      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    });

    it("should reject invalid refresh token", async () => {
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: "invalid_token" }),
      });

      expect(response.status).toBe(401);
    });

    it("should reject expired or revoked refresh token", async () => {
      // First logout to revoke the token
      await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Then try to refresh with the now-revoked token
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout with valid access token", async () => {
      // First login to get a fresh session
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });
      const loginData: any = await loginResponse.json();
      accessToken = loginData.accessToken;

      const response = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(data).toHaveProperty("message");
    });

    it("should reject logout without authentication", async () => {
      const response = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/auth/sessions", () => {
    beforeAll(async () => {
      // Login to create a session
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });
      const loginData: any = await loginResponse.json();
      accessToken = loginData.accessToken;
    });

    it("should retrieve user sessions with valid token", async () => {
      const response = await fetch(`${baseUrl}/api/auth/sessions`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("should reject session retrieval without authentication", async () => {
      const response = await fetch(`${baseUrl}/api/auth/sessions`);

      expect(response.status).toBe(401);
    });
  });

  describe("Role-based access", () => {
    it("should return correct user role in auth response", async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      const data: any = await response.json();
      expect(data.user.role).toBe("patient");
    });
  });
});
