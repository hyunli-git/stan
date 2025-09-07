import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { API_URL } from './config/api';

export default function App() {
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const [supabaseStatus, setSupabaseStatus] = useState<string>('Not tested');

  // Test API connection on load
  useEffect(() => {
    testAPIConnection();
  }, []);

  const testAPIConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const data = await response.json();
      setApiStatus(`✅ Connected: ${data.message}`);
    } catch (error) {
      setApiStatus('❌ API Connection Failed');
    }
  };

  const testSupabase = async () => {
    try {
      // This will test if Supabase is properly configured
      const { supabase } = await import('./lib/supabase');
      const { data, error } = await supabase.from('categories').select('*').limit(1);
      
      if (error) throw error;
      setSupabaseStatus('✅ Supabase Connected');
      Alert.alert('Success', `Found ${data?.length || 0} categories`);
    } catch (error: any) {
      setSupabaseStatus('❌ Supabase Error');
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌟 STAN</Text>
      <Text style={styles.subtitle}>Daily AI briefings for everything you stan</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>System Status:</Text>
        <Text style={styles.status}>Backend API: {apiStatus}</Text>
        <Text style={styles.status}>Supabase: {supabaseStatus}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Test Supabase Connection" onPress={testSupabase} />
      </View>

      <Text style={styles.footer}>Ready to build your app! 🚀</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    minWidth: 300,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    marginVertical: 5,
  },
  buttonContainer: {
    marginVertical: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    fontSize: 14,
    color: '#999',
  },
});