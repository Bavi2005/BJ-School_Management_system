'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center">
          <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
          <pre className="max-w-2xl overflow-auto rounded-lg bg-white/10 p-4 text-left text-sm text-red-300">
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
