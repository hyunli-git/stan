import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize with service role and proper config for admin access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

export async function POST() {
  try {
    console.log('🌱 Creating stans with admin client...');
    
    // Get categories first
    const { data: categories, error: catError } = await supabaseAdmin
      .from('categories')
      .select('id, name');
    
    if (catError || !categories) {
      return NextResponse.json({ 
        error: 'Failed to get categories', 
        details: catError 
      }, { status: 500 });
    }
    
    const categoryMap: Record<string, string> = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });

    const stansData = [
      { name: 'BTS', description: 'Global K-Pop superstars', category: 'K-Pop' },
      { name: 'Taylor Swift', description: 'Pop music icon', category: 'Music' },
      { name: 'BLACKPINK', description: 'K-Pop girl group queens', category: 'K-Pop' },
      { name: 'Los Angeles Lakers', description: 'NBA championship team', category: 'Sports' },
      { name: 'League of Legends', description: 'Popular MOBA game', category: 'Gaming' },
      { name: 'Marvel Cinematic Universe', description: 'Superhero movie franchise', category: 'Movies & TV' }
    ];

    const systemUserId = '00000000-0000-0000-0000-000000000000';
    const results = [];

    // Try bulk insert first
    const stansToInsert = stansData.map(stan => ({
      name: stan.name,
      description: stan.description,
      user_id: systemUserId,
      category_id: categoryMap[stan.category],
      is_active: true,
      created_at: new Date().toISOString()
    }));

    console.log('🔄 Attempting bulk insert...');
    const { data: bulkResult, error: bulkError } = await supabaseAdmin
      .from('stans')
      .upsert(stansToInsert, {
        onConflict: 'name,user_id',
        ignoreDuplicates: true
      })
      .select();

    if (bulkError) {
      console.log('❌ Bulk insert failed:', bulkError.message);
      
      // If bulk fails due to RLS, the user needs to manually fix the RLS policy
      // Let's provide them with the exact SQL they need to run
      return NextResponse.json({
        error: 'RLS Policy Blocking Creation',
        message: 'The stans table has Row Level Security enabled that is blocking inserts even with the service role key.',
        solution: 'You need to run this SQL in your Supabase SQL Editor:',
        sqlToRun: `
-- Option 1: Create a policy that allows service role to insert
CREATE POLICY "Allow service role to insert stans" ON public.stans
FOR INSERT
TO service_role
WITH CHECK (true);

-- Option 2: Or temporarily disable RLS for this table (less secure)
-- ALTER TABLE public.stans DISABLE ROW LEVEL SECURITY;

-- Option 3: Or create a policy that allows inserts for system user
CREATE POLICY "Allow system user inserts" ON public.stans
FOR INSERT
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');
        `,
        bulkError: bulkError.message,
        categoryMap,
        stansToInsert: stansData
      }, { status: 500 });
    }

    console.log('✅ Bulk insert successful!');
    results.push({ method: 'bulk', success: true, count: bulkResult?.length || 0 });

    return NextResponse.json({
      success: true,
      message: `Successfully created ${bulkResult?.length || 0} stans`,
      results,
      stans: bulkResult,
      categoryMap
    });

  } catch (error) {
    console.error('Error in create-stans-bypass:', error);
    return NextResponse.json({
      error: 'Failed to create stans',
      message: error instanceof Error ? error.message : 'Unknown error',
      hint: 'You may need to configure RLS policies in Supabase to allow stan creation'
    }, { status: 500 });
  }
}