import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { promptService } from '../services/promptService';

interface StanPrompt {
  id?: string;
  user_id: string;
  stan_id: string;
  custom_prompt?: string;
  focus_areas?: string[];
  tone?: string;
  length?: string;
  include_sources?: boolean;
  include_social_media?: boolean;
  include_fan_reactions?: boolean;
  include_upcoming_events?: boolean;
  exclude_topics?: string[];
}

interface PromptManagerScreenProps {
  navigation: any;
  route: {
    params: {
      stan: {
        id: string;
        name: string;
        categories: {
          name: string;
          icon: string;
          color: string;
        };
      };
      userId: string;
    };
  };
}

export default function PromptManagerScreen({ navigation, route }: PromptManagerScreenProps) {
  const { stan, userId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState<StanPrompt>({
    user_id: userId,
    stan_id: stan.id,
    custom_prompt: '',
    focus_areas: [],
    tone: 'informative',
    length: 'medium',
    include_sources: true,
    include_social_media: true,
    include_fan_reactions: true,
    include_upcoming_events: true,
    exclude_topics: [],
  });
  const [focusAreaText, setFocusAreaText] = useState('');
  const [excludeTopicText, setExcludeTopicText] = useState('');

  useEffect(() => {
    loadPrompt();
  }, []);

  const loadPrompt = async () => {
    try {
      const existingPrompt = await promptService.getPrompt(userId, stan.id);
      if (existingPrompt) {
        setPrompt(existingPrompt);
        setFocusAreaText(existingPrompt.focus_areas?.join(', ') || '');
        setExcludeTopicText(existingPrompt.exclude_topics?.join(', ') || '');
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePrompt = async () => {
    setSaving(true);
    try {
      const updatedPrompt = {
        ...prompt,
        focus_areas: focusAreaText.split(',').map(area => area.trim()).filter(area => area.length > 0),
        exclude_topics: excludeTopicText.split(',').map(topic => topic.trim()).filter(topic => topic.length > 0),
      };

      const saved = await promptService.savePrompt(updatedPrompt);
      if (saved) {
        Alert.alert('Success', 'Briefing settings saved successfully!');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to save briefing settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save briefing settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    Alert.alert(
      'Reset to Default',
      'This will remove all custom settings and use the default briefing format. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const success = await promptService.deletePrompt(userId, stan.id);
            if (success) {
              Alert.alert('Success', 'Settings reset to default');
              navigation.goBack();
            } else {
              Alert.alert('Error', 'Failed to reset settings');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading prompt settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Briefing Settings</Text>
        <Text style={styles.subtitle}>{stan.categories.icon} {stan.name}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tone Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Briefing Tone</Text>
          <View style={styles.optionRow}>
            {['informative', 'casual', 'enthusiastic', 'formal'].map((tone) => (
              <TouchableOpacity
                key={tone}
                style={[
                  styles.optionButton,
                  prompt.tone === tone && styles.optionButtonSelected,
                ]}
                onPress={() => setPrompt({ ...prompt, tone })}
              >
                <Text
                  style={[
                    styles.optionText,
                    prompt.tone === tone && styles.optionTextSelected,
                  ]}
                >
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Length Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📏 Briefing Length</Text>
          <View style={styles.optionRow}>
            {['short', 'medium', 'long'].map((length) => (
              <TouchableOpacity
                key={length}
                style={[
                  styles.optionButton,
                  prompt.length === length && styles.optionButtonSelected,
                ]}
                onPress={() => setPrompt({ ...prompt, length })}
              >
                <Text
                  style={[
                    styles.optionText,
                    prompt.length === length && styles.optionTextSelected,
                  ]}
                >
                  {length.charAt(0).toUpperCase() + length.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Focus Areas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Focus Areas</Text>
          <Text style={styles.sectionDescription}>
            What specific topics should the briefing focus on? (comma separated)
          </Text>
          <TextInput
            style={styles.textInput}
            value={focusAreaText}
            onChangeText={setFocusAreaText}
            placeholder="e.g., new music releases, collaborations, tours"
            multiline
          />
        </View>

        {/* Exclude Topics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚫 Exclude Topics</Text>
          <Text style={styles.sectionDescription}>
            What topics should be avoided? (comma separated)
          </Text>
          <TextInput
            style={styles.textInput}
            value={excludeTopicText}
            onChangeText={setExcludeTopicText}
            placeholder="e.g., personal life, controversies"
            multiline
          />
        </View>

        {/* Include Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Include in Briefing</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>📱 Social Media Activity</Text>
            <Switch
              value={prompt.include_social_media}
              onValueChange={(value) =>
                setPrompt({ ...prompt, include_social_media: value })
              }
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>💬 Fan Reactions</Text>
            <Switch
              value={prompt.include_fan_reactions}
              onValueChange={(value) =>
                setPrompt({ ...prompt, include_fan_reactions: value })
              }
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>📅 Upcoming Events</Text>
            <Switch
              value={prompt.include_upcoming_events}
              onValueChange={(value) =>
                setPrompt({ ...prompt, include_upcoming_events: value })
              }
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>📎 Sources</Text>
            <Switch
              value={prompt.include_sources}
              onValueChange={(value) =>
                setPrompt({ ...prompt, include_sources: value })
              }
            />
          </View>
        </View>

        {/* Custom Prompt */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✏️ Custom Prompt (Advanced)</Text>
          <Text style={styles.sectionDescription}>
            Write your own custom briefing prompt. Use variables: {'{'}date{'}'}, {'{'}stan_name{'}'}, {'{'}category{'}'}
          </Text>
          <TextInput
            style={[styles.textInput, styles.customPromptInput]}
            value={prompt.custom_prompt}
            onChangeText={(value) => setPrompt({ ...prompt, custom_prompt: value })}
            placeholder="Leave blank to use automatic prompt generation"
            multiline
            numberOfLines={6}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.resetButton} onPress={resetToDefault}>
          <Text style={styles.resetButtonText}>Reset to Default</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={savePrompt}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  customPromptInput: {
    minHeight: 120,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchLabel: {
    fontSize: 16,
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});