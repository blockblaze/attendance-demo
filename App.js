// App.js
import React, { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import LoginScreen from "./screens/LoginScreen";
import AttendScreen from "./screens/AttendScreen";

// Keep splash visible
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [isAuth, setIsAuth] = useState(null);

  useEffect(() => {
    async function prepare() {
      try {
        // Simulate app loading delay (2 seconds)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check auth
        const token = await SecureStore.getItemAsync("user_token");
        setIsAuth(!!token);
      } catch (e) {
        console.log("Startup error:", e);
      } finally {
        setIsReady(true);
        SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    // While splash is showing → render nothing
    return null;
  }

  return isAuth ? (
    <AttendScreen auth={isAuth} />
  ) : (
    <LoginScreen setIsAuth={setIsAuth} />
  );
}