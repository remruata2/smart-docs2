/**
 * Test script to validate Supabase Storage connection
 * Run with: npx tsx scripts/test-supabase-connection.ts
 */

// Load environment variables from .env file
import 'dotenv/config';

import { validateSupabaseStorage } from '../src/lib/supabase';

async function testConnection() {
    console.log('🧪 Testing Supabase Storage Connection...\n');
    
    // Debug: Check if env vars are loaded
    console.log('📋 Environment Check:');
    console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
    if (process.env.SUPABASE_URL) {
        console.log(`  URL: ${process.env.SUPABASE_URL}`);
    }
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log(`  Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...`);
    }
    console.log('');

    const result = await validateSupabaseStorage('chapter_pages');

    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`Connected: ${result.connected ? '✅' : '❌'}`);
    console.log(`Bucket Exists: ${result.bucketExists ? '✅' : '❌'}`);

    if (result.error) {
        console.log(`\n❌ Error: ${result.error}`);
    }

    if (result.details) {
        console.log(`\n📋 Details:`);
        console.log(`  URL: ${result.details.url}`);
        console.log(`  Bucket: ${result.details.bucket}`);
        if (result.details.availableBuckets) {
            console.log(`  Available Buckets: ${result.details.availableBuckets.join(', ')}`);
        }
    }

    if (result.connected && result.bucketExists) {
        console.log('\n✅ All checks passed! Supabase Storage is ready.');
        process.exit(0);
    } else {
        console.log('\n❌ Connection validation failed. Please check the errors above.');
        process.exit(1);
    }
}

testConnection().catch((error) => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
});
