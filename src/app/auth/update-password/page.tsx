'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Password updated successfully! Redirecting to login...');
      setTimeout(() => router.push('/'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #e8edf5, #f0f2f5)' }}>
      <div className="w-full max-w-sm">
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-lg font-semibold mb-5">Update Password</h1>
            <form onSubmit={handleUpdatePassword} className="space-y-3">
              {message && (
                <div className={`text-sm ${message.startsWith('Error') ? 'text-destructive' : ''}`} style={!message.startsWith('Error') ? { color: 'hsl(142 60% 38%)' } : {}}>
                  {message}
                </div>
              )}
              <Input type="password" placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="submit" className="w-full">Save New Password</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
