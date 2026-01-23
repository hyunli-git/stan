import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SimpleTestApp() {
  console.log('🚀 SimpleTestApp Loading...');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚀 STAN App is Loading</Text>
      <Text style={styles.subtitle}>React Native Web Test</Text>
      <Text style={styles.info}>If you can see this, the app is working!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    color: '#666',
  },
  info: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});