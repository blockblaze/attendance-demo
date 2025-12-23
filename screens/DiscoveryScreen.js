// screens/DiscoveryScreen.js
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { io } from "socket.io-client";
import * as Network from "expo-network";
import * as SecureStore from "expo-secure-store";
import { signJWT } from "../jwt";
import { useSharedState } from "../SharedState";

const SECRET = "123";
const PORT = 3000;

export default function DiscoveryScreen({ navigate, setIsAuth }) {
  const [loadingText, setLoadingText] = useState("Loading user...");

  const {
    setSignedToken,
    setSock,
    sockRef,
    setServerUrl,
    setServerName,
    setUser,
    user
  } = useSharedState();

  const scanRetryRef = useRef(null);
  const alreadyStartedRef = useRef(false);

  // Load user once
useEffect(() => {
  const loadUser = async () => {
    const raw = await SecureStore.getItemAsync("user_token");
    if (!raw) {
      setIsAuth(false);
      return;
    }
    const parsedUser = JSON.parse(raw);
    setUser(parsedUser);  // ← This stores it globally
  };
  loadUser();

  return () => {
    if (scanRetryRef.current) clearTimeout(scanRetryRef.current);
  };
}, [setIsAuth, setUser]);   // ← include setUser in deps

  // Start discovery only once
  useEffect(() => {
    if (!user) return;
    if (alreadyStartedRef.current) return;

    alreadyStartedRef.current = true;
    discoverServer();

    return () => {
      if (scanRetryRef.current) clearTimeout(scanRetryRef.current);
    };
  }, [user]);

  // ------------------------------
  // Network Scanning
  // ------------------------------
  const discoverServer = async () => {
    setLoadingText("Scanning network for server...");

    try {
      const ip = await Network.getIpAddressAsync();
      const subnet = ip.split(".").slice(0, 3).join(".");

      let found = null;
      for (let i = 1; i <= 254; i++) {
        const url = `http://${subnet}.${i}:${PORT}/api/discovery`;

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 300);

          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);

          const json = await res.json();
          
          if (json.ok) {
            found = `http://${subnet}.${i}:${PORT}`;
            setServerName(json.name)
            break;
          }
        } catch (_) {}
      }

      if (!found) {
        setLoadingText("Server not found. Retrying in 4s...");
        scanRetryRef.current = setTimeout(discoverServer, 4000);
        return;
      }

      setServerUrl(found);
      connectSocket(found);

    } catch (err) {
      setLoadingText("Network error. Retrying...");
      scanRetryRef.current = setTimeout(discoverServer, 4000);
    }
  };

  // ------------------------------
  // Socket Connection Logic
  // ------------------------------
  const connectSocket = (serverUrl) => {
    setLoadingText("Connecting to server...");

    // If socket already exists, reuse it
    if (sockRef.current) {
      console.log("Reusing existing socket");
      setupSocketEvents(sockRef.current);
      return;
    }

    const sock = io(serverUrl, { transports: ["websocket"] });
    setSock(sock); // persists globally
    
    setupSocketEvents(sock);
  };

  const setupSocketEvents = (sock) => {

    sock.on("connect", () => {
      setLoadingText("Connected. Requesting challenge...");
      sock.emit("start_challenge");
    });

    sock.on("connect_error", (err) => {
      Alert.alert("Connection Error", err.message);
      setLoadingText("Retrying connection in 4s...");
      sock.disconnect();
      setSock(null);
      scanRetryRef.current = setTimeout(discoverServer, 4000);
    });

    sock.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      // Keep sockRef null so screens know it's disconnected
      setSock(null);
    });

    // ------------------------------
    // Authentication Challenge
    // ------------------------------
    sock.on("challenge", async (data) => {
      if (!data.active) {
        Alert.alert("No Active Session", "No session is currently open.");
        navigate("Attend");
        return;
      }

      if (!user) return;

      try {
        const payload = {
          userId: user.id,
          token: data.token,
          exp: Math.floor(Date.now() / 1000) + 3600*3,
        };

        const signedToken = signJWT(payload, SECRET);
        setSignedToken(signedToken);

        sock.emit("join_attended_session", signedToken);
        setLoadingText("Authenticating...");
      } catch (err) {
        Alert.alert("Auth Error", err.message);
        sock.disconnect();
        setSock(null);
      }
    });

    sock.on("join_error", (data) => {
      navigate("Attend");
    });

    sock.on("join_success", () => {
      navigate("Session"); // Session screen will use sockRef.current
    });
  };

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#4f8ef7" />
      <Text style={styles.text}>{loadingText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050c1f",
  },
  text: {
    color: "#9db0c8",
    marginTop: 15,
    fontSize: 16,
  },
});
