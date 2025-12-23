// src/SharedState.js
import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import { AppState } from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import Toast from "react-native-toast-message";

const SharedStateContext = createContext(null);

export function SharedStateProvider({ children }) {
  // ──────────────────────────────────────────────────────
  // Your existing states
  // ──────────────────────────────────────────────────────
  const [signedToken, setSignedToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [serverName, setServerName] = useState("Local Server");
  const [user, setUser] = useState(null);
  const [classwork, setClasswork] = useState(null);
  


  // Socket management
  const sockRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isSockReady, setIsSockReady] = useState(false);
  const wentBackgroundRef = useRef(false);

  const setSock = (sock) => {
    sockRef.current = sock;
    setSocket(sock);
    setIsSockReady(Boolean(sock));
  };

  // ──────────────────────────────────────────────────────
  // Prevent sleep + simple one-time warning
  // ──────────────────────────────────────────────────────
  const [hasShownWarning, setHasShownWarning] = useState(false);

  useEffect(() => {
    // Keep screen awake as long as app is open
    activateKeepAwakeAsync();

    // Cleanup: allow sleep when app unmounts (rare, but good practice)
    return () => {
      deactivateKeepAwake();
    };
  }, []);

useEffect(() => {
  const handleAppStateChange = (nextAppState) => {
    // App going away
    if (nextAppState === "inactive" || nextAppState === "background") {
      wentBackgroundRef.current = true;

      if (socket) {
        socket.disconnect();
        setSock(null);
      }
    }

    // App coming back
    if (nextAppState === "active" && wentBackgroundRef.current) {
      wentBackgroundRef.current = false;
      Toast.show({
        type: "error",
        text1: "Warning",
        text2: "Leaving the app is not recommended.",
        position: "bottom",
        visibilityTime: 3000,
      });
    }
  };

  const sub = AppState.addEventListener("change", handleAppStateChange);
  return () => sub.remove();
}, [socket]);
  return (
    <SharedStateContext.Provider
      value={{
        user,
        setUser,
        signedToken,
        setSignedToken,
        serverUrl,
        setServerUrl,
        serverName,
        setServerName,
        socket,
        sockRef,
        setSock,
        isSockReady,
        classwork,
        setClasswork,
      }}
    >
      {children}
    </SharedStateContext.Provider>
  );
}

export function useSharedState() {
  const ctx = useContext(SharedStateContext);
  if (!ctx) throw new Error("useSharedState must be used inside SharedStateProvider");
  return ctx;
}