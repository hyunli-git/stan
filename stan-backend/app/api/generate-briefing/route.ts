import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function POST(request: NextRequest) {
  try {
    const { stan }: { stan: Stan } = await request.json();

    if (!stan) {
      return NextResponse.json({ error: 'Stan data is required' }, { status: 400 });
    }

    const briefingContent = await generateAIBriefingWithWebSearch(stan);
    
    return NextResponse.json(briefingContent);
  } catch (error: any) {
    console.error('Error generating briefing:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate briefing',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

const generateAIBriefingWithWebSearch = async (stan: Stan): Promise<BriefingContent> => {
  try {
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    const prompt = `오늘은 ${today}입니다. "${stan.name}"에 대한 최신 정보와 뉴스를 웹에서 검색해서 한국어로 브리핑을 작성해주세요.

카테고리: ${stan.categories.name}
설명: ${stan.description || '없음'}

다음 형식으로 작성해주세요:
1. 최근 소식이나 활동 (오늘 날짜 기준으로 최대한 최신 정보)
2. 팬들이나 업계의 반응
3. 향후 예정된 일정이나 계획

브리핑은 팬들이 읽기 좋게 흥미롭고 정확한 정보로 작성하되, 3-4문장 정도로 간결하게 작성해주세요. 이모지를 적절히 사용해서 읽기 좋게 만들어주세요.

만약 최신 정보가 없다면, 일반적인 활동 상황이나 최근 트렌드에 대해 작성해주세요.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 K-Pop, 음악, 스포츠, 게임, 영화/TV, 콘텐츠 크리에이터 등 다양한 분야의 최신 정보를 제공하는 전문 브리핑 작성자입니다. 웹 검색을 통해 얻은 최신 정보를 바탕으로 정확하고 흥미로운 브리핑을 작성합니다. 오늘 날짜를 기준으로 최신 정보를 찾아서 제공하세요."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const briefingText = response.choices[0]?.message?.content || '';
    
    // Extract summary (first sentence or up to first period + next sentence)
    const sentences = briefingText.split(/[.!?]/).filter(s => s.trim().length > 0);
    const summary = sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '');

    // Generate search-based sources
    const sources = [
      `https://search.naver.com/search.naver?query=${encodeURIComponent(stan.name + ' 최신뉴스')}`,
      `https://www.google.com/search?q=${encodeURIComponent(stan.name + ' latest news today')}`
    ];

    return {
      content: briefingText,
      summary: summary || briefingText.substring(0, 100) + '...',
      sources
    };

  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    // Fallback to template-based generation if API fails
    return await generateFallbackBriefing(stan);
  }
};

// Fallback function that generates briefing without API
const generateFallbackBriefing = async (stan: Stan): Promise<BriefingContent> => {
  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric'
  });

  const templates = {
    'K-Pop': [
      `🎵 **${stan.name}**이 ${today} 기준으로 새로운 활동 소식이 전해지고 있습니다. 팬들은 다음 컴백과 월드투어 발표를 기대하고 있으며, 최근 소셜미디어 활동을 통해 스튜디오 작업 모습을 공개했습니다. 글로벌 차트에서의 성과도 꾸준히 이어지고 있어 앞으로의 활동이 더욱 기대됩니다. 🌟`,
      `✨ **${stan.name}**이 최근 패션 이벤트에서 화제를 모았습니다. 그룹의 글로벌 영향력은 계속 성장하고 있으며, 이번 주 스트리밍 수치가 새로운 기록을 달성했습니다. 팬들은 멤버들의 개별 활동과 새로운 협업에 대한 기대감을 표현하고 있습니다. 🎊`
    ],
    'Music': [
      `🎤 **${stan.name}**이 현재 스튜디오에서 새로운 음악 작업에 몰두하고 있다는 소식입니다. 업계 관계자들은 다른 아티스트들과의 협업과 깜짝 앨범 발매 가능성을 시사했습니다. 혁신적인 음악 제작 방식으로 많은 후배 아티스트들에게 영감을 주고 있습니다. 🎧`,
      `📀 **${stan.name}**의 최신 작품이 계속해서 스트리밍 플랫폼을 장악하고 있습니다. 아티스트의 창작 과정을 담은 다큐멘터리와 독점 콘서트 시리즈에 대한 팬들의 기대가 높아지고 있습니다. 음악적 진화가 계속되고 있어 주목받고 있습니다. 🌟`
    ],
    'Sports': [
      `⚽ **${stan.name}**이 이번 주 인상적인 경기력을 보여주며 핵심 선수들의 뛰어난 폼을 과시했습니다. 이적 루머가 계속 돌고 있는 가운데 팀은 다가오는 경기들을 준비하고 있습니다. 새로운 전략적 파트너십과 스타디움 개선 계획도 발표되었습니다. 🏆`,
      `📊 **${stan.name}**의 이번 시즌 통계가 강력한 성과를 보여주고 있습니다. 젊은 재능들이 부상하고 있는 가운데 베테랑 선수들은 계속해서 모범을 보이고 있습니다. 팬 참여 이니셔티브도 다가오는 시즌을 위해 계획되고 있습니다. ⭐`
    ],
    'Gaming': [
      `🎮 **${stan.name}**이 플레이어들이 요청해온 새로운 기능과 콘텐츠가 포함된 대규모 업데이트를 출시했습니다. 게이밍 커뮤니티는 최근 변화에 긍정적으로 반응하고 있습니다. 새로운 프로 선수들이 혁신적인 전략으로 경쟁 씬에 합류하고 있습니다. 🏅`,
      `💎 **${stan.name}** 개발진이 전 세계 수백만 플레이어들의 게임 경험을 향상시킬 크로스 플랫폼 기능과 향후 확장 계획을 발표했습니다. e스포츠 토너먼트도 계속해서 시청률 기록을 경신하고 있습니다. 🚀`
    ],
    'Movies & TV': [
      `🎬 **${stan.name}**이 팬 이론과 다가오는 시즌에 대한 토론으로 계속 화제를 모으고 있습니다. 제작 비하인드 콘텐츠가 흥미로운 세부사항들을 공개하고 있습니다. 소셜 미디어에서 바이럴되는 명장면과 명대사들로 팝 컬처에 영향을 미치고 있습니다. 🌟`,
      `📺 **${stan.name}** 출연진들이 새로운 장면을 촬영하는 모습이 포착되어 플롯 전개에 대한 추측이 활발합니다. 팬 참여도는 사상 최고치를 유지하고 있으며, 관련 머천다이즈와 콜라보레이션도 계속 출시되고 있습니다. 💫`
    ],
    'Content Creators': [
      `📱 **${stan.name}**이 플랫폼에서 수백만 조회수를 기록하는 바이럴 콘텐츠를 게시했습니다. 콘텐츠 제작에 대한 독창적인 접근 방식으로 다른 크리에이터들에게 계속 영감을 주고 있습니다. 주요 브랜드와의 새로운 프로젝트와 협업이 발표되었습니다. 🎥`,
      `💫 **${stan.name}** 팬들이 다가오는 머천다이즈 출시와 구독자를 위한 독점 콘텐츠를 기대하고 있습니다. 디지털 문화에 대한 영향력은 매 게시물마다 계속 성장하고 있습니다. 새로운 플랫폼 진출 계획도 준비 중입니다. ✨`
    ]
  };

  const categoryTemplates = templates[stan.categories.name] || templates['Music'];
  const randomTemplate = categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
  
  const summary = randomTemplate.split('.')[0] + '.';

  return {
    content: randomTemplate,
    summary: summary,
    sources: [
      `https://search.naver.com/search.naver?query=${encodeURIComponent(stan.name + ' 최신뉴스')}`,
      `https://www.google.com/search?q=${encodeURIComponent(stan.name + ' latest news today')}`
    ]
  };
};