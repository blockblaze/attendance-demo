import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { io } from 'socket.io-client';
import Barcode from '@kichiyaki/react-native-barcode-generator';
import * as Network from 'expo-network';
import { signJWT } from '../jwt';

const SECRET = '123';
const PORT = 3000;

export default function AttendScreen() {
  const [studentId, setStudentId] = useState('');
  const [socket, setSocket] = useState(null);
  const [token, setToken] = useState(null);
  const [timer, setTimer] = useState(0);
  const [scanned, setScanned] = useState(false);
  const [serverUrl, setServerUrl] = useState(null);
  const [searching, setSearching] = useState(false);

  // 🔍 Scan local network for server
  const discoverServer = async () => {
    setSearching(true);
    try {
      const ip = await Network.getIpAddressAsync();
      const subnet = ip.split('.').slice(0, 3).join('.');
      console.log('📡 Scanning subnet:', subnet);

      for (let i = 1; i <= 254; i++) {
        const target = `http://${subnet}.${i}:${PORT}/api/health`;
        try {
          const res = await fetch(target, { timeout: 500 });
          const json = await res.json();
          if (json.ok) {
            console.log('✅ Server found at:', target);
            setServerUrl(`http://${subnet}.${i}:${PORT}`);
            setSearching(false);
            return;
          }
        } catch (_) {}
      }

      Alert.alert('⚠️ Server not found', 'Make sure your phone and server are on the same Wi-Fi.');
    } catch (e) {
      console.warn('Network error:', e);
      Alert.alert('⚠️ Network Error', e.message);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    discoverServer();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && token) {
      setToken(null);
      Alert.alert('⏳ Expired', 'The barcode has expired. Please restart attendance.');
    }
  }, [timer]);

  const startAttendance = async () => {
    const id = Number(studentId);
    if (!id) return Alert.alert('⚠️ Invalid ID', 'Please enter a valid student ID.');

    if (!serverUrl) {
      return Alert.alert('⚠️ Server Not Found', 'Waiting to discover the local server...');
    }

    const backendUrl = serverUrl;
    console.log('🔌 Connecting to:', backendUrl);

    const sock = io(backendUrl, { transports: ['websocket'] });
    setSocket(sock);
    setScanned(false);
    setToken(null);

    Alert.alert('🔌 Connecting', 'Attempting to connect to the server...');

    sock.emit('start_challenge');

    sock.on('challenge', async (data) => {
      if (!data.active) {
        Alert.alert('❌ No Active Session', 'There is no ongoing attendance session.');
        sock.disconnect();
        return;
      }

      console.log('🪪 Received token:', data.token);

      try {
        const payload = {
          userId: id,
          token: data.token,
          exp: Math.floor(Date.now() / 1000) + 300,
        };
        const signed = await signJWT(payload, SECRET);
        sock.emit('submit_challenge', signed);
        Alert.alert('✅ Token Sent', 'Your signed token was sent successfully.');
      } catch (error) {
        console.error('JWT Signing Error:', error);
        Alert.alert('⚠️ Signing Error', error.message);
      }
    });

    sock.on('success', (data) => {
      setToken(data.token);
      console.log('🎉 Success:', data);
      setTimer(300);
      Alert.alert('🎉 Success', 'Attendance started. Your barcode is now active.');
    });

    sock.on('scan_success', (data) => {
      console.log('🎯 Scan success:', data);
      setToken(null);
      setScanned(true);
      Alert.alert('✅ Scan Successful', 'Your attendance has been recorded!');
    });

    sock.on('challenge_error', (err) => {
      console.error('⚠️ Error:', err);
      Alert.alert('⚠️ Server Error', JSON.stringify(err));
    });
  };

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎓 Attendly Demo</Text>

      {searching && (
        <View style={{ marginVertical: 10 }}>
          <ActivityIndicator color="#ff6600" />
          <Text style={{ color: '#aaa', marginTop: 8 }}>Scanning local network...</Text>
        </View>
      )}

      {serverUrl && (
        <Text style={{ color: '#0f0', marginBottom: 10 }}>✅ Connected to {serverUrl}</Text>
      )}

      <TextInput
        style={styles.input}
        placeholder="Enter Student ID"
        placeholderTextColor="#aaa"
        keyboardType="numeric"
        value={studentId}
        onChangeText={setStudentId}
      />

      <TouchableOpacity onPress={startAttendance} style={styles.button}>
        <Text style={styles.buttonText}>Start Attendance</Text>
      </TouchableOpacity>

      <View style={styles.barcodeContainer}>
        {token && (
          <View style={styles.barcodeWrapper}>
            <Barcode
              value={token.toString()}
              format="CODE128"
              options={{ width: 2, height: 100, background: '#fff', lineColor: '#000' }}
            />
            <Text style={styles.barcodeText}>⏳ Expires in {formatTime(timer)}</Text>
          </View>
        )}

        {scanned && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ Scan Successful!</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    padding: 20,
    justifyContent: 'flex-start',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 15,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#ff6600',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  barcodeContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  barcodeWrapper: {
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 16,
    borderRadius: 12,
  },
  barcodeText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  successBox: {
    backgroundColor: '#00c851',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  successText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
