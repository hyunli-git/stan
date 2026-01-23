import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DebugApp() {
  console.log('🐛 Debug App Loading...');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐛 STAN Debug Mode</Text>
      <Text style={styles.subtitle}>If you can see this, React Native Web is working!</Text>
      <Text style={styles.info}>Platform: web</Text>
      <Text style={styles.info}>Environment: {process.env.NODE_ENV || 'unknown'}</Text>
      <Text style={styles.status}>✅ App successfully loaded</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  info: {
    fontSize: 14,
    marginBottom: 10,
    color: '#666',
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00aa00',
    marginTop: 20,
  },
});