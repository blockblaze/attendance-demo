// App.js
import React, { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import LoginScreen from "./screens/LoginScreen";
import DiscoveryScreen from "./screens/DiscoveryScreen";
import AttendScreen from "./screens/AttendScreen";
import { Text, View } from "react-native";
import { SharedStateProvider } from "./SharedState";  // ← Import here
import SessionScreen from "./screens/SessionScreen";
import ClassworkScreen from "./screens/ClassworkScreen";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState("Loading");

  useEffect(() => {
    async function prepare() {
      await new Promise(r => setTimeout(r, 2000));
      const token = await SecureStore.getItemAsync("user_token");
      setCurrentScreen(token ? "Discovery" : "Login");
      setIsReady(true);
      await SplashScreen.hideAsync();
    }
    prepare();
  }, []);

  const navigate = (screenName) => setCurrentScreen(screenName);

  if (!isReady) return null;

  return (
    <SharedStateProvider>   {/* ← Provider moved here */}
      <View style={{ flex: 1 }}>
        {currentScreen === "Login" && (
          <LoginScreen setIsAuth={() => navigate("Discovery")} />
        )}

        {currentScreen === "Discovery" && (
          <DiscoveryScreen
            setIsAuth={() => navigate("Login")}
            navigate={navigate}
          />
        )}

        {currentScreen === "Attend" && (
          <AttendScreen navigate={navigate} />
        )}

        {currentScreen === "Session" && (
          <SessionScreen navigate={navigate} />
        )}
          {currentScreen === "Classwork" && (
          <ClassworkScreen navigate={navigate} />
        )}
      </View>
    </SharedStateProvider>
  );
}