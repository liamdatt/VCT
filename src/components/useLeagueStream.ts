'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useLeagueStream(slug: string) {
  const router = useRouter();
  useEffect(() => {
    const es = new EventSource(`/api/stream?league=${encodeURIComponent(slug)}`);
    es.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data);
        if (ev.type === 'hello') return;
        // For v1, any event triggers a full RSC revalidation of the current page.
        router.refresh();
      } catch {}
    };
    es.onerror = () => {
      console.warn('[stream] error, reconnecting');
    };
    return () => es.close();
  }, [slug, router]);
}
