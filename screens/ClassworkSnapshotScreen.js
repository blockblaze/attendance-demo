import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Modal,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/Feather";
import { useSharedState } from "../SharedState";
import ImageViewer from "react-native-image-zoom-viewer";

const { width } = Dimensions.get("window");

export default function ClassworkSnapshotScreen({ navigate }) {
  const { serverUrl, signedToken, classwork } = useSharedState();
  
  const [loading, setLoading] = useState(true);
  const [snapshotData, setSnapshotData] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [isFullImage, setIsFullImage] = useState(false);

  // Safety Redirect
  useEffect(() => {
    if (!classwork) navigate("Session");
  }, [classwork]);

  const fetchSnapshot = useCallback(async () => {
    if (!classwork?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`${serverUrl}/api/v1/session/active/classwork/${classwork.id}/snapshot`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "student-token": signedToken,
        },
      });
      const json = await res.json();
      if (json.success) {
        setSnapshotData(json.data);
      }
    } catch (err) {
      console.error("Snapshot Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [serverUrl, signedToken, classwork?.id]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f8ef7" />
        <Text style={{ color: "#9db0c8", marginTop: 10 }}>Loading Results...</Text>
      </View>
    );
  }

  // --- Empty / Null Data State ---
  // If record exists but snapshot is null or questions array is empty
  const record = snapshotData?.record;
  const questions = record?.snapshot?.questions;

  if (!snapshotData || !record || !questions || questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#050c1f", "#08142e"]} style={styles.background} />
        <View style={styles.center}>
          <View style={styles.emptyIconContainer}>
            <Icon name="alert-circle" size={60} color="#f87171" />
          </View>
          <Text style={styles.emptyTitle}>No Correction Available</Text>
          <Text style={styles.emptySubtitle}>
            It seems this exam was closed or ended before any data could be saved.
          </Text>
          <TouchableOpacity 
            style={styles.retryBtn} 
            onPress={() => navigate("Session")}
          >
            <Text style={styles.retryText}>Back to Session</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Normal Rendering Logic ---
  const currentSnapshotQ = questions[currentQIndex];
  const question = currentSnapshotQ.question;
  const selectedChoiceIds = currentSnapshotQ.selectedChoiceIds || [];
  const totalQuestions = questions.length;
  const isLast = currentQIndex === totalQuestions - 1;
  const imageUrl = question.image ? `${serverUrl}${question.image}` : null;

  const formatTimeTaken = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#050c1f", "#08142e"]} style={styles.background} />

      <Modal visible={isFullImage} transparent animationType="fade" onRequestClose={() => setIsFullImage(false)}>
        <View style={styles.modalBackground}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setIsFullImage(false)}>
            <Icon name="x" size={28} color="#fff" />
          </TouchableOpacity>
          {imageUrl && (
            <ImageViewer 
                imageUrls={[{ url: imageUrl }]} 
                enableSwipeDown 
                onSwipeDown={() => setIsFullImage(false)} 
                renderHeader={() => null}
                renderIndicator={() => null}
            />
          )}
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.scoreText}>{record.mark} / {record.classwork.full_mark}</Text>
        <Text style={styles.scoreLabel}>Final Score</Text>
        <View style={styles.timeTakenBox}>
          <Icon name="clock" size={14} color="#60a5fa" />
          <Text style={styles.timeTakenText}> {formatTimeTaken(record.timeTaken)}</Text>
        </View>
        <TouchableOpacity style={styles.backArrow} onPress={() => navigate("Session")}>
            <Icon name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.questionHeaderRow}>
            <Text style={styles.questionMark}>Q {currentQIndex + 1} of {totalQuestions}</Text>
            <View style={[styles.statusBadge, { backgroundColor: currentSnapshotQ.isAnsweredCorrectly ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
                <Text style={{ color: currentSnapshotQ.isAnsweredCorrectly ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                    {currentSnapshotQ.isAnsweredCorrectly ? "CORRECT" : "INCORRECT"}
                </Text>
            </View>
        </View>

        {imageUrl && (
          <TouchableOpacity activeOpacity={0.85} style={styles.imageContainer} onPress={() => setIsFullImage(true)}>
            <Image source={{ uri: imageUrl }} style={styles.questionImage} resizeMode="contain" />
            <View style={styles.zoomBadge}><Icon name="maximize-2" size={16} color="#fff" /></View>
          </TouchableOpacity>
        )}

        <Text style={styles.questionText}>{question.question}</Text>

        <View style={styles.choicesContainer}>
          {question.choices.map((choice) => {
            const isSelected = selectedChoiceIds.includes(choice.id);
            const isCorrect = choice.mark > 0;
            
            let itemStyle = styles.choiceItem;
            if (isCorrect) itemStyle = [styles.choiceItem, styles.choiceCorrect];
            if (isSelected && !isCorrect) itemStyle = [styles.choiceItem, styles.choiceWrong];

            return (
              <View key={choice.id} style={itemStyle}>
                <Text style={styles.choiceOrderText}>{choice.order}.</Text>
                <Text style={styles.choiceText}>{choice.choice}</Text>
                {isSelected && (
                    <View style={styles.userBadge}>
                        <Text style={styles.userBadgeText}>YOUR ANSWER</Text>
                    </View>
                )}
                {isCorrect && (
                    <Icon name="check" size={20} color="#4ade80" style={{marginLeft: 10}} />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => setCurrentQIndex(i => Math.max(0, i - 1))}
          disabled={currentQIndex === 0}
          style={[styles.navButton, currentQIndex === 0 && styles.navButtonDisabled]}
        >
          <Icon name="arrow-left" size={20} color={currentQIndex === 0 ? "#64748b" : "#fff"} />
          <Text style={styles.navText}>Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate("Session")} style={styles.exitButton}>
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentQIndex(i => i + 1)}
          disabled={isLast}
          style={[styles.navButton, isLast && styles.navButtonDisabled]}
        >
          <Text style={styles.navText}>Next</Text>
          <Icon name="arrow-right" size={20} color={isLast ? "#64748b" : "#fff"} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: { position: "absolute", width: "100%", height: "100%" },
  container: { flex: 1, backgroundColor: "#050c1f" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },

  // Empty State Styles
  emptyIconContainer: { marginBottom: 20, backgroundColor: 'rgba(248, 113, 113, 0.1)', padding: 20, borderRadius: 50 },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  emptySubtitle: { color: 'rgba(190, 210, 255, 0.6)', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  retryBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  header: { padding: 20, paddingTop: 50, alignItems: "center", borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  scoreText: { color: "#4ade80", fontSize: 36, fontWeight: "900" },
  scoreLabel: { color: "rgba(190,210,255,0.6)", fontSize: 12, fontWeight: "700", textTransform: 'uppercase' },
  timeTakenBox: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  timeTakenText: { color: "#fff", fontSize: 13, fontWeight: '600' },
  backArrow: { position: 'absolute', top: 60, left: 20 },

  scrollContent: { padding: 20, paddingBottom: 120 },
  questionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  questionMark: { color: "rgba(190,210,255,0.7)", fontSize: 16, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },

  imageContainer: { width: "100%", height: 200, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, marginBottom: 24, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  questionImage: { width: "100%", height: "100%" },
  zoomBadge: { position: "absolute", bottom: 12, right: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, padding: 6 },

  questionText: { color: "#fff", fontSize: 20, fontWeight: "800", lineHeight: 28, marginBottom: 25 },

  choicesContainer: { gap: 12 },
  choiceItem: { backgroundColor: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 12, borderWidth: 2, borderColor: "transparent", flexDirection: "row", alignItems: "center" },
  choiceCorrect: { borderColor: "#4ade80", backgroundColor: "rgba(74, 222, 128, 0.1)" },
  choiceWrong: { borderColor: "#f87171", backgroundColor: "rgba(239, 68, 68, 0.1)" },
  
  choiceOrderText: { color: "rgba(255,255,255,0.5)", fontWeight: "700", fontSize: 16, marginRight: 12 },
  choiceText: { color: "#fff", fontSize: 16, flex: 1 },
  
  userBadge: { backgroundColor: 'rgba(79, 142, 247, 0.8)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 5 },
  userBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  footer: { position: "absolute", bottom: 0, width: "100%", flexDirection: "row", justifyContent: "space-between", padding: 20, backgroundColor: "rgba(10,20,53,0.98)", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: 'center' },
  navButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#1d4ed8", paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10 },
  navButtonDisabled: { backgroundColor: "rgba(100,116,139,0.2)" },
  navText: { color: "#fff", fontWeight: "600", marginHorizontal: 5 },
  exitButton: { padding: 10 },
  exitText: { color: "#f87171", fontWeight: "700" },

  modalBackground: { flex: 1, backgroundColor: "black" },
  closeButton: { position: "absolute", top: 50, right: 20, zIndex: 1000, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 30, padding: 10 },
});