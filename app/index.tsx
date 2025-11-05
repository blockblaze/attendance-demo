import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { io } from 'socket.io-client';
import jwt from 'jwt-simple';
import { Barcode } from 'expo-barcode-generator';
import 'react-native-get-random-values';

const SECRET = '123';

export default function App() {
  const [studentId, setStudentId] = useState('');
  const [logs, setLogs] = useState([]);
  const [socket, setSocket] = useState(null);
  const [signedToken, setSignedToken] = useState(null);
  const [timer, setTimer] = useState(0);
  const [scanned, setScanned] = useState(false);

  const log = (msg) => setLogs((prev) => [...prev, msg]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && signedToken) {
      setSignedToken(null);
      log('⌛ Barcode expired');
    }
  }, [timer]);

  const startAttendance = async () => {
    const id = Number(studentId);
    if (!id) return alert('Please enter a valid ID');

    const sock = io('http://192.168.1.7:3000'); // Replace with your backend IP or ngrok URL
    setSocket(sock);
    setLogs([]);
    setScanned(false);
    setSignedToken(null);
    log('🔌 Connecting to server...');

    sock.emit('start_challenge');

    sock.on('challenge', async (data) => {
      if (!data.active) {
        log('❌ No active session found');
        sock.disconnect();
        return;
      }

      log('🪪 Received token: ' + data.token);

      try {
        const payload = { userId: id, token: data.token, exp: Math.floor(Date.now() / 1000) + 120 }; // 2 minutes expiry
        const signed = jwt.encode(payload, SECRET, 'HS256');
        setSignedToken(signed);
        log('✅ Sending signed token');
        sock.emit('submit_challenge', signed);
      } catch (error) {
        log('⚠️ JWT Signing Error: ' + error.message);
      }
    });

    sock.on('success', (data) => {
      log('🎉 Success: ' + JSON.stringify(data));
      setTimer(300); // 5 minutes
    });

    sock.on('scan_success', (data) => {
      log('🎯 Scan success: ' + JSON.stringify(data));
      setSignedToken(null);
      setScanned(true);
    });

    sock.on('challenge_error', (err) => {
      console.log(err)
      log('⚠️ Error: ' + JSON.stringify(err));
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎓 Attendance Demo (React Native)</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter Student ID"
        placeholderTextColor="#aaa"
        keyboardType="numeric"
        value={studentId}
        onChangeText={setStudentId}
      />

      <TouchableOpacity onPress={startAttendance} style={styles.button}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Start Attendance</Text>
      </TouchableOpacity>

      <View style={{ marginTop: 30, alignItems: 'center' }}>
        {signedToken && (
          <View style={{ alignItems: 'center' }}>
            <Barcode
              value="123456789123456"
              format="CODE128"
              options={{
                width: 2,
                height: 100,
                background: '#FFFFFF',
                lineColor: '#000000',
              }}
            />
            <Text style={{ color: '#fff', marginTop: 10 }}>⏳ Barcode active</Text>
          </View>
        )}

        {scanned && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ Scan Successful!</Text>
          </View>
        )}
      </View>

      <View style={styles.logsBox}>
        <Text style={{ color: '#ff6600', marginBottom: 4 }}>Logs:</Text>
        <Text style={{ color: '#ddd', fontFamily: 'monospace' }}>{logs.join('\n')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    padding: 20,
    justifyContent: 'flex-start',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#ff6600',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logsBox: {
    backgroundColor: '#222',
    marginTop: 20,
    padding: 10,
    borderRadius: 8,
    maxHeight: 200,
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