import { NextResponse } from 'next/server';

// Sample briefings to show when no user data is available
const sampleBriefings = [
  {
    id: 'sample-1',
    stan_id: 'sample-stan-1',
    date: new Date().toISOString().split('T')[0],
    topics: [
      {
        title: 'Recent News & Activities',
        content: 'BTS members continue their solo projects with Jung Kook\'s "GOLDEN" dominating charts worldwide. V\'s latest single breaks streaming records while RM prepares for his upcoming documentary release. The group promises a 2025 reunion! 🎵✨',
        sources: ['https://variety.com/2024/music/news/bts-latest-update', 'https://billboard.com/music/pop/bts-news'],
        images: [
          {
            url: 'https://via.placeholder.com/400x300/FF6B6B/ffffff?text=BTS+Concert',
            alt: 'BTS Concert Image',
            source: 'https://variety.com/2024/music/news/bts-latest-update',
            thumbnail: 'https://via.placeholder.com/120x80/FF6B6B/ffffff?text=BTS'
          }
        ]
      },
      {
        title: 'Fan Community Updates',
        content: 'ARMY breaks Twitter records with #BTSPavedTheWay trending worldwide. Fan projects for Jin\'s military discharge countdown begin. Streaming parties for "Seven" help maintain Billboard Hot 100 position! 💜🌟',
        sources: ['https://twitter.com/BTS_twt', 'https://weverse.io/bts'],
        images: [
          {
            url: 'https://via.placeholder.com/400x200/1DA1F2/ffffff?text=Twitter+Trends',
            alt: 'Twitter trending',
            source: 'https://twitter.com/BTS_twt',
            thumbnail: 'https://via.placeholder.com/120x80/1DA1F2/ffffff?text=Trends'
          }
        ]
      }
    ],
    search_sources: ['https://variety.com/2024/music/news/bts-latest-update', 'https://billboard.com/music/pop/bts-news'],
    images: [],
    created_at: new Date().toISOString(),
    stans: {
      id: 'sample-stan-1',
      name: 'BTS',
      description: 'Global K-Pop superstars',
      categories: {
        name: 'K-Pop',
        icon: '🎵',
        color: '#FF6B6B'
      }
    }
  },
  {
    id: 'sample-2',
    stan_id: 'sample-stan-2',
    date: new Date().toISOString().split('T')[0],
    topics: [
      {
        title: 'Latest Album & Singles',
        content: 'Taylor Swift\'s "1989 (Taylor\'s Version)" continues chart dominance with vault tracks trending on TikTok. Surprise acoustic versions released exclusively on streaming platforms. Swifties decode Easter eggs for next re-recording! 🎤🌟',
        sources: ['https://variety.com/2024/music/news/taylor-swift-latest', 'https://billboard.com/music/pop/taylor-swift-news'],
        images: [
          {
            url: 'https://via.placeholder.com/400x300/C34A36/ffffff?text=Taylor+Swift+Album',
            alt: 'Taylor Swift Album Cover',
            source: 'https://variety.com/2024/music/news/taylor-swift-latest',
            thumbnail: 'https://via.placeholder.com/120x80/C34A36/ffffff?text=Album'
          }
        ]
      },
      {
        title: 'Tour Updates',
        content: 'Eras Tour film breaks box office records in opening weekend. International dates added for 2025 including Asia and Australia. Surprise songs tracker goes viral as fans predict setlists! ✨🎪',
        sources: ['https://taylorswift.com/tour', 'https://variety.com/music/taylor-swift-tour'],
        images: []
      }
    ],
    search_sources: ['https://variety.com/2024/music/news/taylor-swift-latest', 'https://billboard.com/music/pop/taylor-swift-news'],
    images: [],
    created_at: new Date().toISOString(),
    stans: {
      id: 'sample-stan-2',
      name: 'Taylor Swift',
      description: 'Pop music icon and storytelling genius',
      categories: {
        name: 'Music',
        icon: '🎸',
        color: '#C34A36'
      }
    }
  },
  {
    id: 'sample-3',
    stan_id: 'sample-stan-3',
    date: new Date().toISOString().split('T')[0],
    topics: [
      {
        title: 'Recent Performances',
        content: 'BLACKPINK\'s Lisa stuns at Paris Fashion Week while Jennie teases solo comeback. Rosé spotted in recording studio with Bruno Mars. Group contract renewal negotiations continue with YG Entertainment! 🖤💖',
        sources: ['https://variety.com/2024/music/news/blackpink-update', 'https://allkpop.com/article/blackpink-news'],
        images: [
          {
            url: 'https://via.placeholder.com/400x300/E4405F/ffffff?text=BLACKPINK+Performance',
            alt: 'BLACKPINK Performance',
            source: 'https://variety.com/2024/music/news/blackpink-update',
            thumbnail: 'https://via.placeholder.com/120x80/E4405F/ffffff?text=BP'
          }
        ]
      }
    ],
    search_sources: ['https://variety.com/2024/music/news/blackpink-update'],
    images: [],
    created_at: new Date().toISOString(),
    stans: {
      id: 'sample-stan-3',
      name: 'BLACKPINK',
      description: 'K-Pop girl group queens',
      categories: {
        name: 'K-Pop',
        icon: '🎵',
        color: '#FF6B6B'
      }
    }
  },
  {
    id: 'sample-4',
    stan_id: 'sample-stan-4',
    date: new Date().toISOString().split('T')[0],
    topics: [
      {
        title: 'Season Updates',
        content: 'Lakers sign key free agents to strengthen bench depth. LeBron and AD lead intense training camp sessions. Season opener against defending champions draws massive ticket demand! 🏀💜',
        sources: ['https://www.nba.com/lakers/news', 'https://espn.com/nba/team/_/name/lal/los-angeles-lakers'],
        images: [
          {
            url: 'https://via.placeholder.com/400x300/4ECDC4/ffffff?text=Lakers+Game',
            alt: 'Lakers Basketball Game',
            source: 'https://www.nba.com/lakers/news',
            thumbnail: 'https://via.placeholder.com/120x80/4ECDC4/ffffff?text=Lakers'
          }
        ]
      }
    ],
    search_sources: ['https://www.nba.com/lakers/news'],
    images: [],
    created_at: new Date().toISOString(),
    stans: {
      id: 'sample-stan-4',
      name: 'Los Angeles Lakers',
      description: 'NBA championship basketball team',
      categories: {
        name: 'Sports',
        icon: '⚽',
        color: '#4ECDC4'
      }
    }
  },
  {
    id: 'sample-5',
    stan_id: 'sample-marvel',
    date: new Date().toISOString().split('T')[0],
    topics: [
      {
        title: 'Latest MCU Updates',
        content: 'Deadpool 3 filming wraps with Ryan Reynolds teasing multiverse cameos. The Marvels post-credits scene sets up Secret Wars. Fantastic Four casting rumors heat up with fan favorites in talks! 🦸‍♂️🎬',
        sources: ['https://variety.com/marvel-news', 'https://deadline.com/mcu-updates'],
        images: [
          {
            url: 'https://via.placeholder.com/400x300/F9F871/000000?text=Marvel+Studios',
            alt: 'Marvel Studios Update',
            source: 'https://variety.com/marvel-news',
            thumbnail: 'https://via.placeholder.com/120x80/F9F871/000000?text=MCU'
          }
        ]
      },
      {
        title: 'Disney+ Series News',
        content: 'Loki Season 3 confirmed after massive viewership. Echo receives critical acclaim for groundbreaking representation. What If...? Season 3 explores darker multiverse stories! 📺✨',
        sources: ['https://disney.com/marvel-series', 'https://ign.com/marvel-tv']
      }
    ],
    search_sources: ['https://variety.com/marvel-news'],
    images: [],
    created_at: new Date().toISOString(),
    stans: {
      id: 'sample-marvel',
      name: 'Marvel Cinematic Universe',
      description: 'Superhero movie and TV franchise',
      categories: {
        name: 'Movies & TV',
        icon: '🎬',
        color: '#F9F871'
      }
    }
  },
  {
    id: 'sample-6',
    stan_id: 'sample-lol',
    date: new Date().toISOString().split('T')[0],
    topics: [
      {
        title: 'Worlds 2024 Championship',
        content: 'T1 advances to semifinals with Faker\'s legendary plays. Chinese teams dominate group stage. Prize pool reaches record $2.5 million with new sponsorships announced! 🏆🎮',
        sources: ['https://lolesports.com/worlds', 'https://espn.com/esports/lol'],
        images: [
          {
            url: 'https://via.placeholder.com/400x300/845EC2/ffffff?text=LoL+Worlds',
            alt: 'League of Legends Worlds',
            source: 'https://lolesports.com/worlds',
            thumbnail: 'https://via.placeholder.com/120x80/845EC2/ffffff?text=LoL'
          }
        ]
      },
      {
        title: 'Game Updates & Meta',
        content: 'New champion Briar breaks pick/ban records in pro play. Arena game mode returns with improved rewards. Season 14 changes preview massive jungle rework! ⚔️🐉',
        sources: ['https://leagueoflegends.com/news', 'https://reddit.com/r/leagueoflegends']
      }
    ],
    search_sources: ['https://lolesports.com'],
    images: [],
    created_at: new Date().toISOString(),
    stans: {
      id: 'sample-lol',
      name: 'League of Legends',
      description: 'Popular MOBA esports game',
      categories: {
        name: 'Gaming',
        icon: '🎮',
        color: '#845EC2'
      }
    }
  }
];

export async function GET() {
  try {
    return NextResponse.json({ 
      briefings: sampleBriefings,
      sample: true,
      message: 'Sample briefings - sign up to get personalized content!'
    });
  } catch (error) {
    console.error('Error fetching sample briefings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch sample briefings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}