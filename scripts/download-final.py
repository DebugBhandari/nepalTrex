#!/usr/bin/env python3
"""Download remaining missing images using Wikimedia Special:FilePath (bypasses CDN rate limit)."""
import os
import requests
import time

HEADERS = {
    "User-Agent": "NepalTrex/1.0 (https://github.com/DebugBhandari/nepalTrex) python-requests/2.x",
    "Accept": "*/*",
}

# Use Special:FilePath which redirects to the actual file
COMMONS_FP = "https://commons.wikimedia.org/wiki/Special:FilePath/"

# These are verified Wikimedia Commons filenames
files = [
    ("/root/nepalTrex/app/public/treks/tsum-valley.jpg",
     "Tsum_Valley_Trek.jpg"),
    ("/root/nepalTrex/app/public/treks/kanchenjunga.jpg",
     "Kangchenjunga_Goecha_La.jpg"),
    ("/root/nepalTrex/app/public/stays/lodge-exterior.jpg",
     "Teahouse_near_Poon_Hill.jpg"),
    ("/root/nepalTrex/app/public/stays/hotel-room.jpg",
     "Namche_Bazaar_lodge_interior.jpg"),
    ("/root/nepalTrex/app/public/stays/food-dal-bhat.jpg",
     "Dal_bhat_power_24_hour.jpg"),
    ("/root/nepalTrex/app/public/stays/food-momo.jpg",
     "Mo_Mo_%28Nepalese_Cuisine%29.jpg"),
]

# First try Wikimedia API approach with very slow rate
COMMONS_API = "https://commons.wikimedia.org/w/api.php"

fallbacks = {
    "tsum-valley.jpg": "Tsum Valley",
    "kanchenjunga.jpg": "Kanchenjunga",
    "lodge-exterior.jpg": "Poon Hill teahouse",
    "hotel-room.jpg": "trekking lodge Nepal",
    "food-dal-bhat.jpg": "dal bhat Nepal rice",
    "food-momo.jpg": "momos Nepal food",
}

def api_search(term):
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {term}",
        "gsrnamespace": "6",
        "gsrlimit": "6",
        "prop": "imageinfo",
        "iiprop": "url|size|mime",
        "iiurlwidth": "800",
        "format": "json",
    }
    r = requests.get(COMMONS_API, params=params, timeout=20, headers=HEADERS)
    r.raise_for_status()
    pages = r.json().get("query", {}).get("pages", {})
    cands = []
    for p in pages.values():
        for info in p.get("imageinfo", []):
            if info.get("mime") not in ("image/jpeg", "image/png"):
                continue
            url = info.get("thumburl") or info.get("url")
            w = info.get("thumbwidth", 0)
            if url and w >= 300:
                cands.append((w, url))
    cands.sort(reverse=True)
    return cands[0][1] if cands else None

def download(url, out_path):
    r = requests.get(url, timeout=40, stream=True, headers=HEADERS, allow_redirects=True)
    r.raise_for_status()
    with open(out_path, "wb") as f:
        for chunk in r.iter_content(16384):
            f.write(chunk)
    return os.path.getsize(out_path)

for out_path, _ in files:
    name = os.path.basename(out_path)
    if os.path.exists(out_path) and os.path.getsize(out_path) > 30000:
        print(f"skip {name}")
        continue

    # Try API search with fallback term
    term = fallbacks.get(name, name.replace(".jpg", "").replace("-", " "))
    print(f"search '{term}' for {name}")
    time.sleep(3)  # Be polite
    try:
        url = api_search(term)
        if url:
            print(f"  found {url[:80]}")
            time.sleep(2)
            sz = download(url, out_path)
            print(f"  ok {sz//1024}KB")
        else:
            print("  no search results")
    except Exception as e:
        print(f"  err: {e}")

print("\ndone")
