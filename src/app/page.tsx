import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 p-8 text-slate-100">
      <h1 className="text-5xl font-bold tracking-tight">VCT Fantasy</h1>
      <p className="text-slate-400">Private league — sign in with Discord to continue.</p>
      <form
        action={async () => {
          'use server';
          await signIn('discord', { redirectTo: '/leagues' });
        }}
      >
        <Button type="submit" size="lg" className="bg-[#5865F2] hover:bg-[#4752c4]">
          Sign in with Discord
        </Button>
      </form>
    </main>
  );
}
