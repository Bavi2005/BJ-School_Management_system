'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@educore.dev' },
  { role: 'Teacher', email: 'teacher@educore.dev' },
  { role: 'Student', email: 'student@educore.dev' },
  { role: 'Parent', email: 'parent@educore.dev' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = React.useState('admin@educore.dev');
  const [password, setPassword] = React.useState('Admin@123');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-4">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-fuchsia-500/20 blur-[120px]" />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-6 top-6 text-white/70 hover:text-white hover:bg-white/10"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>

      <div className="relative z-10 grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2 animate-fade-in">
        {/* Branding */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 text-white shadow-2xl shadow-violet-500/30">
              <GraduationCap className="h-9 w-9" />
            </div>
            <h1 className="text-4xl font-bold text-white">
              EduCore <span className="gradient-text">Nexus</span>
            </h1>
          </div>
          <p className="mt-6 text-lg leading-relaxed text-white/70">
            The next generation of school management. AI-powered insights, real-time
            collaboration, and Google Calendar integration in one beautiful platform.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'AI performance & attendance prediction',
              'Smart scheduling with genetic algorithms',
              'Google Calendar two-way sync',
              'Real-time notifications',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-white/80">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Login Card */}
        <Card className="glass-card w-full border-0 shadow-2xl animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 lg:hidden">
              <GraduationCap className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>Sign in to your school dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Quick demo login</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-col py-2 text-xs hover:border-primary/50"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword('Admin@123');
                    }}
                  >
                    <span className="font-semibold">{account.role}</span>
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                All demo accounts use password:{' '}
                <code className="rounded bg-secondary px-1 py-0.5">Admin@123</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}