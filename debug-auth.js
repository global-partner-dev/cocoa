// Debug script to test Supabase authentication
// Run with: node debug-auth.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zsqtdawrsymdfdznvuvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcXRkYXdyc3ltZGZkem52dXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTk1OTksImV4cCI6MjA3MjM5NTU5OX0.zWUQkxp80keadDhJ6PG9ZYi1dtISali_-6GMKx4oo-0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
    console.log('=== Supabase Authentication Debug ===\n');
    
    // Test 1: Check connection
    console.log('1. Testing connection...');
    try {
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact' });
        if (error) {
            console.log('❌ Connection error:', error.message);
        } else {
            console.log('✅ Connection successful, profiles count:', data);
        }
    } catch (err) {
        console.log('❌ Connection exception:', err.message);
    }
    
    console.log('\n2. Testing demo login...');
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'test.admin@gmail.com',
            password: 'zxcasdQWE123!@#'
        });
        
        if (error) {
            console.log('❌ Demo login error:', error.message);
        } else {
            console.log('✅ Demo login successful:', data.user?.email);
            
            // Sign out
            await supabase.auth.signOut();
        }
    } catch (err) {
        console.log('❌ Demo login exception:', err.message);
    }
    
    console.log('\n3. Testing registration...');
    const testEmail = 'debug-test-' + Date.now() + '@example.com';
    try {
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: 'testpassword123',
            options: {
                emailRedirectTo: undefined
            }
        });
        
        if (error) {
            console.log('❌ Registration error:', error.message);
        } else {
            console.log('✅ Registration successful:', data.user?.email);
            console.log('   Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
            
            // Try to login immediately
            console.log('\n4. Testing immediate login after registration...');
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: testEmail,
                password: 'testpassword123'
            });
            
            if (loginError) {
                console.log('❌ Login after registration error:', loginError.message);
            } else {
                console.log('✅ Login after registration successful');
                await supabase.auth.signOut();
            }
        }
    } catch (err) {
        console.log('❌ Registration exception:', err.message);
    }
    
    console.log('\n5. Checking profiles table...');
    try {
        const { data, error } = await supabase.from('profiles').select('*').limit(5);
        if (error) {
            console.log('❌ Profiles error:', error.message);
        } else {
            console.log('✅ Profiles data:', data);
        }
    } catch (err) {
        console.log('❌ Profiles exception:', err.message);
    }
    
    console.log('\n=== Debug Complete ===');
}

testAuth().catch(console.error);