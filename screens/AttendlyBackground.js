import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function Background() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#020617", "#0B1830", "#111827"]} 
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,   
  },
});