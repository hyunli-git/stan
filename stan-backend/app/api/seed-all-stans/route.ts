import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

// Popular stans that should always have content available
const POPULAR_STANS = [
  // K-Pop
  { name: 'BTS', category: 'K-Pop', description: 'Global K-Pop superstars breaking barriers worldwide' },
  { name: 'BLACKPINK', category: 'K-Pop', description: 'Queens of K-Pop with killer fashion and music' },
  { name: 'Stray Kids', category: 'K-Pop', description: 'Self-producing K-Pop group with powerful performances' },
  { name: 'SEVENTEEN', category: 'K-Pop', description: 'Synchronized kings with 13 members' },
  { name: 'TWICE', category: 'K-Pop', description: 'Nation\'s girl group with catchy hits' },
  { name: 'NCT Dream', category: 'K-Pop', description: 'Young and energetic K-Pop group' },
  { name: 'ENHYPEN', category: 'K-Pop', description: 'Rising K-Pop stars with vampire concept' },
  { name: 'aespa', category: 'K-Pop', description: 'Next-gen K-Pop with virtual avatars' },
  { name: 'ITZY', category: 'K-Pop', description: 'Teen crush concept queens' },
  { name: 'TXT', category: 'K-Pop', description: 'Tomorrow X Together bringing Gen Z vibes' },
  
  // Western Music
  { name: 'Taylor Swift', category: 'Music', description: 'Storytelling genius breaking records with every era' },
  { name: 'Olivia Rodrigo', category: 'Music', description: 'Gen Z pop-rock sensation' },
  { name: 'Bad Bunny', category: 'Music', description: 'Reggaeton king bringing Latin music worldwide' },
  { name: 'Drake', category: 'Music', description: 'Hip-hop icon dominating charts' },
  { name: 'The Weeknd', category: 'Music', description: 'R&B superstar with dark aesthetics' },
  { name: 'Billie Eilish', category: 'Music', description: 'Genre-defying artist with haunting melodies' },
  { name: 'Dua Lipa', category: 'Music', description: 'Pop princess with disco influences' },
  { name: 'Harry Styles', category: 'Music', description: 'Solo artist and fashion icon' },
  { name: 'Ariana Grande', category: 'Music', description: 'Vocal powerhouse with whistle notes' },
  { name: 'SZA', category: 'Music', description: 'Alternative R&B queen' },
  
  // Sports
  { name: 'Los Angeles Lakers', category: 'Sports', description: 'NBA dynasty with LeBron and AD' },
  { name: 'Golden State Warriors', category: 'Sports', description: 'Dynasty team with Steph Curry' },
  { name: 'Real Madrid', category: 'Sports', description: 'Football giants with global fanbase' },
  { name: 'Manchester United', category: 'Sports', description: 'Red Devils of Premier League' },
  { name: 'Barcelona', category: 'Sports', description: 'Catalan football club with tiki-taka style' },
  { name: 'Liverpool FC', category: 'Sports', description: 'You\'ll Never Walk Alone' },
  { name: 'Paris Saint-Germain', category: 'Sports', description: 'French football powerhouse' },
  { name: 'New York Yankees', category: 'Sports', description: 'Baseball\'s most successful franchise' },
  { name: 'Boston Celtics', category: 'Sports', description: 'NBA team with championship legacy' },
  { name: 'Ferrari F1', category: 'Sports', description: 'Legendary Formula 1 racing team' },
  
  // Gaming
  { name: 'League of Legends', category: 'Gaming', description: 'World\'s biggest MOBA esport' },
  { name: 'Valorant', category: 'Gaming', description: 'Tactical shooter taking over esports' },
  { name: 'Fortnite', category: 'Gaming', description: 'Battle royale with constant updates' },
  { name: 'Minecraft', category: 'Gaming', description: 'Infinite creativity in blocky worlds' },
  { name: 'Genshin Impact', category: 'Gaming', description: 'Anime-style open world RPG' },
  { name: 'Call of Duty', category: 'Gaming', description: 'FPS franchise with yearly releases' },
  { name: 'Pokemon', category: 'Gaming', description: 'Gotta catch \'em all!' },
  { name: 'The Legend of Zelda', category: 'Gaming', description: 'Nintendo\'s adventure masterpiece' },
  { name: 'Grand Theft Auto', category: 'Gaming', description: 'Open world crime saga' },
  { name: 'Apex Legends', category: 'Gaming', description: 'Battle royale with unique legends' },
  
  // Movies & TV
  { name: 'Marvel Cinematic Universe', category: 'Movies & TV', description: 'Superhero franchise universe' },
  { name: 'Star Wars', category: 'Movies & TV', description: 'Epic space opera saga' },
  { name: 'Stranger Things', category: 'Movies & TV', description: 'Sci-fi horror nostalgia trip' },
  { name: 'The Last of Us', category: 'Movies & TV', description: 'Post-apocalyptic HBO masterpiece' },
  { name: 'Wednesday', category: 'Movies & TV', description: 'Addams Family Netflix hit' },
  { name: 'One Piece', category: 'Movies & TV', description: 'Epic anime adventure on Netflix' },
  { name: 'Avatar (James Cameron)', category: 'Movies & TV', description: 'Sci-fi film franchise on Pandora' },
  { name: 'Harry Potter', category: 'Movies & TV', description: 'Wizarding World franchise' },
  { name: 'DC Universe', category: 'Movies & TV', description: 'Batman, Superman and more' },
  { name: 'The Boys', category: 'Movies & TV', description: 'Dark superhero satire on Prime' }
];

// Generate realistic briefing content
const generateBriefingContent = (stanName: string, category: string) => {
  const today = new Date();
  interface TopicTemplate {
    title: string;
    content: string;
    sources: string[];
  }

  const templates: Record<string, TopicTemplate[]> = {
    'K-Pop': [
      {
        title: "🎵 Music & Performance Update",
        content: `${stanName} just dropped a surprise dance practice video that's already at 5M views! The choreography showcases incredible synchronization and their signature style. Fans are calling it their best performance yet!`,
        sources: [`https://youtube.com/${stanName}`, `https://twitter.com/${stanName}`]
      },
      {
        title: "📱 Social Media Moments",
        content: `${stanName} is trending worldwide after members shared behind-the-scenes content from their latest project. The hashtag #${stanName}Update has over 2 million posts with fans sharing their favorite moments!`,
        sources: [`https://instagram.com/${stanName}`, `https://weverse.io`]
      },
      {
        title: "🌟 Fan Projects & Events",
        content: `Global fan projects for ${stanName}'s upcoming anniversary are in full swing! Streaming parties, birthday ads in Times Square, and charity donations in their name show the power of the fandom!`,
        sources: [`https://twitter.com/search/${stanName}`, `https://tiktok.com/${stanName}`]
      }
    ],
    'Music': [
      {
        title: "🎸 New Music Alert",
        content: `${stanName} teased new music with studio photos that sent fans into overdrive! Sources close to production hint at a genre-bending track featuring unexpected collaborations. Release expected within weeks!`,
        sources: [`https://spotify.com/artist/${stanName}`, `https://billboard.com`]
      },
      {
        title: "📈 Chart Domination",
        content: `${stanName}'s latest single climbed to #3 on global charts with 50M streams this week! Radio play increased by 200% and the music video is trending #1 on YouTube!`,
        sources: [`https://billboard.com/charts`, `https://youtube.com`]
      },
      {
        title: "🎤 Tour & Live Updates",
        content: `${stanName} announced surprise pop-up performances in 3 cities! VIP packages sold out in minutes. Festival season lineup also confirmed with headline slots at major events!`,
        sources: [`https://ticketmaster.com`, `https://livenation.com`]
      }
    ],
    'Sports': [
      {
        title: "⚽ Match Highlights",
        content: `${stanName} delivered an incredible performance in yesterday's crucial match! Key plays in the final minutes secured the victory. Stats show best performance metrics of the season!`,
        sources: [`https://espn.com`, `https://sports.yahoo.com`]
      },
      {
        title: "📊 Team News",
        content: `Breaking: ${stanName} confirmed major roster updates ahead of important fixtures. Coach praised team chemistry and fitness levels. Injury updates looking positive for key players!`,
        sources: [`https://nba.com`, `https://premierleague.com`]
      },
      {
        title: "🏆 Championship Race",
        content: `${stanName} sits in prime position for championship contention! Analytics show 73% chance of playoffs/finals. Ticket demand at all-time high with home games selling out!`,
        sources: [`https://theathetic.com`, `https://bleacherreport.com`]
      }
    ],
    'Gaming': [
      {
        title: "🎮 Game Update Released",
        content: `${stanName} dropped a massive update with new features, balance changes, and surprise content! Servers are packed with returning players. Community response overwhelmingly positive!`,
        sources: [`https://twitch.tv/directory/${stanName}`, `https://reddit.com/r/${stanName}`]
      },
      {
        title: "🏆 Esports Tournament",
        content: `${stanName} World Championship announced with $5M prize pool! Top teams from 30 regions will compete. Viewership expected to break all previous records!`,
        sources: [`https://esports.com`, `https://liquipedia.net`]
      },
      {
        title: "🎯 Community Events",
        content: `Special in-game event starts tomorrow in ${stanName}! Limited-time rewards, exclusive cosmetics, and double XP weekend. Community challenges unlock bonus content for everyone!`,
        sources: [`https://discord.gg`, `https://steamcommunity.com`]
      }
    ],
    'Movies & TV': [
      {
        title: "🎬 Production Updates",
        content: `${stanName} filming wrapped on the next installment! Cast and crew celebrated with behind-the-scenes content that has fans dissecting every frame for clues. Release date announcement imminent!`,
        sources: [`https://variety.com`, `https://hollywoodreporter.com`]
      },
      {
        title: "📺 Streaming Success",
        content: `${stanName} breaks streaming records with 100M hours watched globally! Critics praise the latest season/film with 95% on Rotten Tomatoes. Renewal/sequel already confirmed!`,
        sources: [`https://netflix.com`, `https://deadline.com`]
      },
      {
        title: "🌟 Cast & Crew News",
        content: `${stanName} cast surprises fans with reunion announcement! Plus exclusive interviews reveal exciting details about upcoming projects. Fan theories about next storyline going viral!`,
        sources: [`https://imdb.com`, `https://rottentomatoes.com`]
      }
    ]
  };

  const categoryTemplates = templates[category] || templates['Music'];
  return {
    topics: categoryTemplates,
    searchSources: categoryTemplates.flatMap((t) => t.sources),
    images: []
  };
};

export async function POST() {
  try {
    console.log('🌱 Starting to seed database with popular stans...');
    
    // First, get or create categories
    const categories: Record<string, string> = {};
    const categoryData = [
      { name: 'K-Pop', icon: '🎵', color: '#FF6B6B' },
      { name: 'Music', icon: '🎸', color: '#C34A36' },
      { name: 'Sports', icon: '⚽', color: '#4ECDC4' },
      { name: 'Gaming', icon: '🎮', color: '#845EC2' },
      { name: 'Movies & TV', icon: '🎬', color: '#F9F871' }
    ];

    for (const cat of categoryData) {
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('name', cat.name)
        .single();

      if (existing) {
        categories[cat.name] = existing.id;
      } else {
        const { data: newCat } = await supabase
          .from('categories')
          .insert(cat)
          .select('id')
          .single();
        
        if (newCat) {
          categories[cat.name] = newCat.id;
        }
      }
    }

    console.log('✅ Categories ready:', Object.keys(categories));

    // Create a system user for global stans
    const systemUserId = '00000000-0000-0000-0000-000000000000';
    
    // Seed all popular stans as global stans (owned by system user)
    const stansCreated = [];
    const today = new Date().toISOString().split('T')[0];

    for (const stanData of POPULAR_STANS) {
      try {
        // Check if stan already exists
        const { data: existingStan } = await supabase
          .from('stans')
          .select('id, name')
          .eq('name', stanData.name)
          .eq('user_id', systemUserId)
          .single();

        let stanId;
        
        if (existingStan) {
          stanId = existingStan.id;
          console.log(`✓ Stan already exists: ${stanData.name}`);
        } else {
          // Create the stan
          const { data: newStan, error: stanError } = await supabase
            .from('stans')
            .insert({
              name: stanData.name,
              description: stanData.description,
              user_id: systemUserId,
              category_id: categories[stanData.category],
              is_active: true,
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (stanError) {
            console.error(`❌ Failed to create stan ${stanData.name}:`, stanError);
            continue;
          }

          stanId = newStan.id;
          console.log(`✅ Created stan: ${stanData.name}`);
        }

        // Generate briefing for this stan
        const briefingContent = generateBriefingContent(stanData.name, stanData.category);
        
        // Check if briefing already exists for today
        const { data: existingBriefing } = await supabase
          .from('daily_briefings')
          .select('id')
          .eq('stan_id', stanId)
          .eq('date', today)
          .single();

        if (!existingBriefing) {
          const { error: briefingError } = await supabase
            .from('daily_briefings')
            .insert({
              stan_id: stanId,
              date: today,
              content: JSON.stringify(briefingContent),
              topics: briefingContent.topics,
              search_sources: briefingContent.searchSources,
              images: briefingContent.images,
              created_at: new Date().toISOString()
            });

          if (briefingError) {
            console.error(`❌ Failed to create briefing for ${stanData.name}:`, briefingError);
          } else {
            console.log(`📰 Created briefing for: ${stanData.name}`);
          }
        } else {
          console.log(`✓ Briefing already exists for: ${stanData.name}`);
        }

        stansCreated.push(stanData.name);
        
      } catch (error) {
        console.error(`Error processing ${stanData.name}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${stansCreated.length} popular stans with briefings`,
      stans: stansCreated,
      date: today
    });

  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { 
        error: 'Failed to seed database',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}