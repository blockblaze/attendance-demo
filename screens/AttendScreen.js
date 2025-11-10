import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { io } from 'socket.io-client';
import Barcode from '@kichiyaki/react-native-barcode-generator';
import * as Network from 'expo-network';
import { signJWT } from '../jwt';

const SECRET = '123';
const PORT = 3000;

export default function AttendScreen({ goToLogin }) {
  const [studentId, setStudentId] = useState('12345');
  const [socket, setSocket] = useState(null);
  const [token, setToken] = useState(null);
  const [timer, setTimer] = useState(0);
  const [scanned, setScanned] = useState(false);
  const [serverUrl, setServerUrl] = useState(null);
  const [searching, setSearching] = useState(false);

  const [avatarUri, setAvatarUri] = useState(null);

  const discoverServer = async () => {
    setSearching(true);
    try {
      const ip = await Network.getIpAddressAsync();
      const subnet = ip.split('.').slice(0, 3).join('.');
      for (let i = 1; i <= 254; i++) {
        const target = `http://${subnet}.${i}:${PORT}/api/health`;
        try {
          const res = await fetch(target, { timeout: 500 });
          const json = await res.json();
          if (json.ok) {
            setServerUrl(`http://${subnet}.${i}:${PORT}`);
            setSearching(false);
            return;
          }
        } catch (_) {}
      }
      Alert.alert('Server not found', 'Make sure your phone and server are on the same Wi-Fi.');
    } catch (e) {
      Alert.alert('Network Error', e.message);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    discoverServer();
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && token) {
      setToken(null);
      Alert.alert('Expired', 'The barcode has expired. Please restart attendance.');
    }
  }, [timer]);

  const startAttendance = async () => {
    const id = Number(studentId);
    if (!id) return Alert.alert('Invalid ID', 'Please enter a valid student ID.');
    if (!serverUrl) return Alert.alert('Server Not Found', 'Waiting to discover the local server...');

    const sock = io(serverUrl, { transports: ['websocket'] });
    setSocket(sock);
    setScanned(false);
    setToken(null);

    Alert.alert('Connecting', 'Attempting to connect to the server...');
    sock.emit('start_challenge');

    sock.on('challenge', async (data) => {
      if (!data.active) {
        Alert.alert('No Active Session', 'There is no ongoing attendance session.');
        sock.disconnect();
        return;
      }

      try {
        const payload = {
          userId: id,
          token: data.token,
          exp: Math.floor(Date.now() / 1000) + 300,
        };
        const signed = await signJWT(payload, SECRET);
        sock.emit('submit_challenge', signed);
        Alert.alert('Token Sent', 'Your signed token was sent successfully.');
      } catch (error) {
        Alert.alert('Signing Error', error.message);
      }
    });

    sock.on('success', (data) => {
      setToken(data.token);
      setTimer(300);
      Alert.alert('Success', 'Attendance started. Your barcode is now active.');
    });

    sock.on('scan_success', () => {
      setToken(null);
      setScanned(true);
      Alert.alert('Scan Successful', 'Your attendance has been recorded!');
    });

    sock.on('challenge_error', (err) => {
      Alert.alert('Server Error', JSON.stringify(err));
    });
  };

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goToLogin} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>OS</Text>
          </View>
        )}
        <Text style={styles.name}>Omar Sherbeni</Text>
        <Text style={styles.idText}>ID: {studentId}</Text>
      </View>

      <TouchableOpacity onPress={startAttendance} style={styles.button}>
        <Text style={styles.buttonText}>Start Attendance</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        {token && (
          <View style={styles.barcodeWrapper}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>

            <View style={styles.barcodeInner}>
              <Barcode
                value={token.toString()}
                format="CODE128"
                options={{ width: 2, height: 80, background: '#071229', lineColor: '#fff' }}
              />
            </View>

            <Text style={styles.timerText}>{formatTime(timer)}</Text>

            <TouchableOpacity style={styles.attendBtn}>
              <Text style={styles.attendBtnText}>Attend</Text>
            </TouchableOpacity>
          </View>
        )}

        {!token && !scanned && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No active barcode. Press Start Attendance.</Text>
          </View>
        )}

        {scanned && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ Scan Successful!</Text>
          </View>
        )}
      </View>

      {searching && (
        <View style={{ marginVertical: 10, alignItems: 'center' }}>
          <ActivityIndicator color="#4f8ef7" />
          <Text style={{ color: '#9db0c8', marginTop: 8 }}>Scanning local network...</Text>
        </View>
      )}

      {serverUrl && (
        <Text style={{ color: '#4ade80', marginBottom: 10, textAlign: 'center' }}>
          Connected to {serverUrl}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050c1f', padding: 20, justifyContent: 'flex-start' },
  backBtn: { position: 'absolute', top: 50, left: 20, padding: 10, zIndex: 5 },
  backText: { color: '#9db0c8', fontSize: 16, fontWeight: '600' },

  header: { marginTop: 70, alignItems: 'center' },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0b1f3b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#142d57',
  },
  avatarInitials: { color: '#4f8ef7', fontSize: 28, fontWeight: '700' },

  name: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  idText: { color: '#8ca7d4', fontSize: 14, marginTop: 4, textAlign: 'center' },

  button: {
    backgroundColor: '#1d4ed8',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  card: {
    marginTop: 35,
    backgroundColor: '#0a1435',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },

  barcodeWrapper: { width: '100%', alignItems: 'center' },
  checkCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1e40af',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  checkMark: { color: '#fff', fontSize: 30, fontWeight: '700' },

  barcodeInner: {
    backgroundColor: '#071229',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 12,
    width: '90%',
    alignItems: 'center',
  },

  timerText: { color: '#fff', fontSize: 34, fontWeight: '700', marginBottom: 12 },

  attendBtn: {
    width: '75%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  attendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  emptyBox: { padding: 25, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#8ca7d4', textAlign: 'center', fontSize: 15 },

  successBox: {
    backgroundColor: '#22c55e',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  successText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
