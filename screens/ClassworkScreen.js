import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
  Modal,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/Feather";
import { useSharedState } from "../SharedState";
import ImageViewer from "react-native-image-zoom-viewer"; // ← New import

const { width, height } = Dimensions.get("window");

export default function ClassworkScreen({ navigate }) {
  const { classwork, serverUrl, signedToken } = useSharedState();
  const [isFullImage, setIsFullImage] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timer, setTimer] = useState(classwork?.duration || 0);
  const [answers, setAnswers] = useState({});

  const currentQuestion = classwork?.questions?.[currentQIndex];
  const totalQuestions = classwork?.questions?.length || 0;

  useEffect(() => {
    if (timer <= 0) {
      handleSubmit();
      return;
    }
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const formatTime = (t) => {
    const m = Math.floor(t / 60).toString().padStart(2, "0");
    const s = (t % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSelectChoice = (choiceId) => {
    const max = currentQuestion.maxChoices || 1;
    const prev = answers[currentQuestion.id] || [];
    let updated;
    if (prev.includes(choiceId)) {
      updated = prev.filter(id => id !== choiceId);
    } else if (max === 1) {
      updated = [choiceId];
    } else if (prev.length < max) {
      updated = [...prev, choiceId];
    } else {
      Alert.alert("Limit Reached", `You can only select ${max} option(s).`);
      return;
    }
    setAnswers({ ...answers, [currentQuestion.id]: updated });
  };

  const prepareSubmission = () => {
    return classwork.questions.map(q => ({
      questionId: q.id,
      selectedChoiceIds: answers[q.id] || [],
    }));
  };

  const handleSubmit = async () => {
    setTimer(-1);
    const submission = prepareSubmission();

    try {
      const res = await fetch(`${serverUrl}/api/v1/classwork/${classwork.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "student-token": signedToken,
        },
        body: JSON.stringify({ answers: submission }),
      });
      if (!res.ok) throw new Error("Submission failed");

      Alert.alert("Submitted!", "Your answers have been recorded.", [
        { text: "OK", onPress: () => navigate("Session") }
      ]);
    } catch (err) {
      Alert.alert("Error", "Failed to submit. Try again.");
    }
  };

  const confirmSubmit = () => {
    Alert.alert("Submit Classwork?", "You won't be able to change answers after submission.", [
      { text: "Cancel" },
      { text: "Submit", style: "destructive", onPress: handleSubmit },
    ]);
  };

  if (!currentQuestion) return null;

  const currentSelections = answers[currentQuestion.id] || [];
  const isLast = currentQIndex === totalQuestions - 1;

  const imageUrl = `${serverUrl}${currentQuestion.image}`;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#050c1f", "#08142e"]} style={styles.background} />

      {/* Zoomable Image Modal */}
      <Modal
        visible={isFullImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsFullImage(false)}
      >
        <View style={styles.modalBackground}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsFullImage(false)}
          >
            <Icon name="x" size={28} color="#fff" />
          </TouchableOpacity>

          <ImageViewer
            imageUrls={[{ url: imageUrl }]}
            enableCenterOnPress={false}
            enableSwipeDown={true}
            onSwipeDown={() => setIsFullImage(false)}
            doubleClickInterval={300}
            maxScale={5}
            backgroundColor="black"
            renderHeader={() => null} // Hide default header
            renderIndicator={() => null} // Hide page indicator (since only one image)
          />
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.timerText}>{formatTime(timer)}</Text>
        <View style={styles.progressBox}>
          <Text style={styles.progressText}>Q {currentQIndex + 1} / {totalQuestions}</Text>
        </View>
        <Text style={styles.titleText}>{classwork.title}</Text>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.questionMark}>
          ({currentQuestion.mark} mark{currentQuestion.mark > 1 ? "s" : ""})
        </Text>

        {currentQuestion.image && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.imageContainer}
            onPress={() => setIsFullImage(true)}
          >
            <Image
              source={{ uri: imageUrl }}
              style={styles.questionImage}
              resizeMode="contain"
            />
            <View style={styles.zoomBadge}>
              <Icon name="maximize-2" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.questionText}>{currentQuestion.question}</Text>

        <View style={styles.choicesContainer}>
          {currentQuestion.choices.map(choice => {
            const selected = currentSelections.includes(choice.id);
            return (
              <TouchableOpacity
                key={choice.id}
                style={[styles.choiceItem, selected && styles.choiceItemSelected]}
                onPress={() => handleSelectChoice(choice.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.choiceOrderText}>{choice.order}.</Text>
                <Text style={styles.choiceText}>{choice.choice}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => setCurrentQIndex(i => Math.max(0, i - 1))}
          disabled={currentQIndex === 0}
          style={[styles.navButton, currentQIndex === 0 && styles.navButtonDisabled]}
        >
          <Icon name="arrow-left" size={20} color={currentQIndex === 0 ? "#64748b" : "#fff"} />
          <Text style={styles.navText}>Previous</Text>
        </TouchableOpacity>

        {isLast ? (
          <TouchableOpacity onPress={confirmSubmit} style={styles.submitButton}>
            <Text style={styles.submitText}>Submit</Text>
            <Icon name="check-circle" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setCurrentQIndex(i => i + 1)} style={styles.navButton}>
            <Text style={styles.navText}>Next</Text>
            <Icon name="arrow-right" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// Styles (mostly unchanged)
const styles = StyleSheet.create({
  background: { position: "absolute", width: "100%", height: "100%" },
  container: { flex: 1 },

  header: {
    padding: 20,
    paddingTop: 50,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  timerText: { color: "#4ade80", fontSize: 32, fontWeight: "900" },
  progressBox: {
    backgroundColor: "rgba(79,142,247,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    position: "absolute",
    top: 50,
    right: 20,
  },
  progressText: { color: "#60a5fa", fontWeight: "700" },
  titleText: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 10 },

  scrollContent: { padding: 20, paddingBottom: 120 },

  questionMark: { color: "rgba(190,210,255,0.7)", fontSize: 16, marginBottom: 12 },

  imageContainer: {
    width: "100%",
    height: 240,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 24,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  questionImage: { width: "100%", height: "100%" },
  zoomBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 6,
  },

  questionText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 32,
    marginBottom: 30,
  },

  choicesContainer: { gap: 14 },
  choiceItem: {
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 18,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
  },
  choiceItemSelected: {
    borderColor: "#4f8ef7",
    backgroundColor: "rgba(79,142,247,0.15)",
  },
  choiceOrderText: {
    color: "#60a5fa",
    fontWeight: "700",
    fontSize: 18,
    marginRight: 12,
  },
  choiceText: { color: "#fff", fontSize: 17, flex: 1 },

  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "rgba(10,20,53,0.95)",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  navButtonDisabled: { backgroundColor: "rgba(100,116,139,0.3)" },
  navText: { color: "#fff", fontWeight: "600", marginHorizontal: 8 },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  modalBackground: { flex: 1, backgroundColor: "rgba(0,0,0,0.98)" },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1000,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 30,
    padding: 10,
  },
});