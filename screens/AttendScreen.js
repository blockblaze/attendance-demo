// screens/AttendScreen.js
import "react-native-get-random-values";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import Barcode from "@kichiyaki/react-native-barcode-generator";
import { useSharedState } from "../SharedState";
import { signJWT } from "../jwt";   // ← You need this!

const SECRET = "123";   // ← Make sure this matches your server!

export default function AttendScreen({ navigate }) {
  const {
    user,
    socket,
    signedToken,        // ← not used here, but kept if needed later
    serverUrl,
    serverName = "Local Server",
    isSockReady,
    setUser,
    setSock,
  } = useSharedState();


  const studentId = user?.id;
  const avatarUri = user?.profile_image_url || null;

  const [token, setToken] = useState(null);
  const [timer, setTimer] = useState(0);
  const [scanned, setScanned] = useState(false);

  // Timer logic
  useEffect(() => {
    if (timer > 0) {
      const id = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(id);
    }
    if (timer === 0 && token) {
      setToken(null);
      setScanned(false);
      Alert.alert("Expired", "QR code expired. Try again.");
    }
  }, [timer, token]);

  const startAttendance = () => {
    if (!user || !studentId) {
      return Alert.alert("Error", "User not loaded.");
    }

    if (!socket || !isSockReady) {
      return Alert.alert("Not Connected", "Still connecting to server...");
    }

    // Clean only the events this screen uses
    socket.removeAllListeners("challenge");
    socket.removeAllListeners("success");
    socket.removeAllListeners("scan_success");
    socket.removeAllListeners("challenge_error");

    setToken(null);
    setScanned(false);
    setTimer(0);

    // Start the old flow — exactly like your working version
    socket.emit("start_challenge");

    socket.on("challenge", async (data) => {
      if (!data.active) {
        Alert.alert("No Session", "Teacher has not started attendance yet.");
        return;
      }

      try {
        const payload = {
          userId: studentId,
          token: data.token,
          exp: Math.floor(Date.now() / 1000) + 300,
        };
        const signed = signJWT(payload, SECRET);
        socket.emit("submit_challenge", signed);
      } catch (err) {
        Alert.alert("Error", "Failed to sign challenge");
      }
    });

    socket.on("success", (data) => {
      if (data.reason) {
        Alert.alert("Failed", data.reason);
        return;
      }
      console.log("QR Token received:", data.token);
      setToken(data.token);
      setTimer(300);
    });

    socket.on("scan_success", () => {
      setToken(null);
      setScanned(true);
      navigate("Session");
    });

    socket.on("challenge_error", (err) => {
      Alert.alert("Server Error", err.message || JSON.stringify(err));
    });
  };

  const formatTime = (t) => {
    const m = Math.floor(t / 60).toString().padStart(2, "0");
    const s = (t % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isConnected = isSockReady && !!serverUrl;

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f8ef7" />
        <Text style={{ color: "#9db0c8", marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>
              {user.name?.slice(0, 2).toUpperCase() || "ST"}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.idText}>ID: {studentId}</Text>
      </View>

      {!token && !scanned && (
        <TouchableOpacity
          onPress={startAttendance}
          style={[styles.button, !isConnected && styles.buttonDisabled]}
          disabled={!isConnected}
        >
          <Text style={styles.buttonText}>
            {isConnected ? "Start Attendance" : "Connecting..."}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        {token && (
          <View style={styles.barcodeWrapper}>
            <View style={styles.barcodeInner}>
              <Barcode
                value={token.toString()}
                format="CODE128"
                options={{
                  width: 2.6,
                  height: 100,
                  background: "#FFFFFF",
                  lineColor: "#000000",
                  margin: 20,
                }}
              />
            </View>
            <Text style={styles.timerText}>{formatTime(timer)}</Text>
          </View>
        )}

        {!token && !scanned && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {isConnected
                ? "Press button to start attendance"
                : "Connecting to server..."}
            </Text>
          </View>
        )}

        {scanned && (
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>Check</Text>
            <Text style={{ color: "#fff", marginTop: 12 }}>Attendance Recorded</Text>
          </View>
        )}
      </View>

      {!isConnected && (
        <TouchableOpacity
          style={styles.searchBox}
          onPress={() => navigate("Discovery")}
        >
          <ActivityIndicator color="#f78e4f" />
          <Text style={styles.searchText}>Server lost. Tap to reconnect.</Text>
        </TouchableOpacity>
      )}

      {isConnected && (
        <Text style={styles.connectedText}>Connected to {serverName}</Text>
      )}
    </View>
  );
}

// Your styles (keep as-is)
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#050c1f" },
  container: { flex: 1, backgroundColor: "#050c1f", padding: 20 },
  header: { marginTop: 70, alignItems: "center" },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#0b1f3b", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarInitials: { color: "#4f8ef7", fontSize: 28, fontWeight: "700" },
  name: { color: "#fff", fontSize: 24, fontWeight: "700" },
  idText: { color: "#8ca7d4", fontSize: 14, marginTop: 4 },
  button: { backgroundColor: "#1d4ed8", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 24 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  card: { marginTop: 35, backgroundColor: "#0a1435", borderRadius: 16, padding: 24, alignItems: "center" },
  barcodeWrapper: { width: "100%", alignItems: "center" },
  barcodeInner: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 8, marginBottom: 16, width: "100%", alignItems: "center" },
  timerText: { color: "#fff", fontSize: 36, fontWeight: "700" },
  emptyBox: { padding: 30, alignItems: "center" },
  emptyText: { color: "#8ca7d4", fontSize: 16, textAlign: "center" },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#22c55e", justifyContent: "center", alignItems: "center" },
  checkMark: { color: "#fff", fontSize: 48, fontWeight: "700" },
  searchBox: { alignItems: "center", marginTop: 24, padding: 16 },
  searchText: { color: "#fdb787", marginTop: 8, textAlign: "center" },
  connectedText: { color: "#4ade80", textAlign: "center", marginTop: 16, fontSize: 15 },
});