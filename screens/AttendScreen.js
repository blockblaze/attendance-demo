import "react-native-get-random-values";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { io } from "socket.io-client";
import Barcode from "@kichiyaki/react-native-barcode-generator";
import * as Network from "expo-network";
import * as SecureStore from "expo-secure-store";
import { signJWT } from "../jwt";

const SECRET = "123";
const PORT = 3000;

export default function AttendScreen({ setIsAuth }) {
  const [user, setUser] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [avatarUri, setAvatarUri] = useState(null);

  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  const [token, setToken] = useState(null);
  const [timer, setTimer] = useState(0);
  const [scanned, setScanned] = useState(false);

  const [serverUrl, setServerUrl] = useState(null);
  const [searching, setSearching] = useState(false);
  const [serverName, setServerName] = useState(null);

  // ✅ Load user data from SecureStore
  useEffect(() => {
    const loadUser = async () => {
      const raw = await SecureStore.getItemAsync("user_token");
      if (!raw) return logout();

      const parsed = JSON.parse(raw);

      setUser(parsed);
      setStudentId(parsed.id);
      setAvatarUri(parsed['profile_image_url'] || null);
    };
    loadUser();
  }, []);

  // ✅ Auto-disconnect on unmount
  useEffect(() => {
    return () => socketRef.current?.disconnect();
  }, []);

  // ✅ Discover local server once at startup
  const discoverServer = async () => {
    setSearching(true);
    try {
      const ip = await Network.getIpAddressAsync();
      const subnet = ip.split(".").slice(0, 3).join(".");

      for (let i = 1; i <= 254; i++) {
        const target = `http://${subnet}.${i}:${PORT}/discovery`;

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 350);

          const res = await fetch(target, { signal: controller.signal });
          clearTimeout(timeout);

          const json = await res.json();
          if (json.ok) {
            console.log(json)
            setServerUrl(`http://${subnet}.${i}:${PORT}`);
            setServerName(json.name || `http://${subnet}.${i}:${PORT}`);
            setSearching(false);
            return;
          }
        } catch (_) {}
      }

      Alert.alert("Server Not Found", "Ensure server + phone are on the same Wi-Fi.");
    } catch (e) {
      Alert.alert("Network Error", e.message);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    discoverServer();
  }, []);

  // ✅ Global countdown timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }

    if (timer === 0 && token) {
      setToken(null);
      Alert.alert("Expired", "QR attendance expired. Start again.");
    }
  }, [timer]);

  // ✅ Start Attendance Flow
  const startAttendance = () => {
    if (!studentId) return Alert.alert("Missing ID", "User ID was not loaded.");
    if (!serverUrl)
      return Alert.alert("Server Offline", "Waiting for local server discovery...");

    const sock = io(serverUrl, { transports: ["websocket"] });

    socketRef.current = sock;
    setSocket(sock);
    setToken(null);
    setScanned(false);

    sock.emit("start_challenge");

    // Avoid duplicate listeners
    sock.removeAllListeners();

    // ✅ Server sends challenge token
    sock.on("challenge", async (data) => {
      if (!data.active) {
        Alert.alert("No Active Session", "Teacher did not start attendance yet.");
        sock.disconnect();
        return;
      }

      try {
        const payload = {
          userId: studentId,
          token: data.token,
          exp: Math.floor(Date.now() / 1000) + 300, // 5 mins
        };

        const signed = signJWT(payload, SECRET);
        sock.emit("submit_challenge", signed);
      } catch (err) {
        Alert.alert("Signing Error", err.message);
      }
    });

    // ✅ Success → generate QR barcode
    sock.on("success", (data) => {
      console.log(data.token);
      if(data.reason) return Alert.alert(data.reason);
      setToken(data.token);
      setTimer(300);
    });

    // ✅ Attendance scanned by teacher
    sock.on("scan_success", () => {
      setToken(null);
      setScanned(true);
    });

    sock.on("challenge_error", (err) => {
      Alert.alert("Server Error", JSON.stringify(err));
    });
  };

  // ✅ Logout clears SecureStore + go back to LoginScreen
  const logout = async () => {
    await SecureStore.deleteItemAsync("user_token");
    setIsAuth(false); // go back to login
  };

  // ✅ Timer formatting
  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  if (!user)
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4f8ef7" />
        <Text style={{ color: "#9db0c8", marginTop: 8 }}>Loading user…</Text>
      </View>
    );

  return (
    <View style={styles.container}>


      {/* ✅ HEADER */}
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
      <TouchableOpacity onPress={startAttendance} style={styles.button}>
        <Text style={styles.buttonText}>Start Attendance</Text>
      </TouchableOpacity>
)}

      {/* ✅ ATTENDANCE CARD */}
      <View style={styles.card}>
        {token && (
<View style={styles.barcodeWrapper}>
  <View style={styles.barcodeInner}>
    <Barcode
      value={token.toString()}
      format="CODE128"
      options={{
        width: 2.4,        // سماكة الخط
        height: 90,        // ارتفاع أفضل للماسح
        background: "#FFFFFF", // خلفية بيضاء صريحة
        lineColor: "#000000",  // خطوط سوداء فاحمة
        margin: 20,        // Quiet zone كبيرة
      }}
    />
  </View>

  <Text style={styles.timerText}>{formatTime(timer)}</Text>
</View>

        )}

        {!token && !scanned && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No active barcode. Press Start Attendance.
            </Text>
          </View>
        )}

        {scanned && (
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>

        )}
      </View>

      {/* ✅ Server discovery indicator */}
      {searching && (
        <View style={styles.searchBox}>
          <ActivityIndicator color="#4f8ef7" />
          <Text style={styles.searchText}>Scanning local network…</Text>
        </View>
      )}

      {serverUrl && (
        <Text style={styles.connectedText}>Connected to {serverName}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#050c1f", padding: 20 },
  backBtn: { position: "absolute", top: 50, left: 20, padding: 10, zIndex: 5 },
  backText: { color: "#9db0c8", fontSize: 16, fontWeight: "600" },

  header: { marginTop: 70, alignItems: "center" },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#0b1f3b",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarInitials: { color: "#4f8ef7", fontSize: 28, fontWeight: "700" },

  name: { color: "#fff", fontSize: 24, fontWeight: "700" },
  idText: { color: "#8ca7d4", fontSize: 14 },

  button: {
    backgroundColor: "#1d4ed8",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },

  card: {
    marginTop: 35,
    backgroundColor: "#0a1435",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },

  barcodeWrapper: { width: "100%", alignItems: "center" },
  checkCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#1e40af",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  checkMark: { color: "#fff", fontSize: 30, fontWeight: "700" },

barcodeInner: {
  backgroundColor: "#FFFFFF",   // خلفية الباركود
  paddingVertical: 20,          // زيادة quiet zone
  paddingHorizontal: 24,
  borderRadius: 4,              // بسيط جدًا
  marginBottom: 12,
  width: "100%",
  alignItems: "center",
},


  timerText: { color: "#fff", fontSize: 34, fontWeight: "700" },

  emptyBox: { padding: 25, alignItems: "center" },
  emptyText: { color: "#8ca7d4", fontSize: 15 },

  successBox: {
    backgroundColor: "#22c55e",
    padding: 18,
    borderRadius: 12,
    marginTop: 15,
  },
  successText: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  searchBox: { alignItems: "center", marginTop: 20 },
  searchText: { color: "#9db0c8", marginTop: 8 },

  connectedText: {
    color: "#4ade80",
    textAlign: "center",
    marginTop: 15,
  },
});
