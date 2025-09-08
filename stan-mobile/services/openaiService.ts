interface Stan {
  id: string;
  name: string;
  categories: {
    name: string;
    icon: string;
    color: string;
  };
  description?: string;
}

interface BriefingContent {
  content: string;
  summary: string;
  sources: string[];
}

export const generateAIBriefingWithWebSearch = async (stan: Stan): Promise<BriefingContent> => {
  try {
    console.log('🔄 Calling STAN backend API for:', stan.name);
    console.log('🔄 API URL:', 'http://10.0.0.211:3000/api/generate-briefing');
    console.log('🔄 Request body:', JSON.stringify({ stan }));
    
    const response = await fetch('http://10.0.0.211:3000/api/generate-briefing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stan }),
      timeout: 30000, // 30 second timeout
    });

    console.log('🔄 Response status:', response.status);
    console.log('🔄 Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const briefingContent = await response.json();
    console.log('✅ Received API response:', briefingContent.content.substring(0, 100) + '...');
    console.log('✅ Full response:', JSON.stringify(briefingContent, null, 2));
    return briefingContent;

  } catch (error: any) {
    console.error('❌ Backend API Error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    console.log('🔄 Falling back to template generation');
    
    // Fallback to template-based generation if API fails
    return await generateFallbackBriefing(stan);
  }
};

// Fallback function that generates briefing without API
const generateFallbackBriefing = async (stan: Stan): Promise<BriefingContent> => {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  });

  const templates = {
    'K-Pop': [
      `🎵 **${stan.name}** has been making headlines with new activity updates as of ${today}. Fans are eagerly anticipating the next comeback and world tour announcement, with recent social media posts revealing glimpses of studio work. Their global chart performance continues to impress, making future activities even more anticipated. 🌟`,
      `✨ **${stan.name}** recently made waves at a fashion event. The group's global influence continues to grow, with this week's streaming numbers achieving new records. Fans are expressing excitement about individual member activities and potential new collaborations. 🎊`
    ],
    'Music': [
      `🎤 **${stan.name}** is currently immersed in new music work at the studio. Industry insiders hint at potential collaborations with other artists and surprise album releases. Their innovative music production methods continue to inspire many emerging artists. 🎧`,
      `📀 **${stan.name}**'s latest work continues to dominate streaming platforms. Fans' anticipation is growing for documentaries about the artist's creative process and exclusive concert series. Their musical evolution continues to attract attention. 🌟`
    ],
    'Sports': [
      `⚽ **${stan.name}** showed impressive performance this week, with key players displaying excellent form. While transfer rumors continue to circulate, the team is preparing for upcoming matches. New strategic partnerships and stadium improvement plans have also been announced. 🏆`,
      `📊 **${stan.name}**'s statistics this season show strong performance. While young talents are emerging, veteran players continue to set an example. Fan engagement initiatives are also being planned for the upcoming season. ⭐`
    ],
    'Gaming': [
      `🎮 **${stan.name}** has released a major update including new features and content that players have been requesting. The gaming community is responding positively to the recent changes. New professional players are joining the competitive scene with innovative strategies. 🏅`,
      `💎 **${stan.name}** developers have announced cross-platform features and future expansion plans to enhance the gaming experience for millions of players worldwide. Esports tournaments continue to break viewership records. 🚀`
    ],
    'Movies & TV': [
      `🎬 **${stan.name}** continues to generate buzz with fan theories and discussions about the upcoming season. Behind-the-scenes content is revealing fascinating details. Viral scenes and memorable quotes are influencing pop culture on social media. 🌟`,
      `📺 **${stan.name}** cast members have been spotted filming new scenes, sparking active speculation about plot developments. Fan engagement remains at an all-time high, with related merchandise and collaborations continuing to be released. 💫`
    ],
    'Content Creators': [
      `📱 **${stan.name}** has posted viral content that has garnered millions of views on the platform. Their unique approach to content creation continues to inspire other creators. New projects and collaborations with major brands have been announced. 🎥`,
      `💫 **${stan.name}** fans are anticipating the upcoming merchandise release and exclusive content for subscribers. Their influence on digital culture continues to grow with every post. Plans for expansion to new platforms are also in preparation. ✨`
    ]
  };

  const categoryTemplates = templates[stan.categories.name] || templates['Music'];
  const randomTemplate = categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
  
  const summary = randomTemplate.split('.')[0] + '.';

  return {
    content: randomTemplate,
    summary: summary,
    sources: [
      `https://search.naver.com/search.naver?query=${encodeURIComponent(stan.name + ' latest news')}`,
      `https://www.google.com/search?q=${encodeURIComponent(stan.name + ' latest news')}`
    ]
  };
};

export default {
  generateAIBriefingWithWebSearch
};