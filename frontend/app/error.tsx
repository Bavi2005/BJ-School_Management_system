'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <pre className="max-w-3xl overflow-auto rounded-lg bg-muted p-4 text-left text-sm text-red-500">
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
