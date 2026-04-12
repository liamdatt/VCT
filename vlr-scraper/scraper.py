"""
vlr.gg scraper — BeautifulSoup-based, with caching.

Polite scraping: 1s delay between requests, proper User-Agent,
completed matches cached for 24h, live/upcoming for 60s.
"""

import re
import time
import logging
from typing import Optional

import requests
from bs4 import BeautifulSoup, Tag
from cachetools import TTLCache

logger = logging.getLogger("vlr-scraper")

BASE = "https://www.vlr.gg"
HEADERS = {
    "User-Agent": "VCTFantasyBot/1.0 (private fantasy league; contact: liam@local)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

# Caches: completed match details (24h), event matches (5min)
_match_cache: TTLCache = TTLCache(maxsize=500, ttl=86400)
_event_cache: TTLCache = TTLCache(maxsize=50, ttl=300)

_last_request_time = 0.0


def _fetch(url: str) -> BeautifulSoup:
    """Fetch a page with polite delay and return parsed soup."""
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < 1.5:
        time.sleep(1.5 - elapsed)

    logger.info(f"GET {url}")
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    _last_request_time = time.time()
    return BeautifulSoup(resp.text, "html.parser")


def _text(el: Optional[Tag], default: str = "") -> str:
    """Safely extract stripped text from a tag."""
    if el is None:
        return default
    return el.get_text(strip=True)


def _int(s: str) -> int:
    """Parse an integer from a string, defaulting to 0."""
    cleaned = re.sub(r"[^0-9\-]", "", s)
    if not cleaned or cleaned == "-":
        return 0
    return int(cleaned)


# ─── Event Matches ──────────────────────────────────────────────────────


def get_event_matches(event_id: str) -> list[dict]:
    """
    Returns all matches for a vlr.gg event.
    [{match_id, team1: {name, score}, team2: {name, score}, status, date, time, series}]
    """
    cache_key = f"event:{event_id}"
    if cache_key in _event_cache:
        return _event_cache[cache_key]

    url = f"{BASE}/event/matches/{event_id}/?series_id=all"
    soup = _fetch(url)

    results = []
    current_date = ""

    for child in soup.select(".wf-card > *"):
        # Date headers
        if "wf-label" in child.get("class", []):
            current_date = _text(child)
            continue

        # Match items
        if child.name == "a" and "match-item" in child.get("class", []):
            href = child.get("href", "")
            match_id = href.strip("/").split("/")[0] if href else ""
            if not match_id:
                continue

            teams = child.select("div.match-item-vs-team")
            if len(teams) < 2:
                continue

            t1_name = _text(teams[0].select_one("div.text-of"))
            t1_score = _text(teams[0].select_one("div.match-item-vs-team-score"))
            t2_name = _text(teams[1].select_one("div.text-of"))
            t2_score = _text(teams[1].select_one("div.match-item-vs-team-score"))

            status_el = child.select_one("div.ml-status")
            status = _text(status_el, "upcoming").strip().lower()
            if status in ("completed", "final"):
                status = "completed"
            elif status == "live":
                status = "live"
            else:
                status = "upcoming"

            match_time = _text(child.select_one("div.match-item-time"))
            series = _text(child.select_one("div.match-item-event-series"))

            results.append({
                "match_id": match_id,
                "team1": {"name": t1_name, "score": t1_score},
                "team2": {"name": t2_name, "score": t2_score},
                "status": status,
                "date": current_date,
                "time": match_time,
                "series": series,
            })

    _event_cache[cache_key] = results
    return results


# ─── Match Detail ───────────────────────────────────────────────────────


def get_match_detail(match_id: str) -> dict:
    """
    Returns full match detail including per-map per-player stats.
    {match_id, status, teams: [{name, tag, score, is_winner}],
     maps: [{map_name, team1_score, team2_score, winner,
             players: {team1: [...], team2: [...]}}]}
    """
    if match_id in _match_cache:
        return _match_cache[match_id]

    url = f"{BASE}/{match_id}"
    soup = _fetch(url)

    # ── Header ──
    header = soup.select_one("div.match-header-vs")

    t1_name_el = soup.select_one("a.match-header-link.mod-1 div.wf-title-med")
    t2_name_el = soup.select_one("a.match-header-link.mod-2 div.wf-title-med")
    t1_name = _text(t1_name_el)
    t2_name = _text(t2_name_el)

    # Tags (short codes)
    t1_tag_el = soup.select_one("a.match-header-link.mod-1 div.wf-title-med")
    t2_tag_el = soup.select_one("a.match-header-link.mod-2 div.wf-title-med")
    t1_tag = t1_name  # will refine below
    t2_tag = t2_name

    # Scores
    winner_score_el = soup.select_one("span.match-header-vs-score-winner")
    loser_score_el = soup.select_one("span.match-header-vs-score-loser")

    # Determine which team won overall
    notes = soup.select("div.match-header-vs-note")
    match_status = _text(notes[0]).lower() if notes else "upcoming"
    if match_status in ("final", "completed"):
        match_status = "completed"
    elif match_status == "live":
        match_status = "live"
    else:
        match_status = "upcoming"

    series_format = _text(notes[1]) if len(notes) > 1 else "Bo3"

    # Figure out team scores from the header
    # The winner/loser spans don't tell us which team — we need the order
    score_els = header.select("span.match-header-vs-score-winner, span.match-header-vs-score-loser") if header else []
    t1_series_score = _text(score_els[0]) if len(score_els) > 0 else "0"
    t2_series_score = _text(score_els[1]) if len(score_els) > 1 else "0"

    t1_winner = _int(t1_series_score) > _int(t2_series_score)

    teams = [
        {"name": t1_name, "tag": t1_tag, "score": t1_series_score, "is_winner": t1_winner},
        {"name": t2_name, "tag": t2_tag, "score": t2_series_score, "is_winner": not t1_winner},
    ]

    # ── Maps ──
    maps = []
    game_divs = soup.select("div.vm-stats-game")

    for game_div in game_divs:
        game_id = game_div.get("data-game-id", "")
        if game_id == "all":
            continue  # skip the aggregate

        header_div = game_div.select_one("div.vm-stats-game-header")
        if not header_div:
            continue

        map_name_el = header_div.select_one("div.map span")
        if not map_name_el:
            map_name_el = header_div.select_one("div.map")
        raw_map_name = _text(map_name_el).split("\n")[0].strip()
        # Remove "PICK" suffix that vlr.gg appends (e.g. "LotusPICK" → "Lotus")
        map_name = re.sub(r'PICK$', '', raw_map_name).strip()

        score_divs = header_div.select("div.team")
        map_t1_score = 0
        map_t2_score = 0
        if len(score_divs) >= 2:
            s1 = score_divs[0].select_one("div.score")
            s2 = score_divs[1].select_one("div.score")
            map_t1_score = _int(_text(s1))
            map_t2_score = _int(_text(s2))

        winner = None
        if map_t1_score > map_t2_score:
            winner = t1_name
        elif map_t2_score > map_t1_score:
            winner = t2_name

        # Duration from header if available
        duration_el = header_div.select_one("div.map div.map-duration")
        duration = _text(duration_el) if duration_el else ""

        # ── Player stats ──
        # vlr.gg uses two <tbody> blocks per table (one per team), but
        # the tbody index isn't reliable. Instead, assign players based
        # on whether we've seen 5 players already (each team has 5).
        tables = game_div.select("table.wf-table-inset.mod-overview")
        all_players = []

        for table in tables:
            rows = table.select("tbody tr")
            for row in rows:
                player_cell = row.select_one("td.mod-player")
                if not player_cell:
                    continue

                player_link = player_cell.select_one("a")
                if not player_link:
                    continue

                name_div = player_link.select_one("div[style*='font-weight']")
                if not name_div:
                    name_div = player_link.select_one("div")
                player_name = _text(name_div)

                team_abbrev_el = player_link.select("div")
                team_abbrev = _text(team_abbrev_el[1]) if len(team_abbrev_el) > 1 else ""

                player_href = player_link.get("href", "")

                agent_el = row.select_one("td.mod-agents img")
                agent = agent_el.get("title", "") if agent_el else ""

                stat_cells = row.select("td.mod-stat")
                stats_raw = []
                for cell in stat_cells:
                    both_span = cell.select_one("span.mod-both")
                    stats_raw.append(_text(both_span) if both_span else _text(cell))

                player_data = {
                    "name": player_name,
                    "team": team_abbrev,
                    "agent": agent,
                    "player_url": player_href,
                    "rating": stats_raw[0] if len(stats_raw) > 0 else "",
                    "acs": stats_raw[1] if len(stats_raw) > 1 else "",
                    "kills": stats_raw[2] if len(stats_raw) > 2 else "",
                    "deaths": stats_raw[3] if len(stats_raw) > 3 else "",
                    "assists": stats_raw[4] if len(stats_raw) > 4 else "",
                    "kd_diff": stats_raw[5] if len(stats_raw) > 5 else "",
                    "kast": stats_raw[6] if len(stats_raw) > 6 else "",
                    "adr": stats_raw[7] if len(stats_raw) > 7 else "",
                    "hs_pct": stats_raw[8] if len(stats_raw) > 8 else "",
                    "fk": stats_raw[9] if len(stats_raw) > 9 else "",
                    "fd": stats_raw[10] if len(stats_raw) > 10 else "",
                    "fk_diff": stats_raw[11] if len(stats_raw) > 11 else "",
                }
                all_players.append(player_data)

        # Split: first 5 = team1, next 5 = team2
        team1_players = all_players[:5]
        team2_players = all_players[5:]

        maps.append({
            "map_name": map_name,
            "team1_score": map_t1_score,
            "team2_score": map_t2_score,
            "winner": winner,
            "duration": duration,
            "players": {
                "team1": team1_players,
                "team2": team2_players,
            },
        })

    result = {
        "match_id": match_id,
        "status": match_status,
        "format": series_format,
        "teams": teams,
        "maps": maps,
    }

    # Cache completed matches for 24h, live/upcoming for 60s
    if match_status == "completed":
        _match_cache[match_id] = result

    return result
