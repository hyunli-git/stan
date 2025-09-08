import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleLogin = async () => {
    setError(''); // Clear previous errors
    
    if (!email || !password) {
      setError('Please fill in all fields');
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting sign in process...');
      const result = await signIn(email, password);
      console.log('Sign in completed:', result?.user?.id);
      
      // If we get here, sign in was successful
      // The AuthContext will handle the navigation via auth state change
    } catch (error: any) {
      console.error('Login failed:', error);
      
      let errorMessage = error.message || 'Sign in failed';
      
      // Handle common Supabase auth errors
      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the verification link before signing in. Or contact support to confirm your account.';
      } else if (errorMessage.includes('Too many requests')) {
        errorMessage = 'Too many sign in attempts. Please wait a moment and try again.';
      }
      
      setError(errorMessage);
      Alert.alert('Sign In Failed', errorMessage);
      
      // Also show a visible error message on screen
      console.log('🚨 ERROR MESSAGE:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>🌟 STAN</Text>
        <Text style={styles.subtitle}>Welcome back!</Text>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>❌ {error}</Text>
            </View>
          ) : null}
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#666', marginTop: 20 }]}
            onPress={() => {
              setEmail('test@example.com');
              setPassword('testpass123');
            }}
          >
            <Text style={styles.buttonText}>Fill Test Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#007AFF', marginTop: 10 }]}
            onPress={async () => {
              try {
                console.log('Testing direct Supabase auth...');
                const { supabase } = await import('../lib/supabase');
                const result = await supabase.auth.signUp({
                  email: 'test@example.com',
                  password: 'testpass123'
                });
                console.log('Direct signup test:', result);
                Alert.alert('Test Result', `Signup test: ${result.error ? 'Error: ' + result.error.message : 'Success!'}`);
              } catch (error: any) {
                console.error('Direct test failed:', error);
                Alert.alert('Test Failed', error.message);
              }
            }}
          >
            <Text style={styles.buttonText}>Test Supabase Direct</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FF6B35', marginTop: 10 }]}
            onPress={async () => {
              try {
                console.log('🔧 DEV: Attempting to force login bypass...');
                
                // Try to manually set auth session for development
                const { supabase } = await import('../lib/supabase');
                
                // First try to get the user by email
                const { data: users, error: listError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', '00000000-0000-0000-0000-000000000000')
                  .limit(1);
                
                console.log('Found users:', users, listError);
                
                Alert.alert('Dev Info', 'Check console for user data');
              } catch (error: any) {
                console.error('Dev bypass failed:', error);
                Alert.alert('Dev Bypass Failed', error.message);
              }
            }}
          >
            <Text style={styles.buttonText}>🔧 Dev: Check Users</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 300,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#666',
  },
  linkTextBold: {
    fontWeight: '600',
    color: '#000',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
});