// App.js
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import LoginScreen from "./screens/LoginScreen";
import AttendScreen from "./screens/AttendScreen";

export default function App() {
  const [isAuth, setIsAuth] = useState(null); // null أثناء التحميل
  const [loading, setLoading] = useState(true);

  // التحقق من وجود مفاتيح الدخول
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("user_token");
        setIsAuth(!!token); // true لو فيه token
      } catch (error) {
        console.log("Error checking auth:", error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0066ff" />
      </View>
    );
  }

  return isAuth ? <AttendScreen /> : <LoginScreen />;
}