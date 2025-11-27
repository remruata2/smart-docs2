import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function testRealtime() {
    console.log('🧪 Testing Supabase Realtime (Broadcast)...\n');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing env vars');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const channelId = `test-channel-${Date.now()}`;
    const channel = supabase.channel(channelId);

    console.log(`📡 Subscribing to channel: ${channelId}`);

    // Set up a promise that resolves when message is received
    const messageReceived = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timeout waiting for message'));
        }, 10000); // 10s timeout

        channel
            .on('broadcast', { event: 'TEST_EVENT' }, (payload) => {
                clearTimeout(timeout);
                console.log('✅ Received broadcast:', payload);
                resolve(true);
            })
            .subscribe(async (status) => {
                console.log(`STATUS: ${status}`);
                if (status === 'SUBSCRIBED') {
                    console.log('📤 Sending broadcast...');

                    // Use httpSend if available (to match our fix)
                    // @ts-ignore
                    if (typeof channel.httpSend === 'function') {
                        console.log('   Using httpSend()');
                        // @ts-ignore
                        await channel.httpSend('TEST_EVENT', { message: 'Hello Realtime!' });
                    } else {
                        console.log('   Using send()');
                        await channel.send({
                            type: 'broadcast',
                            event: 'TEST_EVENT',
                            payload: { message: 'Hello Realtime!' }
                        });
                    }
                }
            });
    });

    try {
        await messageReceived;
        console.log('\n✅ Realtime test passed!');

        // Clean up
        await supabase.removeChannel(channel);
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Realtime test failed:', error);
        process.exit(1);
    }
}

testRealtime();
