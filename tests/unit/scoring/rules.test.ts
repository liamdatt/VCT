import { describe, it, expect } from 'vitest';
import { computeGamePoints } from '@/lib/scoring/rules';
import { DEFAULT_LEAGUE_SETTINGS } from '@/lib/scoring/types';

const S = DEFAULT_LEAGUE_SETTINGS;

describe('computeGamePoints', () => {
  it('awards 2 points per kill', () => {
    const r = computeGamePoints({ kills: 10, deaths: 0, assists: 0, aces: 0, won: false }, S);
    expect(r.killsPts).toBe(20);
  });

  it('subtracts 1 point per death', () => {
    const r = computeGamePoints({ kills: 0, deaths: 7, assists: 0, aces: 0, won: false }, S);
    expect(r.deathsPts).toBe(-7);
  });

  it('awards 1.5 points per assist', () => {
    const r = computeGamePoints({ kills: 0, deaths: 0, assists: 6, aces: 0, won: false }, S);
    expect(r.assistsPts).toBe(9);
  });

  it('awards 5 points per ace', () => {
    const r = computeGamePoints({ kills: 0, deaths: 0, assists: 0, aces: 2, won: false }, S);
    expect(r.acesPts).toBe(10);
  });

  it('awards +15 for a win', () => {
    const r = computeGamePoints({ kills: 0, deaths: 0, assists: 0, aces: 0, won: true }, S);
    expect(r.winBonus).toBe(15);
  });

  it('subtracts 5 for a loss', () => {
    const r = computeGamePoints({ kills: 0, deaths: 0, assists: 0, aces: 0, won: false }, S);
    expect(r.winBonus).toBe(-5);
  });

  it('computes base + winBonus = total', () => {
    const r = computeGamePoints({ kills: 24, deaths: 12, assists: 5, aces: 1, won: true }, S);
    expect(r.killsPts).toBe(48);
    expect(r.deathsPts).toBe(-12);
    expect(r.assistsPts).toBe(7.5);
    expect(r.acesPts).toBe(5);
    expect(r.base).toBe(48.5);
    expect(r.winBonus).toBe(15);
    expect(r.total).toBe(63.5);
  });

  it('handles all zeros (loss)', () => {
    const r = computeGamePoints({ kills: 0, deaths: 0, assists: 0, aces: 0, won: false }, S);
    expect(r.base).toBe(0);
    expect(r.total).toBe(-5);
  });

  it('handles all zeros (win)', () => {
    const r = computeGamePoints({ kills: 0, deaths: 0, assists: 0, aces: 0, won: true }, S);
    expect(r.total).toBe(15);
  });

  it('respects custom settings (double kill points)', () => {
    const custom = { ...S, killPts: 4 };
    const r = computeGamePoints({ kills: 5, deaths: 0, assists: 0, aces: 0, won: false }, custom);
    expect(r.killsPts).toBe(20);
  });

  it('rejects negative stats', () => {
    expect(() =>
      computeGamePoints({ kills: -1, deaths: 0, assists: 0, aces: 0, won: false }, S),
    ).toThrow();
  });
});
