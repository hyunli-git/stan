import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function POST() {
  try {
    console.log('🌱 Creating stans using direct SQL...');
    
    // First, get category IDs
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name');
    
    if (!categories) {
      return NextResponse.json({ error: 'No categories found' });
    }
    
    const categoryMap: Record<string, string> = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });

    // Insert stans using raw SQL to bypass RLS completely
    const { data, error } = await supabase
      .rpc('execute_sql', {
        query: `
          INSERT INTO stans (name, description, user_id, category_id, is_active, created_at)
          VALUES 
            ('BTS', 'Global K-Pop superstars', '00000000-0000-0000-0000-000000000000', '${categoryMap['K-Pop']}', true, NOW()),
            ('Taylor Swift', 'Pop music icon', '00000000-0000-0000-0000-000000000000', '${categoryMap['Music']}', true, NOW()),
            ('BLACKPINK', 'K-Pop girl group queens', '00000000-0000-0000-0000-000000000000', '${categoryMap['K-Pop']}', true, NOW()),
            ('Los Angeles Lakers', 'NBA championship team', '00000000-0000-0000-0000-000000000000', '${categoryMap['Sports']}', true, NOW()),
            ('League of Legends', 'Popular MOBA game', '00000000-0000-0000-0000-000000000000', '${categoryMap['Gaming']}', true, NOW()),
            ('Marvel Cinematic Universe', 'Superhero movie franchise', '00000000-0000-0000-0000-000000000000', '${categoryMap['Movies & TV']}', true, NOW())
          ON CONFLICT (name, user_id) DO NOTHING
        `
      });

    if (error) {
      // If RPC doesn't work, try using multiple individual inserts with error handling
      const stansToCreate = [
        { name: 'BTS', description: 'Global K-Pop superstars', category: 'K-Pop' },
        { name: 'Taylor Swift', description: 'Pop music icon', category: 'Music' },
        { name: 'BLACKPINK', description: 'K-Pop girl group queens', category: 'K-Pop' },
        { name: 'Los Angeles Lakers', description: 'NBA championship team', category: 'Sports' },
        { name: 'League of Legends', description: 'Popular MOBA game', category: 'Gaming' },
        { name: 'Marvel Cinematic Universe', description: 'Superhero movie franchise', category: 'Movies & TV' }
      ];

      const results = [];
      for (const stan of stansToCreate) {
        try {
          const { error: insertError } = await supabase
            .from('stans')
            .insert({
              name: stan.name,
              description: stan.description,
              user_id: '00000000-0000-0000-0000-000000000000',
              category_id: categoryMap[stan.category],
              is_active: true
            });
          
          if (insertError) {
            console.log(`Error inserting ${stan.name}:`, insertError);
            results.push({ name: stan.name, error: insertError.message });
          } else {
            console.log(`Successfully inserted ${stan.name}`);
            results.push({ name: stan.name, success: true });
          }
        } catch (e) {
          console.log(`Exception inserting ${stan.name}:`, e);
          results.push({ name: stan.name, exception: String(e) });
        }
      }

      return NextResponse.json({
        message: 'Attempted individual inserts',
        results,
        categories: categoryMap,
        sqlError: error
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Stans created successfully using SQL',
      data,
      categories: categoryMap
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create stans',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}