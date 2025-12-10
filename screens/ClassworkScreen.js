// screens/ClassworkScreen.js
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/Feather";
import { useSharedState } from "../SharedState";

const { width } = Dimensions.get("window");

export default function ClassworkScreen({ navigate }) {
  const { classwork, serverUrl, signedToken } = useSharedState();

//   // If no classwork → show error
//   if (!classwork || !classwork.questions) {
//     return (
//       <View style={styles.center}>
//         <Text style={styles.errorText}>No classwork loaded.</Text>
//         <TouchableOpacity onPress={() => navigate("Session")} style={styles.backBtn}>
//           <Text style={{ color: "#60a5fa" }}>← Back to Session</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timer, setTimer] = useState(classwork.duration);
  const [answers, setAnswers] = useState({});

  const currentQuestion = classwork.questions[currentQIndex];
  const totalQuestions = classwork.questions.length;

  // Timer
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
      console.log( await res.json())
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

  const currentSelections = answers[currentQuestion.id] || [];
  const isLast = currentQIndex === totalQuestions - 1;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#050c1f", "#08142e"]} style={styles.background} />

      <View style={styles.header}>
        <Text style={styles.timerText}>{formatTime(timer)}</Text>
        <View style={styles.progressBox}>
          <Text style={styles.progressText}>Q {currentQIndex + 1} / {totalQuestions}</Text>
        </View>
        <Text style={styles.titleText}>{classwork.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.questionMark}>({currentQuestion.mark} mark{currentQuestion.mark > 1 ? "s" : ""})</Text>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>

        <View style={styles.choicesContainer}>
          {currentQuestion.choices.map(choice => {
            const selected = currentSelections.includes(choice.id);
            return (
              <TouchableOpacity
                key={choice.id}
                style={[styles.choiceItem, selected && styles.choiceItemSelected]}
                onPress={() => handleSelectChoice(choice.id)}
              >
                <Text style={styles.choiceOrderText}>{choice.order}.</Text>
                <Text style={styles.choiceText}>{choice.choice}</Text>
              </TouchableOpacity>
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

// Same beautiful styles as before
const styles = StyleSheet.create({
  background: { position: "absolute", width: "100%", height: "100%" },
  container: { flex: 1, backgroundColor: "#050c1f" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#fca5a5", fontSize: 18, marginBottom: 20 },
  backBtn: { padding: 10 },

  header: { padding: 20, paddingTop: 50, alignItems: "center", borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  timerText: { color: "#4ade80", fontSize: 32, fontWeight: "900" },
  progressBox: { backgroundColor: "rgba(79,142,247,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, position: "absolute", top: 100, right: 20 },
  progressText: { color: "#60a5fa", fontWeight: "700" },
  titleText: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 10 },

  scrollContent: { padding: 20, paddingBottom: 120 },
  questionMark: { color: "rgba(190,210,255,0.7)", marginBottom: 8 },
  questionText: { color: "#fff", fontSize: 22, fontWeight: "800", lineHeight: 32, marginBottom: 30 },

  choicesContainer: { gap: 14 },
  choiceItem: { backgroundColor: "rgba(255,255,255,0.06)", padding: 18, borderRadius: 14, borderWidth: 2, borderColor: "rgba(255,255,255,0.1)", flexDirection: "row", alignItems: "center" },
  choiceItemSelected: { borderColor: "#4f8ef7", backgroundColor: "rgba(79,142,247,0.15)" },
  choiceOrderText: { color: "#60a5fa", fontWeight: "700", fontSize: 18, marginRight: 12 },
  choiceText: { color: "#fff", fontSize: 17, flex: 1 },

  footer: { position: "absolute", bottom: 0, width: "100%", flexDirection: "row", justifyContent: "space-between", padding: 20, backgroundColor: "rgba(10,20,53,0.95)", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  navButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#1d4ed8", paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 },
  navButtonDisabled: { backgroundColor: "rgba(100,116,139,0.3)" },
  navText: { color: "#fff", fontWeight: "600", marginHorizontal: 8 },
  submitButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#ef4444", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});