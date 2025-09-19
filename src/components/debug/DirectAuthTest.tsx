import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import QRCodeTest from './QRCodeTest';

const DirectAuthTest = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testDirectLogin = async () => {
    setLoading(true);
    setResult('Testing direct login...\n');
    
    try {
      // Test 1: Direct Supabase login
      console.log('Testing direct Supabase login...');
      setResult(prev => prev + 'Step 1: Testing direct Supabase login...\n');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'shigh0896@gmail.com',
        password: 'your-actual-password-here' // You need to replace this
      });
      
      if (error) {
        setResult(prev => prev + `❌ Login Error: ${error.message}\n`);
        console.error('Login error:', error);
      } else {
        setResult(prev => prev + `✅ Login Success: ${data.user?.email}\n`);
        setResult(prev => prev + `   User ID: ${data.user?.id}\n`);
        setResult(prev => prev + `   Email Confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}\n`);
        
        // Test 2: Check profile
        setResult(prev => prev + '\nStep 2: Checking profile...\n');
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user?.id)
          .single();
          
        if (profileError) {
          setResult(prev => prev + `❌ Profile Error: ${profileError.message}\n`);
        } else {
          setResult(prev => prev + `✅ Profile Found:\n`);
          setResult(prev => prev + `   Email: ${profile.email}\n`);
          setResult(prev => prev + `   Name: ${profile.name}\n`);
          setResult(prev => prev + `   Role: ${profile.role}\n`);
          setResult(prev => prev + `   Verified: ${profile.is_verified}\n`);
        }
        
        // Sign out
        await supabase.auth.signOut();
        setResult(prev => prev + '\n✅ Signed out successfully\n');
      }
    } catch (err) {
      setResult(prev => prev + `❌ Exception: ${err}\n`);
      console.error('Exception:', err);
    }
    
    setLoading(false);
  };

  const testRegistration = async () => {
    setLoading(true);
    setResult('Testing registration...\n');
    
    const testEmail = `test-${Date.now()}@example.com`;
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'testpassword123',
        options: {
          emailRedirectTo: undefined
        }
      });
      
      if (error) {
        setResult(prev => prev + `❌ Registration Error: ${error.message}\n`);
      } else {
        setResult(prev => prev + `✅ Registration Success: ${data.user?.email}\n`);
        setResult(prev => prev + `   Email Confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}\n`);
        
        // Try immediate login
        setResult(prev => prev + '\nTesting immediate login...\n');
        
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: 'testpassword123'
        });
        
        if (loginError) {
          setResult(prev => prev + `❌ Immediate Login Error: ${loginError.message}\n`);
        } else {
          setResult(prev => prev + `✅ Immediate Login Success\n`);
          await supabase.auth.signOut();
        }
      }
    } catch (err) {
      setResult(prev => prev + `❌ Exception: ${err}\n`);
    }
    
    setLoading(false);
  };

  const checkProfiles = async () => {
    setLoading(true);
    setResult('Checking all profiles...\n');
    
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      
      if (error) {
        setResult(prev => prev + `❌ Error: ${error.message}\n`);
      } else {
        setResult(prev => prev + `✅ Found ${data.length} profiles:\n`);
        data.forEach((profile, index) => {
          setResult(prev => prev + `${index + 1}. ${profile.email} (${profile.role}) - Verified: ${profile.is_verified}\n`);
        });
      }
    } catch (err) {
      setResult(prev => prev + `❌ Exception: ${err}\n`);
    }
    
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Direct Authentication Test</h1>
      
      <div className="space-y-4 mb-6">
        <button 
          onClick={testDirectLogin}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Direct Login (shigh0896@gmail.com)
        </button>
        
        <button 
          onClick={testRegistration}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Registration
        </button>
        
        <button 
          onClick={checkProfiles}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Check All Profiles
        </button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="font-bold mb-2">Results:</h2>
        <pre className="whitespace-pre-wrap text-sm">{result || 'Click a button to test...'}</pre>
      </div>
      
      <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
        <h3 className="font-bold">Instructions:</h3>
        <p className="text-sm">
          1. Replace "your-actual-password-here" in the code with your real password for shigh0896@gmail.com
          <br />
          2. Click "Test Direct Login" to see exactly what happens
          <br />
          3. Check the browser console for additional details
        </p>
      </div>
      
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">QR Code Test</h2>
        <QRCodeTest />
      </div>
    </div>
  );
};

export default DirectAuthTest;