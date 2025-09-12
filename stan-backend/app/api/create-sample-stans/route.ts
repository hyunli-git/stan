import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize with service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST() {
  try {
    console.log('🌱 Creating sample stans for testing...');

    // Get existing categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*');

    if (catError || !categories) {
      return NextResponse.json({ 
        error: 'Failed to get categories', 
        details: catError 
      }, { status: 500 });
    }

    // Create a mapping of category names to IDs
    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.name] = cat.id;
      return acc;
    }, {} as Record<string, string>);

    // Sample stans to create
    const sampleStans = [
      { name: 'BTS', description: 'Global K-Pop superstars', category: 'K-Pop' },
      { name: 'Taylor Swift', description: 'Pop music icon', category: 'Music' },
      { name: 'BLACKPINK', description: 'K-Pop girl group queens', category: 'K-Pop' },
      { name: 'Los Angeles Lakers', description: 'NBA championship team', category: 'Sports' },
      { name: 'League of Legends', description: 'Popular MOBA game', category: 'Gaming' },
      { name: 'Marvel Cinematic Universe', description: 'Superhero movie franchise', category: 'Movies & TV' }
    ];

    const systemUserId = '00000000-0000-0000-0000-000000000000';
    const createdStans = [];

    for (const stanData of sampleStans) {
      try {
        // Check if stan already exists
        const { data: existing } = await supabase
          .from('stans')
          .select('id')
          .eq('name', stanData.name)
          .eq('user_id', systemUserId)
          .single();

        if (existing) {
          console.log(`✓ Stan already exists: ${stanData.name}`);
          continue;
        }

        // Create the stan with bypass RLS
        const { data: newStan, error: stanError } = await supabase
          .from('stans')
          .insert({
            name: stanData.name,
            description: stanData.description,
            user_id: systemUserId,
            category_id: categoryMap[stanData.category],
            is_active: true,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (stanError) {
          console.error(`❌ Failed to create ${stanData.name}:`, stanError);
        } else {
          console.log(`✅ Created stan: ${stanData.name}`);
          createdStans.push(stanData.name);
        }

      } catch (error) {
        console.error(`Error creating ${stanData.name}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdStans.length} sample stans`,
      stans: createdStans,
      categories: Object.keys(categoryMap)
    });

  } catch (error) {
    console.error('Error creating sample stans:', error);
    return NextResponse.json({
      error: 'Failed to create sample stans',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}