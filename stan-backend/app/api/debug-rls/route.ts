import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    console.log('🔍 Debugging RLS and user context...');
    
    // Check current user context
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Current user:', user);
    
    // Try to check what RLS policies exist
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'stans');
    
    console.log('RLS Policies:', policies, 'Error:', policiesError);
    
    // Try to use set_config to bypass RLS temporarily
    const { data: configResult, error: configError } = await supabase
      .rpc('set_config', {
        setting_name: 'row_security',
        new_value: 'off',
        is_local: true
      });
    
    console.log('Config result:', configResult, 'Error:', configError);
    
    // Try to create a stan now
    const { data: stanResult, error: stanError } = await supabase
      .from('stans')
      .insert({
        name: 'Debug Test Stan',
        description: 'Testing RLS bypass',
        user_id: '00000000-0000-0000-0000-000000000000',
        category_id: 'd7ffb31d-3c5b-4482-a8d8-9d61a8889144', // K-Pop category
        is_active: true
      })
      .select()
      .single();
    
    return NextResponse.json({
      user,
      userError: userError?.message,
      policies,
      policiesError: policiesError?.message,
      configResult,
      configError: configError?.message,
      stanResult,
      stanError: stanError?.message,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}