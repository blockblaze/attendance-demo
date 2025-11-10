import React, { useState } from "react";
import LoginScreen from "./screens/LoginScreen";
import AttendScreen from "./screens/AttendScreen";

export default function App() {
  const [screen, setScreen] = useState("login"); 

  const goToAttend = () => setScreen("attend");
  const goToLogin = () => setScreen("login");

  return screen === "login" ? (
    <LoginScreen goToAttend={goToAttend} />
  ) : (
    <AttendScreen goToLogin={goToLogin} />
  );
}

