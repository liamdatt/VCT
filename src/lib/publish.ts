import { leagueBus, type LeagueEvent } from './events';
import { postDiscord } from './discord-webhook';

export async function publishLeagueEvent(
  event: LeagueEvent,
  opts: { discordMessage?: string; webhookUrl?: string | null } = {},
) {
  leagueBus.emit('event', event);
  if (opts.discordMessage && opts.webhookUrl) {
    try {
      await postDiscord(opts.webhookUrl, opts.discordMessage);
    } catch (err) {
      console.error('[publish] discord post failed', err);
    }
  }
}
