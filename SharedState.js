// src/SharedState.js
import React, { createContext, useContext, useRef, useState } from "react";

const SharedStateContext = createContext(null);

export function SharedStateProvider({ children }) {
  const [signedToken, setSignedToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [serverName, setServerName] = useState("Local Server");

  const [user, setUser] = useState(null)

  const [classwork, setClasswork] = useState(null);   // ← Full classwork object for quiz

  const sockRef = useRef(null);
  // Add this state
const [socket, setSocket] = useState(null);

// Update setSock to also update the state
const setSock = (sock) => {
  sockRef.current = sock;
  setSocket(sock);           // ← add this
  setIsSockReady(Boolean(sock));
};
  const [isSockReady, setIsSockReady] = useState(false);

  return (
    <SharedStateContext.Provider
      value={{
  user, setUser,
  signedToken, setSignedToken,
  serverUrl, setServerUrl,
  serverName, setServerName,

  socket,           // ← live socket instance
  sockRef,          // ← keep ref if you still need it somewhere
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