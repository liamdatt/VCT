"""
VCT Fantasy — vlr.gg Scraper API

Self-hosted FastAPI service that scrapes vlr.gg with BeautifulSoup,
caches results, and exposes clean JSON endpoints.
"""

import logging
from fastapi import FastAPI, HTTPException

from scraper import get_event_matches, get_match_detail

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")

app = FastAPI(title="VCT Fantasy VLR Scraper", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/events/{event_id}/matches")
def event_matches(event_id: str):
    """List all matches for a vlr.gg event."""
    try:
        matches = get_event_matches(event_id)
        return {"event_id": event_id, "matches": matches}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/matches/{match_id}")
def match_detail(match_id: str):
    """Full match detail with per-map per-player stats."""
    try:
        detail = get_match_detail(match_id)
        return detail
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
