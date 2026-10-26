import crypto from "crypto";
import { communicationService } from "../lib/communication-service";
import { prisma } from "../lib/prisma";
import { checkPushReceipts, RECEIPT_DELAY_MS, RECEIPT_TTL_MS } from "../lib/push-receipts";

// BE-09: tickets from Expo's send call are kept, their receipts are checked
// later, and a DeviceNotRegistered receipt switches the token off. Expo's API
// is replaced with a fake; no request leaves the test. Synthetic data only.
describe("push receipts", () => {
  const tag = crypto.randomUUID().slice(0, 8);
  const userIds: string[] = [];
  let fetchSpy: jest.SpyInstance;
  let receipts: Record<string, unknown> = {};
  let nextTicket = 0;

  async function makeToken(label: string) {
    const user = await prisma.user.create({ data: { email: `push-${label}-${tag}@example.test`, passwordHash: "x", role: "patient" } });
    userIds.push(user.id);
    const token = `ExponentPushToken[${label}-${tag}]`;
    await prisma.pushToken.create({ data: { userId: user.id, token, platform: "ios" } });
    return token;
  }

  const send = (token: string) =>
    communicationService.sendExpoPushNotifications([{ to: token, title: "Synthetic", body: "Synthetic" }]);

  beforeAll(() => {
    fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (url, init) => {
      if (String(url).endsWith("/push/send")) {
        const messages = JSON.parse(String(init?.body)) as unknown[];
        const data = messages.map(() => ({ status: "ok", id: `tkt-${tag}-${nextTicket++}` }));
        return new Response(JSON.stringify({ data }), { status: 200 });
      }
      if (String(url).endsWith("/push/getReceipts")) {
        const { ids } = JSON.parse(String(init?.body)) as { ids: string[] };
        const data = Object.fromEntries(ids.filter((id) => id in receipts).map((id) => [id, receipts[id]]));
        return new Response(JSON.stringify({ data }), { status: 200 });
      }
      throw new Error(`Unexpected request in test: ${String(url)}`);
    });
  });

  afterAll(async () => {
    fetchSpy.mockRestore();
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  const ticketsFor = (token: string) => prisma.pushTicket.findMany({ where: { token } });
  const isActive = async (token: string) => (await prisma.pushToken.findUniqueOrThrow({ where: { token } })).active;

  it("switches off a token whose receipt says the app is gone, and clears settled tickets", async () => {
    const gone = await makeToken("gone");
    const fine = await makeToken("fine");
    await send(gone);
    await send(fine);
    const [goneTicket] = await ticketsFor(gone);
    const [fineTicket] = await ticketsFor(fine);
    expect(goneTicket).toBeDefined();
    expect(fineTicket).toBeDefined();

    receipts = {
      [goneTicket.id]: { status: "error", details: { error: "DeviceNotRegistered" } },
      [fineTicket.id]: { status: "ok" },
    };
    // Too soon: receipts aren't asked for until Expo has had time.
    await checkPushReceipts(new Date());
    expect(await ticketsFor(gone)).toHaveLength(1);

    await checkPushReceipts(new Date(Date.now() + RECEIPT_DELAY_MS + 1000));
    expect(await isActive(gone)).toBe(false);
    expect(await isActive(fine)).toBe(true);
    expect(await ticketsFor(gone)).toHaveLength(0);
    expect(await ticketsFor(fine)).toHaveLength(0);
  });

  it("keeps a ticket whose receipt isn't ready, and drops it once Expo no longer has it", async () => {
    const pending = await makeToken("pending");
    await send(pending);
    receipts = {};

    await checkPushReceipts(new Date(Date.now() + RECEIPT_DELAY_MS + 1000));
    expect(await ticketsFor(pending)).toHaveLength(1);
    expect(await isActive(pending)).toBe(true);

    await checkPushReceipts(new Date(Date.now() + RECEIPT_TTL_MS + 1000));
    expect(await ticketsFor(pending)).toHaveLength(0);
  });

  it("removes a token's tickets with the token", async () => {
    const token = await makeToken("erased");
    await send(token);
    expect(await ticketsFor(token)).toHaveLength(1);
    await prisma.pushToken.delete({ where: { token } });
    expect(await ticketsFor(token)).toHaveLength(0);
  });
});
