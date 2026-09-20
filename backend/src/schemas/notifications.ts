import { z } from "zod";

const expoPushToken = z.string().trim().regex(/^ExponentPushToken\[.+?\]$/, "Invalid Expo push token format");
const platform = z.enum(["ios", "android", "web", "unknown"]);
const time = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)");

export const registerPushTokenSchema = z.object({
  expoPushToken: expoPushToken,
  platform: platform.optional(),
}).strict();

export const updateNotificationPreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  appointmentReminders: z.boolean().optional(),
  appointmentConfirmations: z.boolean().optional(),
  marketingUpdates: z.boolean().optional(),
  quietHoursStart: time.optional(),
  quietHoursEnd: time.optional(),
}).strict();

export const sendNotificationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(1).max(500).optional(),
  data: z.record(z.unknown()).optional(),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
}).strict();

export const scheduleNotificationSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(500),
  data: z.record(z.unknown()).optional(),
  scheduledFor: z.string().datetime({ offset: true }),
}).strict();

export const notificationHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();

export const sendReceiptSchema = z.object({
  appointmentId: z.string().uuid(),
  amountPence: z.number().int().min(0).max(1000000),
  paymentMethod: z.string().trim().min(1).max(50),
}).strict();
