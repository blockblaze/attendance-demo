import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function LoginScreen() {
  const passwordAnim = useRef(new Animated.Value(0)).current;
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailSubmit = () => {
    setShowPassword(true);

    Animated.timing(passwordAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#03050A" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        {}
        <LinearGradient
          colors={["#03050A", "#050A14", "#081427"]}
          style={styles.background}
        />

        {}
        <View style={styles.softLight1} />
        <View style={styles.softLight2} />

        {}
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Attendly System</Text>
          <Text style={styles.title}>Student Login</Text>
          <Text style={styles.subtitle}>Access your class dashboard</Text>
        </View>

        {}
        <View style={styles.card}>
          <Text style={styles.label}>Email / Phone</Text>

          <TextInput
            style={styles.input}
            placeholder="Email/phone"
            placeholderTextColor="rgba(255,255,255,0.45)"
            returnKeyType="next"
            onSubmitEditing={handleEmailSubmit}
          />

          {}
          {showPassword && (
            <Animated.View
              style={{
                opacity: passwordAnim,
                transform: [
                  {
                    translateY: passwordAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0], // slide up
                    }),
                  },
                ],
              }}
            >
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Your password"
                secureTextEntry
                placeholderTextColor="rgba(255,255,255,0.45)"
              />
            </Animated.View>
          )}

          <TouchableOpacity activeOpacity={0.85}>
            <LinearGradient
              colors={["#0A1733", "#112650", "#1A3870"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.loginBtn}
            >
              <Text style={styles.loginText}>Join Class</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.links}>
            <Text style={styles.link}>Need help? Contact your teacher</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    position: "absolute",
    width: "100%",
    height: "100%",
  },

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  softLight1: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 320,
    backgroundColor: "#0D1B2E",
    opacity: 0.15,
    top: -90,
    right: -120,
  },
  softLight2: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: "#1B2E5A",
    opacity: 0.07,
    bottom: -80,
    left: -90,
  },

  headerContainer: {
    alignItems: "center",
    marginBottom: 38,
  },

  header: {
    color: "rgba(200,210,255,0.45)",
    fontSize: 14,
    letterSpacing: 1.3,
    fontWeight: "500",
  },

  title: {
    color: "#E8ECFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
    letterSpacing: 1,
  },

  subtitle: {
    color: "rgba(220,225,255,0.55)",
    fontSize: 15,
    marginTop: 6,
  },

  card: {
    width: "86%",
    padding: 30,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
  },

  label: {
    color: "#E3E7F0",
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.5,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 15,
    borderRadius: 14,
    color: "#FFF",
    marginBottom: 20,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  loginBtn: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#1A3870",
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },

  loginText: {
    color: "#EEF2FF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },

  links: {
    marginTop: 25,
    alignItems: "center",
  },

  link: {
    color: "rgba(200,210,255,0.6)",
    fontSize: 13,
  },
}); 