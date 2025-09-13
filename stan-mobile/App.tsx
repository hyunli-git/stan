import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import AddStanScreen from './screens/AddStanScreen';
import BriefingScreen from './screens/BriefingScreen';
import ProfileScreen from './screens/ProfileScreen';
import PromptManagerScreen from './screens/PromptManagerScreen';

// Import test app for development
import TestApp from './TestApp';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f0f0f0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: () => '🏠',
        }}
      />
      <Tab.Screen 
        name="AddStan" 
        component={AddStanScreen}
        options={{
          tabBarLabel: 'Add Stan',
          tabBarIcon: () => '➕',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: () => '👤',
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading, isNewUser } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Auth screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          // Main app screens
          <>
            {isNewUser ? (
              // New users see onboarding first
              <>
                <Stack.Screen 
                  name="Onboarding" 
                  component={OnboardingScreen}
                  options={{
                    presentation: 'card',
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen name="MainTabs" component={MainTabs} />
                <Stack.Screen name="Briefing" component={BriefingScreen} />
                <Stack.Screen name="PromptManager" component={PromptManagerScreen} />
                <Stack.Screen name="TestApp" component={TestApp} />
              </>
            ) : (
              // Returning users go directly to MainTabs
              <>
                <Stack.Screen name="MainTabs" component={MainTabs} />
                <Stack.Screen 
                  name="Onboarding" 
                  component={OnboardingScreen}
                  options={{
                    presentation: 'card',
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen name="Briefing" component={BriefingScreen} />
                <Stack.Screen name="PromptManager" component={PromptManagerScreen} />
                <Stack.Screen name="TestApp" component={TestApp} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}