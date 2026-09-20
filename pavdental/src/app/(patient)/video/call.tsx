import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { DailyVideoView } from "@/components";

export default function VideoCallScreen() {
  const router = useRouter();

  const handleEndCall = () => {
    router.replace("/(patient)/video/summary" as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <DailyVideoView
        roomUrl="https://pavdental.daily.co/pav-consult-room"
        userName="Patient Consultation"
        onLeaveCall={handleEndCall}
      />
    </SafeAreaView>
  );
}

