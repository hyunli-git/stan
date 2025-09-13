'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Stan {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  user_id: string;
  category_id: string;
  is_active: boolean;
  categories: Category;
}

interface StanPrompt {
  id?: string;
  user_id: string;
  stan_id: string;
  custom_prompt?: string;
  focus_areas?: string[];
  exclude_topics?: string[];
  tone?: string;
  length?: string;
  include_sources: boolean;
  include_social_media: boolean;
  include_fan_reactions: boolean;
  include_upcoming_events: boolean;
}

interface DailyBriefing {
  id: string;
  stan_id: string;
  date: string;
  topics: Array<{
    title: string;
    content: string;
    sources?: string[];
  }>;
  search_sources: string[];
  created_at: string;
  stans?: {
    name: string;
    categories?: {
      name: string;
      icon: string;
    };
  };
}

export default function AdminPage() {
  const [briefings, setBriefings] = useState<DailyBriefing[]>([]);
  const [stans, setStans] = useState<Stan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedStan, setSelectedStan] = useState<Stan | null>(null);
  const [stanPrompt, setStanPrompt] = useState<StanPrompt | null>(null);
  const [activeTab, setActiveTab] = useState<'briefings' | 'stans' | 'prompts'>('briefings');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingStanId, setEditingStanId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      
      // Load briefings
      const briefingsResponse = await fetch('/api/admin/briefings');
      const briefingsData = await briefingsResponse.json();
      setBriefings(briefingsData.briefings || []);

      // Load stans
      const { data: stansData, error: stansError } = await supabase
        .from('stans')
        .select(`
          *,
          categories (
            id,
            name,
            icon,
            color
          )
        `)
        .order('name');

      if (stansError) throw stansError;
      setStans(stansData || []);

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const generateBriefings = async () => {
    setGenerating(true);
    setMessage('Generating daily briefings...');
    try {
      const response = await fetch('/api/daily-briefings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      const data = await response.json();
      setMessage(data.message || 'Generation complete!');
      await loadData();
    } catch (error) {
      console.error('Error generating briefings:', error);
      setMessage('Error generating briefings');
    } finally {
      setGenerating(false);
    }
  };

  const updateStan = async (stanId: string, updates: Partial<Stan>) => {
    try {
      const { error } = await supabase
        .from('stans')
        .update(updates)
        .eq('id', stanId);

      if (error) throw error;

      await loadData();
      setEditingStanId(null);
      setMessage('Stan updated successfully!');
    } catch (error) {
      console.error('Error updating stan:', error);
      setMessage('Failed to update stan');
    }
  };

  const loadStanPrompt = async (stanId: string) => {
    try {
      const { data, error } = await supabase
        .from('stan_prompts')
        .select('*')
        .eq('stan_id', stanId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setStanPrompt(data || null);
    } catch (error) {
      console.error('Error loading stan prompt:', error);
      setStanPrompt(null);
    }
  };

  const saveStanPrompt = async (stanId: string, prompt: Partial<StanPrompt>) => {
    try {
      const { error } = await supabase
        .from('stan_prompts')
        .upsert({
          stan_id: stanId,
          user_id: '00000000-0000-0000-0000-000000000000', // System user
          ...prompt
        });

      if (error) throw error;
      setMessage('Prompt saved successfully!');
      await loadStanPrompt(stanId);
    } catch (error) {
      console.error('Error saving prompt:', error);
      setMessage('Failed to save prompt');
    }
  };

  const generateSingleBriefing = async (stanId: string) => {
    setGenerating(true);
    setMessage('Generating briefing...');
    try {
      const stan = stans.find(s => s.id === stanId);
      if (!stan) throw new Error('Stan not found');

      const response = await fetch('/api/generate-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stan: stan,
          userId: '00000000-0000-0000-0000-000000000000'
        })
      });

      if (!response.ok) throw new Error('Failed to generate briefing');

      setMessage('Briefing generated successfully!');
      await loadData();
    } catch (error) {
      console.error('Error generating briefing:', error);
      setMessage('Failed to generate briefing');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>📰 STAN Admin Dashboard</h1>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        {['briefings', 'stans', 'prompts'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab ? '#000' : '#fff',
              color: activeTab === tab ? '#fff' : '#000',
              border: '1px solid #000',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Message Display */}
      {message && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          background: '#e8f4f8', 
          borderRadius: '4px',
          textAlign: 'center',
          color: '#333'
        }}>
          {message}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'briefings' && (
        <div>
          <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '8px' }}>
            <button 
              onClick={generateBriefings}
              disabled={generating}
              style={{
                padding: '10px 20px',
                background: generating ? '#ccc' : '#000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: generating ? 'not-allowed' : 'pointer',
                marginRight: '10px'
              }}
            >
              {generating ? 'Generating...' : '🚀 Generate All Briefings'}
            </button>
            
            <button 
              onClick={loadData}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh
            </button>
          </div>

          <div style={{ marginBottom: '20px', textAlign: 'center', color: '#666' }}>
            Total Briefings: {briefings.length} | Today: {new Date().toLocaleDateString()}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading briefings...</div>
          ) : briefings.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '8px' }}>
              <h3>No briefings generated yet</h3>
              <p>Click "Generate All Briefings" to create today's briefings</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {briefings.map((briefing) => (
                <div 
                  key={briefing.id}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '15px',
                    background: 'white'
                  }}
                >
                  <div style={{ marginBottom: '10px' }}>
                    <h3 style={{ margin: '0 0 5px 0' }}>
                      {briefing.stans?.categories?.icon} {briefing.stans?.name || 'Unknown Stan'}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Date: {briefing.date} | 
                      Created: {new Date(briefing.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  {briefing.topics.map((topic, index) => (
                    <div key={index} style={{ marginBottom: '15px' }}>
                      <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>
                        {topic.title}
                      </h4>
                      <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
                        {topic.content}
                      </p>
                      {topic.sources && topic.sources.length > 0 && (
                        <div style={{ fontSize: '12px' }}>
                          Sources: {topic.sources.map((source, i) => (
                            <a 
                              key={i} 
                              href={source} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ marginRight: '10px', color: '#0066cc' }}
                            >
                              [Link {i + 1}]
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {briefing.search_sources && briefing.search_sources.length > 0 && (
                    <div style={{ 
                      marginTop: '10px', 
                      paddingTop: '10px', 
                      borderTop: '1px solid #e0e0e0',
                      fontSize: '12px',
                      color: '#999'
                    }}>
                      All sources: {briefing.search_sources.length} links found
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stans' && (
        <div>
          <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '8px', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 10px 0' }}>Manage Stans</h2>
            <p style={{ margin: 0, color: '#666' }}>Edit stan details, add images, and manage content settings</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading stans...</div>
          ) : stans.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '8px' }}>
              <h3>No stans found</h3>
              <p>Add some stans to get started</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {stans.map(stan => (
                <div key={stan.id} style={{
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  {editingStanId === stan.id ? (
                    <EditStanForm
                      stan={stan}
                      categories={categories}
                      onSave={(updates) => updateStan(stan.id, updates)}
                      onCancel={() => setEditingStanId(null)}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: stan.categories.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            color: 'white',
                            overflow: 'hidden'
                          }}
                        >
                          {stan.image_url ? (
                            <img
                              src={stan.image_url}
                              alt={stan.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = stan.categories.icon;
                              }}
                            />
                          ) : (
                            stan.categories.icon
                          )}
                        </div>
                        <div>
                          <h3 style={{ margin: '0 0 5px 0' }}>{stan.name}</h3>
                          <p style={{ margin: '0 0 5px 0', color: '#666' }}>{stan.categories.name}</p>
                          <p style={{ margin: '0', fontSize: '14px', color: '#999' }}>{stan.description}</p>
                          {stan.image_url && (
                            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#0066cc' }}>
                              Image: {stan.image_url.substring(0, 50)}...
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => {
                            setSelectedStan(stan);
                            setActiveTab('prompts');
                            loadStanPrompt(stan.id);
                          }}
                          style={{
                            padding: '8px 12px',
                            background: '#8A2BE2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          📝 Prompts
                        </button>
                        <button
                          onClick={() => generateSingleBriefing(stan.id)}
                          disabled={generating}
                          style={{
                            padding: '8px 12px',
                            background: generating ? '#ccc' : '#28A745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: generating ? 'not-allowed' : 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🚀 Generate
                        </button>
                        <button
                          onClick={() => setEditingStanId(stan.id)}
                          style={{
                            padding: '8px 12px',
                            background: '#FFC107',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'prompts' && (
        <div>
          {!selectedStan ? (
            <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '8px' }}>
              <h3>Select a stan to manage prompts</h3>
              <p>Go to the Stans tab and click "📝 Prompts" on any stan</p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Prompts for {selectedStan.name}</h2>
                <button
                  onClick={() => setActiveTab('stans')}
                  style={{
                    padding: '8px 12px',
                    background: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  ← Back to Stans
                </button>
              </div>
              <PromptEditor
                stan={selectedStan}
                prompt={stanPrompt}
                onSave={(prompt) => saveStanPrompt(selectedStan.id, prompt)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Edit Stan Form Component
function EditStanForm({
  stan,
  categories,
  onSave,
  onCancel
}: {
  stan: Stan;
  categories: Category[];
  onSave: (updates: Partial<Stan>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: stan.name,
    description: stan.description,
    image_url: stan.image_url || '',
    category_id: stan.category_id,
    is_active: stan.is_active
  });

  return (
    <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
      <h3 style={{ margin: '0 0 20px 0' }}>Edit {stan.name}</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            minHeight: '60px',
            resize: 'vertical'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Image URL
        </label>
        <input
          type="url"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          placeholder="https://example.com/image.jpg"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
        {formData.image_url && (
          <div style={{ marginTop: '10px' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>Preview:</p>
            <img
              src={formData.image_url}
              alt="Preview"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #ddd'
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling!.style.display = 'block';
              }}
            />
            <div style={{ display: 'none', fontSize: '12px', color: '#999' }}>
              ❌ Invalid image URL
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Category
        </label>
        <select
          value={formData.category_id}
          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          />
          <span style={{ fontWeight: 'bold' }}>Active</span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => onSave(formData)}
          style={{
            padding: '10px 20px',
            background: '#28A745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          💾 Save Changes
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            background: '#6C757D',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  );
}

// Prompt Editor Component
function PromptEditor({
  stan,
  prompt,
  onSave
}: {
  stan: Stan;
  prompt: StanPrompt | null;
  onSave: (prompt: Partial<StanPrompt>) => void;
}) {
  const [formData, setFormData] = useState({
    custom_prompt: prompt?.custom_prompt || '',
    focus_areas: prompt?.focus_areas?.join(', ') || '',
    exclude_topics: prompt?.exclude_topics?.join(', ') || '',
    tone: prompt?.tone || 'informative',
    length: prompt?.length || 'medium',
    include_sources: prompt?.include_sources ?? true,
    include_social_media: prompt?.include_social_media ?? true,
    include_fan_reactions: prompt?.include_fan_reactions ?? true,
    include_upcoming_events: prompt?.include_upcoming_events ?? true
  });

  useEffect(() => {
    if (prompt) {
      setFormData({
        custom_prompt: prompt.custom_prompt || '',
        focus_areas: prompt.focus_areas?.join(', ') || '',
        exclude_topics: prompt.exclude_topics?.join(', ') || '',
        tone: prompt.tone || 'informative',
        length: prompt.length || 'medium',
        include_sources: prompt.include_sources ?? true,
        include_social_media: prompt.include_social_media ?? true,
        include_fan_reactions: prompt.include_fan_reactions ?? true,
        include_upcoming_events: prompt.include_upcoming_events ?? true
      });
    }
  }, [prompt]);

  const handleSave = () => {
    const promptData = {
      ...formData,
      focus_areas: formData.focus_areas.split(',').map(s => s.trim()).filter(Boolean),
      exclude_topics: formData.exclude_topics.split(',').map(s => s.trim()).filter(Boolean)
    };
    onSave(promptData);
  };

  return (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Custom Prompt (optional)
        </label>
        <textarea
          value={formData.custom_prompt}
          onChange={(e) => setFormData({ ...formData, custom_prompt: e.target.value })}
          placeholder="Use variables: {date}, {stan_name}, {category}, {focus_areas}, {tone}, {include_sources}"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            minHeight: '100px',
            resize: 'vertical'
          }}
        />
        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
          Leave empty to use default prompt with customizations below
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Focus Areas (comma-separated)
          </label>
          <input
            type="text"
            value={formData.focus_areas}
            onChange={(e) => setFormData({ ...formData, focus_areas: e.target.value })}
            placeholder="music releases, collaborations, awards"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Exclude Topics (comma-separated)
          </label>
          <input
            type="text"
            value={formData.exclude_topics}
            onChange={(e) => setFormData({ ...formData, exclude_topics: e.target.value })}
            placeholder="controversies, personal life"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Tone
          </label>
          <select
            value={formData.tone}
            onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="informative">📊 Informative</option>
            <option value="casual">😊 Casual</option>
            <option value="enthusiastic">🎉 Enthusiastic</option>
            <option value="professional">💼 Professional</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Length
          </label>
          <select
            value={formData.length}
            onChange={(e) => setFormData({ ...formData, length: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="short">📝 Short (2-3 sentences)</option>
            <option value="medium">📄 Medium (3-4 sentences)</option>
            <option value="long">📚 Long (4-5 sentences)</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Include Sections:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            ['include_sources', '🔗 Sources'],
            ['include_social_media', '📱 Social Media'],
            ['include_fan_reactions', '💬 Fan Reactions'],
            ['include_upcoming_events', '📅 Upcoming Events']
          ].map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={formData[key as keyof typeof formData] as boolean}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '12px',
          background: '#007BFF',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        💾 Save Prompt Settings
      </button>
    </div>
  );
}