# STAN - Prompt Management System

## Overview
The STAN app now includes a comprehensive prompt management system that allows users to customize how AI briefings are generated for each of their stans. This system provides fine-grained control over briefing content, tone, length, and focus areas.

## Features

### 🎯 Custom Briefing Settings
- **Focus Areas**: Specify what topics the briefing should prioritize
- **Exclude Topics**: Define topics to avoid in briefings
- **Tone Options**: Choose from informative, casual, enthusiastic, or formal
- **Length Control**: Select short, medium, or long briefings
- **Section Control**: Toggle inclusion of social media, fan reactions, upcoming events, and sources

### ✏️ Advanced Custom Prompts
- Write fully custom prompts with variable substitution
- Use template variables: `{date}`, `{stan_name}`, `{category}`, `{focus_areas}`, `{tone}`
- Override default prompt generation completely

### 📋 Template System
- Pre-built templates for different categories (Music, K-Pop, Sports, etc.)
- Category-specific prompt optimization
- Default templates that work out of the box

## Database Schema

### `stan_prompts` Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to profiles)
- stan_id: UUID (Foreign Key to stans)
- custom_prompt: TEXT (Optional custom prompt)
- focus_areas: JSONB (Array of focus topics)
- tone: TEXT (informative, casual, enthusiastic, formal)
- length: TEXT (short, medium, long)
- include_sources: BOOLEAN
- include_social_media: BOOLEAN  
- include_fan_reactions: BOOLEAN
- include_upcoming_events: BOOLEAN
- exclude_topics: JSONB (Array of topics to exclude)
```

### `prompt_templates` Table
```sql
- id: UUID (Primary Key)
- category_id: UUID (Foreign Key to categories)
- name: TEXT (Template name)
- description: TEXT (Template description)
- template: TEXT (Prompt template with variables)
- variables: JSONB (Array of available variables)
- is_default: BOOLEAN
```

## API Endpoints

### Prompt Management
- `GET /api/prompts?user_id={id}&stan_id={id}` - Get custom prompt for a stan
- `POST /api/prompts` - Save/update custom prompt
- `DELETE /api/prompts?user_id={id}&stan_id={id}` - Reset to default

### Template Management  
- `GET /api/prompt-templates?category_id={id}` - Get templates for category
- `GET /api/prompt-templates` - Get all templates

### Enhanced Briefing Generation
- `POST /api/generate-briefing` - Generate briefing with custom prompt support
  - Body: `{ stan: StanObject, userId?: string }`
  - Automatically uses custom prompts if userId provided

## How It Works

### 1. Default Behavior (No Custom Prompt)
When no custom prompt exists, the system uses intelligent defaults based on:
- Stan category (Music, K-Pop, Sports, etc.)
- Standard sections (recent news, fan reactions, upcoming events)
- Default tone and length settings

### 2. Custom Settings Applied
When custom settings exist but no custom prompt:
- Modifies default prompt based on user preferences
- Adds/removes sections based on include/exclude settings
- Adjusts tone and length accordingly
- Incorporates focus areas and excluded topics

### 3. Fully Custom Prompts
When a custom prompt is provided:
- Replaces entire prompt generation logic
- Performs variable substitution
- Uses custom prompt exactly as written

## Usage Examples

### Basic Customization
```javascript
const prompt = {
  user_id: "user-123",
  stan_id: "stan-456", 
  focus_areas: ["new music releases", "collaborations"],
  tone: "enthusiastic",
  length: "long",
  exclude_topics: ["personal life", "controversies"]
};

await promptService.savePrompt(prompt);
```

### Custom Prompt with Variables
```javascript
const customPrompt = {
  user_id: "user-123",
  stan_id: "stan-456",
  custom_prompt: `Today is {date}. Create a detailed briefing about {stan_name} focusing on {focus_areas}. 
  
  Write in an {tone} tone and include:
  1. Latest music releases and chart performance
  2. Upcoming tour dates and events  
  3. Social media highlights
  
  Keep the briefing {length} and include sources: {include_sources}`
};

await promptService.savePrompt(customPrompt);
```

## Benefits

### For Users
- **Personalized Content**: Briefings tailored to individual interests
- **Relevance Control**: Focus on what matters most to each user
- **Tone Preferences**: Match briefing style to user preferences
- **Noise Reduction**: Exclude unwanted topics and controversies

### For App Quality
- **Higher Engagement**: More relevant content keeps users interested
- **Reduced Noise**: Users see only what they care about
- **Scalability**: One system handles all stan types and user preferences
- **Flexibility**: Easy to add new customization options

## Implementation Status

✅ **Completed**
- Database schema and migrations
- Backend API endpoints (prompts, templates, enhanced generation)
- Mobile service layer (promptService.ts)
- Prompt management UI screen (PromptManagerScreen.tsx)
- Integration with existing briefing generation

🔄 **In Progress**
- UI integration with main navigation
- Template management interface
- Batch prompt updates

📋 **Future Enhancements**
- AI-suggested focus areas based on stan activity
- Community prompt templates sharing
- A/B testing different prompt variations
- Analytics on prompt effectiveness
- Scheduled prompt updates (e.g., tour season vs. off-season prompts)

## Testing

The system can be tested using the enhanced TestApp which now includes a "Manage Briefing Settings" button that demonstrates the prompt management capabilities.

Users can:
1. Generate default briefings
2. View prompt management options
3. See how customization would affect briefing generation

The prompt management system is now fully functional and ready for integration with the main STAN mobile app interface.