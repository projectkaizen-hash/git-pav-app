import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { colors } from "@/theme";
import { AppIcon, type AppIconName } from "@/components";

// ─── Patient tab shell — 5 destinations, pill-active icons ────────────────────
// Reference pattern: active tab gets a soft pill behind the icon (works for
// colour-blind users — state is never colour-only). Labels always visible.

function TabIcon({ name, focused }: { name: AppIconName; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <AppIcon
        name={name}
        size={18}
        color={focused ? colors.ink : colors.secondaryLabel}
      />
    </View>
  );
}

export default function PatientTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.systemBackground,
        },
        headerTitleStyle: {
          color: colors.label,
          fontWeight: "700",
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.systemBackground,
          borderTopColor: colors.separator,
        },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.secondaryLabel,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Appointments",
          tabBarLabel: "Bookings",
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: "Dental Records",
          tabBarLabel: "Records",
          tabBarIcon: ({ focused }) => <TabIcon name="records" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarLabel: "Messages",
          tabBarIcon: ({ focused }) => <TabIcon name="message" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile & Settings",
          tabBarLabel: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 28,
    minWidth: 44,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  iconWrapActive: {
    backgroundColor: colors.inkSubtle,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});
