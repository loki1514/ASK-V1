import React from "react";
import { Tabs, usePathname } from "expo-router";
import { TabBar } from "@/components/TabBar";

function activeKeyFor(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment === "home" || segment === "ask" || segment === "activity" || segment === "agents" || segment === "you") return segment;
  return "home";
}

export default function TabsLayout() {
  const pathname = usePathname();
  const activeKey = activeKeyFor(pathname);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar activeKey={activeKey} navigation={props.navigation} />}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="ask" options={{ title: "Ask" }} />
      <Tabs.Screen name="activity" options={{ title: "Activity" }} />
      <Tabs.Screen name="agents" options={{ title: "Agents" }} />
      <Tabs.Screen name="you" options={{ title: "You" }} />
    </Tabs>
  );
}
