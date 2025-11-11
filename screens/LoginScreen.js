// screens/LoginScreen.js
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";

export default function LoginScreen({ setIsAuth }) {
  const passwordAnim = useRef(new Animated.Value(0)).current;

  const [showPasswordField, setShowPasswordField] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = () => {
    if (!email.trim()) {
      alert("Please enter your email or phone first");
      return;
    }

    setShowPasswordField(true);

    Animated.timing(passwordAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "https://attendly-server-production.up.railway.app/api/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      const data = await response.json();

      if (data.error) {
        alert(data.error || "Invalid credentials");
        return;
      }

      // ✅ Save whole response into SecureStore
      await SecureStore.setItemAsync("user_token", JSON.stringify(data));

      // ✅ Notify App.js to switch screen immediately
      setIsAuth(true);

    } catch (error) {
      console.log("Login error", error);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#050c1f" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <LinearGradient
          colors={["#050c1f", "#08142e", "#0a1b3f"]}
          style={styles.background}
        />

        <View style={styles.softLight1} />
        <View style={styles.softLight2} />

        <View style={styles.headerContainer}>
          <Text style={styles.header}>Attendly-System</Text>
          <Text style={styles.title}>Student Login</Text>
          <Text style={styles.subtitle}>Access your class</Text>
        </View>

        <View style={styles.card}>
          {/* EMAIL */}
          <Text style={styles.label}>Email / Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email or phone"
            placeholderTextColor="rgba(217, 235, 216, 0.35)"
            returnKeyType="next"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={handleEmailSubmit}
          />

          {/* PASSWORD (animated) */}
          {showPasswordField && (
            <Animated.View
              style={{
                opacity: passwordAnim,
                transform: [
                  {
                    translateY: passwordAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              }}
            >
              <Text style={styles.label}>Password</Text>

              <View style={{ position: "relative" }}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  secureTextEntry={!passwordVisible}
                  value={password}
                  onChangeText={setPassword}
                />

                {/* SHOW / HIDE PASSWORD */}
                <TouchableOpacity
                  style={styles.showPassBtn}
                  onPress={() => setPasswordVisible((p) => !p)}
                >
                  <Text style={{ color: "#cdd6ff" }}>
                    {passwordVisible ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* LOGIN BUTTON */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={
                loading
                  ? ["#1e3a8a", "#1e40af", "#1e3a8a"]
                  : ["#1d4ed8", "#2563eb", "#3b82f6"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.loginBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginText}>Join Class</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.links}>
            <Text style={styles.link}>Need help? Contact support</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, position: "absolute", width: "100%", height: "100%" },
  container: { flex: 1, justifyContent: "center", alignItems: "center" },

  softLight1: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 340,
    backgroundColor: "#0b1f3b",
    opacity: 0.15,
    top: -90,
    right: -120,
  },
  softLight2: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 300,
    backgroundColor: "#1b2e5a",
    opacity: 0.08,
    bottom: -90,
    left: -100,
  },

  headerContainer: { alignItems: "center", marginBottom: 38 },
  header: {
    color: "rgba(147,167,226,0.5)",
    fontSize: 14,
    letterSpacing: 1.3,
    fontWeight: "500",
  },
  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
    letterSpacing: 1,
  },
  subtitle: {
    color: "rgba(190,210,255,0.55)",
    fontSize: 15,
    marginTop: 6,
  },

  card: {
    width: "86%",
    padding: 28,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  label: {
    color: "#e3e7f0",
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 15,
    borderRadius: 14,
    color: "#fff",
    marginBottom: 20,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  showPassBtn: {
    position: "absolute",
    right: 14,
    top: 18,
  },

  loginBtn: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 18,
    shadowColor: "#2563eb",
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  loginText: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 1 },

  links: { marginTop: 25, alignItems: "center" },
  link: { color: "rgba(170,190,255,0.6)", fontSize: 13 },
});
