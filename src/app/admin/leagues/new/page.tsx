import { createLeague } from '@/lib/actions/admin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { redirect } from 'next/navigation';

export default function NewLeaguePage() {
  async function action(fd: FormData) {
    'use server';
    const webhook = fd.get('discordWebhookUrl') as string;
    const result = await createLeague({
      slug: String(fd.get('slug')),
      name: String(fd.get('name')),
      vlrEventId: String(fd.get('vlrEventId')),
      startDate: String(fd.get('startDate')),
      discordWebhookUrl: webhook || null,
    });
    redirect(`/admin/leagues/${result.slug}`);
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-100">New League</h1>
      <form action={action} className="space-y-3">
        <div><Label>Slug</Label><Input name="slug" required /></div>
        <div><Label>Name</Label><Input name="name" required /></div>
        <div><Label>vlr.gg Event ID</Label><Input name="vlrEventId" required /></div>
        <div><Label>Start Date</Label><Input name="startDate" type="datetime-local" required /></div>
        <div><Label>Discord Webhook URL (optional)</Label><Input name="discordWebhookUrl" /></div>
        <Button type="submit">Create League</Button>
      </form>
    </main>
  );
}
