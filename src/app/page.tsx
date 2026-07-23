'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isReset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (error) throw error;
        setMessage('Password reset link sent to your email.');
        setLoading(false);
        return;
      }

      if (isSignUp && password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const { data, error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (isSignUp) {
        setMessage('Check your email for confirmation!');
        setLoading(false);
      } else if (data.session) {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #e8edf5, #f0f2f5)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Financial Copilot</div>
          <div className="text-sm text-muted-foreground mt-1">Daily Operations for F&B</div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-lg font-semibold mb-5">{isReset ? 'Reset Password' : isSignUp ? 'Create Account' : 'Sign In'}</h1>
            <form onSubmit={handleAuth} className="space-y-3">
              {error && <div className="text-sm text-destructive">{error}</div>}
              {message && <div className="text-sm" style={{ color: 'hsl(142 60% 38%)' }}>{message}</div>}

              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

              {!isReset && (
                <>
                  <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  {isSignUp && (
                    <Input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  )}
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Processing...' : (isReset ? 'Send Reset Link' : isSignUp ? 'Sign Up' : 'Sign In')}
              </Button>
            </form>
            <div className="mt-5 flex flex-col items-center gap-1">
              <button type="button" onClick={() => { setIsReset(false); setIsSignUp(!isSignUp); }} className="text-xs text-muted-foreground hover:text-primary transition-colors bg-transparent border-none cursor-pointer">
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </button>
              {!isSignUp && (
                <button type="button" onClick={() => setIsReset(!isReset)} className="text-xs text-muted-foreground hover:text-primary transition-colors bg-transparent border-none cursor-pointer">
                  {isReset ? 'Back to Sign In' : 'Forgot password?'}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
