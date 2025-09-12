import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    console.log('🌱 Starting database seeding...');

    // First, ensure categories exist
    const categories = [
      { id: 'kpop', name: 'K-Pop', icon: '🎵', color: '#FF6B6B' },
      { id: 'music', name: 'Music', icon: '🎸', color: '#C34A36' },
      { id: 'sports', name: 'Sports', icon: '⚽', color: '#4ECDC4' },
      { id: 'gaming', name: 'Gaming', icon: '🎮', color: '#845EC2' },
      { id: 'movies', name: 'Movies & TV', icon: '🎬', color: '#F9F871' }
    ];

    // Insert categories (ignore if exist)
    for (const category of categories) {
      await supabase
        .from('categories')
        .upsert(category, { onConflict: 'id' });
    }

    // Create a demo user if one doesn't exist
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    let demoUserId = null;

    if (existingUser.users.length === 0) {
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: 'demo@stan.app',
        password: 'demo123456',
        email_confirm: true
      });
      
      if (userError) {
        console.error('Error creating demo user:', userError);
      } else {
        demoUserId = newUser.user?.id;
        console.log('✅ Created demo user');
      }
    } else {
      demoUserId = existingUser.users[0].id;
      console.log('✅ Using existing user');
    }

    // Popular stans to seed
    const popularStans = [
      { name: 'BTS', description: 'Global K-Pop superstars', category_id: 'kpop', priority: 1 },
      { name: 'Taylor Swift', description: 'Pop music icon', category_id: 'music', priority: 1 },
      { name: 'BLACKPINK', description: 'K-Pop girl group', category_id: 'kpop', priority: 1 },
      { name: 'Los Angeles Lakers', description: 'NBA basketball team', category_id: 'sports', priority: 1 },
      { name: 'League of Legends', description: 'Popular esports game', category_id: 'gaming', priority: 1 },
      { name: 'Marvel Cinematic Universe', description: 'Superhero movie franchise', category_id: 'movies', priority: 1 }
    ];

    let seedCount = 0;

    for (const stan of popularStans) {
      const { data: existingStan } = await supabase
        .from('stans')
        .select('id')
        .eq('name', stan.name)
        .eq('user_id', demoUserId)
        .single();

      if (!existingStan && demoUserId) {
        const { error: stanError } = await supabase
          .from('stans')
          .insert({
            name: stan.name,
            description: stan.description,
            category_id: stan.category_id,
            priority: stan.priority,
            user_id: demoUserId,
            is_active: true
          });

        if (stanError) {
          console.error(`Error inserting stan ${stan.name}:`, stanError);
        } else {
          seedCount++;
          console.log(`✅ Seeded stan: ${stan.name}`);
        }
      }
    }

    console.log(`🎉 Database seeding complete! Added ${seedCount} stans`);

    return NextResponse.json({ 
      message: `Database seeded successfully! Added ${seedCount} popular stans`,
      categories: categories.length,
      stans: seedCount,
      demoUser: demoUserId ? 'Created/Used' : 'Failed'
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