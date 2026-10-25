import React from "react";
import { StyleProp, ViewStyle, TextStyle, View } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/theme";

// ─── Semantic icon mapping ────────────────────────────────────────────────────
// The iOS reference uses solid, Material-style glyphs (person, shield, gift,
// receipt), so every semantic name maps to a filled Material icon. Screens
// keep using the semantic names; the glyph source lives only here.

type MaterialName = React.ComponentProps<typeof MaterialIcons>["name"];
type CommunityName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type Glyph = { mi: MaterialName } | { mci: CommunityName };

const GLYPHS = {
  home: { mi: "home" },
  calendar: { mi: "calendar-today" },
  calendarCheck: { mi: "event-available" },
  records: { mi: "folder" },
  profile: { mi: "person" },
  settings: { mi: "settings" },
  search: { mi: "search" },
  chevronRight: { mi: "chevron-right" },
  chevronLeft: { mi: "chevron-left" },
  close: { mi: "close" },
  plus: { mi: "add" },
  minus: { mi: "remove" },
  check: { mi: "check" },
  checkCircle: { mi: "check-circle" },
  alert: { mi: "error" },
  info: { mi: "info" },
  mapPin: { mi: "place" },
  navigation: { mi: "navigation" },
  truck: { mi: "local-shipping" },
  clock: { mi: "schedule" },
  shield: { mi: "shield" },
  shieldCheck: { mi: "verified-user" },
  lock: { mi: "lock" },
  key: { mi: "vpn-key" },
  smartphone: { mi: "smartphone" },
  bell: { mi: "notifications" },
  bellOff: { mi: "notifications-off" },
  creditCard: { mi: "credit-card" },
  users: { mi: "people" },
  userPlus: { mi: "person-add" },
  fileText: { mi: "description" },
  clipboard: { mi: "assignment" },
  droplet: { mi: "water-drop" },
  heart: { mi: "favorite" },
  activity: { mi: "monitor-heart" },
  zap: { mi: "bolt" },
  wifi: { mi: "wifi" },
  wifiOff: { mi: "wifi-off" },
  phone: { mi: "phone" },
  phoneCall: { mi: "phone-in-talk" },
  phoneOff: { mi: "call-end" },
  video: { mi: "videocam" },
  videoOff: { mi: "videocam-off" },
  mic: { mi: "mic" },
  micOff: { mi: "mic-off" },
  camera: { mi: "photo-camera" },
  image: { mi: "image" },
  download: { mi: "file-download" },
  upload: { mi: "file-upload" },
  refresh: { mi: "refresh" },
  trash: { mi: "delete" },
  logOut: { mi: "logout" },
  eye: { mi: "visibility" },
  eyeOff: { mi: "visibility-off" },
  star: { mi: "star" },
  sparkle: { mi: "auto-awesome" },
  sparkles: { mi: "auto-awesome" },
  smile: { mi: "sentiment-satisfied" },
  gift: { mi: "card-giftcard" },
  message: { mi: "chat-bubble" },
  help: { mi: "help" },
  list: { mi: "list" },
  grid: { mi: "grid-view" },
  filter: { mi: "filter-list" },
  arrowUp: { mi: "arrow-upward" },
  arrowDown: { mi: "arrow-downward" },
  arrowRight: { mi: "arrow-forward" },
  arrowLeft: { mi: "arrow-back" },
  externalLink: { mi: "open-in-new" },
  edit: { mi: "edit" },
  copy: { mi: "content-copy" },
  sun: { mi: "light-mode" },
  moon: { mi: "dark-mode" },
  globe: { mi: "public" },
  mail: { mi: "email" },
  package: { mi: "inventory-2" },
  anchor: { mi: "anchor" },
  Compass: { mi: "explore" },
  compass: { mi: "explore" },
  tooth: { mci: "tooth" },
  pill: { mi: "medication" },
  stethoscope: { mci: "stethoscope" },
  syringe: { mci: "needle" },
  notes: { mi: "sticky-note-2" },
  userCheck: { mi: "how-to-reg" },
  tag: { mi: "local-offer" },
  receipt: { mi: "receipt-long" },
  more: { mi: "more-horiz" },
  link: { mi: "link" },
  history: { mi: "history" },
  campaign: { mi: "campaign" },
  badge: { mi: "badge" },
} as const satisfies Record<string, Glyph>;

export type AppIconName = keyof typeof GLYPHS;

export interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle | TextStyle>;
}

/**
 * AppIcon — semantic icon primitive. Renders the filled Material glyph for
 * a semantic name; unknown names fall back to the alert glyph.
 */
export function AppIcon({
  name,
  size = 20,
  color = colors.label,
  style,
}: AppIconProps) {
  const glyph: Glyph = GLYPHS[name] ?? GLYPHS.alert;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        },
        style as StyleProp<ViewStyle>,
      ]}
    >
      {"mi" in glyph ? (
        <MaterialIcons name={glyph.mi} size={size} color={color} />
      ) : (
        <MaterialCommunityIcons name={glyph.mci} size={size} color={color} />
      )}
    </View>
  );
}
