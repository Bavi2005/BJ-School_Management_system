import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import { SocketProvider } from '@/components/socket-provider';
import { AppShell } from '@/components/layout/app-shell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'EduCore Nexus | AI-Powered School Management',
    template: '%s | EduCore Nexus',
  },
  description:
    'Next-generation AI-powered school management system with Google Calendar sync, smart scheduling, predictive analytics, and real-time collaboration.',
  keywords: ['school management', 'AI education', 'learning platform', 'EdTech'],
  authors: [{ name: 'EduCore Nexus' }],
  openGraph: {
    title: 'EduCore Nexus',
    description: 'AI-Powered School Management System',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a1f' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <SocketProvider>
              <AppShell>{children}</AppShell>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}