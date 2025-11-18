import { getOpenRouterClient } from '../src/lib/ai-key-store';

async function testOpenRouter() {
  console.log('🧪 Testing OpenRouter integration...');
  
  try {
    // Test client creation (will use env fallback if no DB key)
    const { client, keyId } = await getOpenRouterClient();
    console.log(`✅ OpenRouter client created successfully`);
    console.log(`   Key ID: ${keyId ?? 'env-fallback'}`);
    
    // Test a simple completion
    const completion = await client.chat.completions.create({
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from OpenRouter!" in exactly 5 words.',
        },
      ],
      temperature: 0.1,
      max_tokens: 20,
    });
    
    const response = completion.choices[0]?.message?.content || 'No response';
    console.log(`✅ Test completion successful:`);
    console.log(`   Response: "${response}"`);
    console.log(`   Tokens used: ${completion.usage?.total_tokens || 'unknown'}`);
    
  } catch (error: any) {
    if (error.message?.includes('No OpenRouter API key')) {
      console.log('⚠️  No OpenRouter API key found. Set OPENROUTER_API_KEY environment variable or add via admin UI.');
    } else {
      console.error('❌ Test failed:', error.message);
    }
  }
}

if (require.main === module) {
  testOpenRouter();
}
