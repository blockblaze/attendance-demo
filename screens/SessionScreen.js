// screens/SessionScreen.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/Feather";
import { useSharedState } from "../SharedState";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PANEL_WIDTH = SCREEN_WIDTH * 0.97;

export default function SessionScreen({ navigate }) {
  const {
    serverUrl,
    signedToken,
    socket,
    serverName = "Session",
    isSockReady,
    setClasswork,
  } = useSharedState();
  const [classworks, setClassworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWork, setSelectedWork] = useState(null);
  console.log(signedToken)
  const panelAnim = React.useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Fetch classworks from API
  const fetchClassworks = useCallback(async () => {
    if (!serverUrl || !signedToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${serverUrl}/api/v1/session/active/student/classwork`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "student-token": signedToken,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !Array.isArray(result.data)) {
        throw new Error("Invalid response format");
      }
      result.data.reverse();
      // Transform backend format → our internal format
      const formatted = result.data.map(item => {
        const classworkObj = item.classwork || {
          id: item.taken_data?.id || Date.now(),
          title: item.taken_data?.title || "Unknown Classwork",
          duration: item.taken_data?.duration || 3600,
          full_mark: item.taken_data?.fullMark || 100,
          created_at: new Date().toISOString(),
        };

        return {
          classwork: classworkObj,
          status: item.status,
          taken_data: item.taken_data,
        };
      });

      setClassworks(formatted);
    } catch (err) {
      console.error("Fetch classworks failed:", err);
      setError("Failed to load classworks. Pull to retry.");
    } finally {
      setLoading(false);
    }
  }, [serverUrl, signedToken]);

  useEffect(() => {
    fetchClassworks();
  }, [fetchClassworks]);

  // Real-time new classwork
  useEffect(() => {
    if (!socket || !isSockReady) return;

    const handleNewClasswork = (newCw) => {
        console.log("hhhhhhhhhhhh",newCw)
      console.log("New classwork via socket:", newCw);

      const formatted = {
        classwork: {
          id: newCw.id,
          title: newCw.title,
          duration: newCw.duration || 3600,
          full_mark: newCw.fullMark || 100,
          created_at: newCw.created_at || new Date().toISOString(),
        },
        status: "not_taken",
        taken_data: null,
      };

      setClassworks(prev => {
        const exists = prev.some(p => p.classwork.id === formatted.classwork.id);
        if (exists) return prev;
        return [formatted, ...prev];
      });
    };

    socket.on("classwork", handleNewClasswork);
    return () => socket.off("classwork", handleNewClasswork);
  }, [socket, isSockReady]);

  // Panel
  const openPanel = useCallback((work) => {
    setSelectedWork(work);
    Animated.timing(panelAnim, {
      toValue: SCREEN_WIDTH - PANEL_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const closePanel = useCallback(() => {
    Animated.timing(panelAnim, {
      toValue: SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setSelectedWork(null));
  }, []);

  // Start classwork
  const handleStartClasswork = async () => {
    if (!selectedWork) return;

    const classworkId = selectedWork.classwork.id;

    try {
      const response = await fetch(`${serverUrl}/api/v1/classwork/${classworkId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "student-token": signedToken,
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to start");
      }

      const result = await response.json();

      if (!result.success) throw new Error(result.message || "Start failed");

      // Store full classwork object (with questions!)
      setClasswork(result.data || result.classwork || result);

      navigate("Classwork");
    } catch (err) {
      Alert.alert("Error", err.message || "Could not start classwork");
    } finally {
      closePanel();
    }
  };

  const formatDuration = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDate = (d) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const ClassworkItem = ({ item }) => {
    const isTaken = item.status === "taken";
    const markText = isTaken
      ? `${item.taken_data.mark}/${item.taken_data.fullMark || item.classwork.full_mark}`
      : "Tap to Start";

    return (
      <TouchableOpacity
        style={[styles.item, isTaken ? styles.itemTaken : styles.itemNotTaken]}
        onPress={() => openPanel(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.itemTitle}>{item.classwork.title}</Text>
        <Text style={[styles.itemSubtitle, isTaken && styles.markText]}>{markText}</Text>
        <Icon name={isTaken ? "check-circle" : "play-circle"} size={22} color={isTaken ? "#4ade80" : "#60a5fa"} />
      </TouchableOpacity>
    );
  };

  const DetailPanel = () => {
    if (!selectedWork) return null;
    const { classwork, status, taken_data } = selectedWork;
    const isTaken = status === "taken";

    return (
      <Animated.View style={[styles.panelContainer, { transform: [{ translateX: panelAnim }] }]}>
        <SafeAreaView style={styles.panelContent}>
          <TouchableOpacity onPress={closePanel} style={styles.panelCloseBtn}>
            <Icon name="x" size={26} color="#e3e7f0" />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.panelScroll}>
            <Text style={styles.panelHeader}>{isTaken ? "Completed" : "Ready to Start"}</Text>
            <Text style={styles.panelTitle}>{classwork.title}</Text>

            <View style={styles.detailCard}>
              <DetailRow label="Max Score" value={classwork.full_mark} />
              <DetailRow label="Duration" value={formatDuration(classwork.duration)} />
              <DetailRow label="Created" value={formatDate(classwork.created_at)} />
              {isTaken && taken_data && (
                <>
                  <DetailRow label="Your Score" value={`${taken_data.mark} / ${taken_data.fullMark}`} isMark />
                  <DetailRow label="Time Taken" value={formatDuration(taken_data.timeTaken)} />
                </>
              )}
            </View>

            <Text style={styles.panelDescription}>
              {isTaken ? "You have completed this classwork." : "This classwork is ready to start."}
            </Text>
          </ScrollView>

          {!isTaken && (
            <TouchableOpacity onPress={handleStartClasswork}>
              <LinearGradient colors={["#1d4ed8", "#3b82f6"]} style={styles.actionBtn}>
                <Text style={styles.actionText}>Start Classwork</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </Animated.View>
    );
  };

  const DetailRow = ({ label, value, status, isMark }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={[styles.detailValue, status === "taken" && styles.statusTaken, isMark && styles.markValue]}>
        {value}
      </Text>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4f8ef7" /><Text style={{ color: "#9db0c8", marginTop: 16 }}>Loading classworks...</Text></View>;
  if (error) return <View style={styles.center}><Text style={{ color: "#fca5a5" }}>{error}</Text><TouchableOpacity onPress={fetchClassworks} style={styles.retryBtn}><Text style={{ color: "#fff" }}>Retry</Text></TouchableOpacity></View>;

  const pendingCount = classworks.filter(c => c.status === "not_taken").length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#050c1f", "#08142e", "#0a1b3f"]} style={styles.background} />

      <View style={styles.mainHeader}>
        <Text style={styles.mainTitle}>{serverName}</Text>
        <Text style={styles.mainSubtitle}>
          {pendingCount === 0 ? "All done!" : `${pendingCount} pending`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {classworks.length === 0 ? (
          <Text style={{ color: "#64748b", textAlign: "center", marginTop: 50 }}>No classworks yet.</Text>
        ) : (
          classworks.map(item => <ClassworkItem key={item.classwork.id} item={item} />)
        )}
      </ScrollView>

      <DetailPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  background: { position: "absolute", width: "100%", height: "100%" },
  container: { flex: 1, backgroundColor: "#050c1f" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#050c1f" },

  mainHeader: { padding: 20, paddingTop: 60 },
  mainTitle: { color: "#fff", fontSize: 28, fontWeight: "900" },
  mainSubtitle: { color: "rgba(190,210,255,0.6)", fontSize: 15, marginTop: 6 },

  listContainer: { padding: 20, paddingBottom: 100 },
  item: { backgroundColor: "rgba(255,255,255,0.06)", padding: 18, borderRadius: 14, marginBottom: 12, borderWidth: 1, flexDirection: "row", alignItems: "center" },
  itemNotTaken: { borderColor: "rgba(79,142,247,0.3)" },
  itemTaken: { borderColor: "rgba(74,222,128,0.3)", backgroundColor: "rgba(10,30,20,0.4)" },
  itemTitle: { color: "#fff", fontSize: 16, fontWeight: "600", flex: 1 },
  itemSubtitle: { color: "rgba(170,190,255,0.7)", fontSize: 13, marginRight: 10 },
  markText: { color: "#4ade80", fontWeight: "700", fontSize: 15 },

  panelContainer: { position: "absolute", top: 0, bottom: 0, right: 0, width: PANEL_WIDTH, backgroundColor: "#0a1435", borderLeftWidth: 1, borderColor: "rgba(255,255,255,0.1)", elevation: 20 },
  panelContent: { flex: 1, padding: 20 },
  panelCloseBtn: { position: "absolute", top: 50, right: 15, zIndex: 10, backgroundColor: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 20 },
  panelScroll: { paddingTop: 60, paddingBottom: 40 },
  panelHeader: { color: "#60a5fa", fontSize: 15, fontWeight: "bold" },
  panelTitle: { color: "#fff", fontSize: 26, fontWeight: "900", marginVertical: 10 },
  panelDescription: { color: "rgba(190,210,255,0.8)", fontSize: 15, lineHeight: 22, marginTop: 20 },

  detailCard: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, marginTop: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  detailLabel: { color: "rgba(170,190,255,0.8)", fontSize: 14 },
  detailValue: { color: "#fff", fontWeight: "600", fontSize: 14 },
  statusTaken: { color: "#4ade80" },
  markValue: { color: "#4ade80", fontWeight: "900", fontSize: 18 },

  actionBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center", marginTop: 30 },
  actionText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  retryBtn: { backgroundColor: "#1d4ed8", padding: 12, borderRadius: 12, marginTop: 20 },
});