import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    console.log('🧪 Testing stan creation...');
    
    // Get K-Pop category ID
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('name', 'K-Pop')
      .single();

    if (catError) {
      return NextResponse.json({ error: 'Failed to get category', details: catError });
    }

    console.log('📋 K-Pop category:', categories);

    // Try to create a single test stan
    const { data: newStan, error: stanError } = await supabase
      .from('stans')
      .insert({
        name: 'Test Stan',
        description: 'Test description',
        user_id: '00000000-0000-0000-0000-000000000000',
        category_id: categories.id,
        is_active: true
      })
      .select()
      .single();

    console.log('🔍 Stan creation result:', { data: newStan, error: stanError });

    if (stanError) {
      return NextResponse.json({ 
        error: 'Failed to create stan', 
        details: stanError,
        category: categories
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      stan: newStan,
      category: categories
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}