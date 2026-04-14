import { signIn } from '@/lib/auth';
import { Button } from '@/components/shared/Button';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--bg-canvas)] px-6 py-12 text-[var(--text-primary)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 30%, var(--accent-glow) 0%, transparent 70%)',
        }}
      />
      <div className="relative flex flex-col items-center gap-6 text-center">
        <div className="font-display text-[11px] uppercase tracking-[0.4em] text-[var(--text-tertiary)]">
          Private League · VCT Americas
        </div>
        <h1 className="font-display text-[72px] leading-[0.9] font-medium tracking-tight md:text-[96px]">
          <span className="text-[var(--text-primary)]">VCT </span>
          <span className="shimmer">FANTASY</span>
        </h1>
        <p className="max-w-md text-[14px] text-[var(--text-secondary)]">
          Draft your squad. Track live scores. Out-manage your friends.
        </p>
        <form
          action={async () => {
            'use server';
            await signIn('discord', { redirectTo: '/leagues' });
          }}
          className="mt-4"
        >
          <Button type="submit" size="lg" variant="hero">
            Sign in with Discord
          </Button>
        </form>
      </div>
    </main>
  );
}
