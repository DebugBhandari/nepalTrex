#!/usr/bin/env python3
"""Download trek and stay images from Wikimedia Commons."""
import os
import sys
import time
import requests

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {
    "User-Agent": "NepalTrex/1.0 (https://github.com/DebugBhandari/nepalTrex; trek imagery downloader) python-requests/2.x",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
}

TREKS = [
    ("everest-base-camp", "Everest Base Camp Trek Khumbu Nepal"),
    ("gokyo-lakes", "Gokyo Lakes Khumbu Renjo La Nepal"),
    ("three-passes", "Cho La pass Khumbu Three passes Nepal"),
    ("island-peak", "Island Peak Imja Tse Nepal climbing"),
    ("annapurna-circuit", "Annapurna Circuit Trek Thorong La Nepal"),
    ("annapurna-base-camp", "Annapurna Base Camp Trek Nepal Sanctuary"),
    ("poon-hill", "Poon Hill sunrise Ghorepani Nepal Annapurna"),
    ("mardi-himal", "Mardi Himal Trek Nepal Annapurna"),
    ("langtang-valley", "Langtang Valley Trek Nepal Kyanjin"),
    ("gosaikunda-lake", "Gosaikunda lake Nepal Langtang"),
    ("helambu", "Helambu Trek Nepal Chisapani"),
    ("manaslu-circuit", "Manaslu Circuit Trek Nepal Larkya La"),
    ("tsum-valley", "Tsum Valley Trek Nepal Manaslu"),
    ("upper-mustang", "Upper Mustang Lo Manthang Nepal"),
    ("kanchenjunga", "Kanchenjunga base camp trek Nepal"),
    ("rara-lake", "Rara Lake Mugu Nepal"),
]

STAYS = [
    ("lodge-exterior", "Nepal mountain teahouse lodge Himalaya"),
    ("khumbu-lodge", "Khumbu teahouse lodge Nepal mountains"),
    ("lakeside-boutique", "Pokhara boutique hotel Nepal lakeside"),
    ("jungle-retreat", "Nepal jungle lodge resort Chitwan"),
    ("heritage-courtyard", "Nepal heritage hotel courtyard Newari"),
    ("sunrise-ridge", "Nagarkot lodge sunrise Nepal"),
    ("mustang-inn", "Upper Mustang lodge Nepal"),
    ("village-homestay", "Nepal village homestay mountain"),
    ("alpine-basecamp", "Nepal alpine lodge base camp"),
    ("monastery-guesthouse", "Nepal monastery guesthouse himalaya"),
    ("hotel-room", "Nepal mountain lodge room interior"),
    ("room-standard", "Nepal hotel room interior mountain lodge"),
    ("room-suite", "Boutique suite hotel Nepal interior"),
    ("room-dorm", "Trekking dorm room Nepal teahouse"),
    ("hotel-room-2", "teahouse dormitory Nepal trekking"),
    ("food-breakfast", "Nepal breakfast tea bread hotel"),
    ("food-dal-bhat", "Dal Bhat Nepal food traditional"),
    ("food-momo", "Momo Nepal dumplings plate"),
    ("food-thukpa", "Thukpa noodle soup Nepal"),
]


def wikimedia_image(search_term, out_path):
    """Search Wikimedia Commons and download the best matching image."""
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {search_term}",
        "gsrnamespace": "6",
        "gsrlimit": "10",
        "prop": "imageinfo",
        "iiprop": "url|size|mime",
        "iiurlwidth": "1280",
        "format": "json",
    }
    r = requests.get(COMMONS_API, params=params, timeout=25, headers=HEADERS)
    r.raise_for_status()
    data = r.json()

    pages = data.get("query", {}).get("pages", {})
    candidates = []
    for page in pages.values():
        for info in page.get("imageinfo", []):
            mime = info.get("mime", "")
            if mime not in ("image/jpeg", "image/png"):
                continue
            url = info.get("thumburl") or info.get("url")
            w = info.get("thumbwidth", 0)
            if url and w >= 400:
                candidates.append((w, url))

    if not candidates:
        return 0

    candidates.sort(reverse=True)
    _, url = candidates[0]

    r2 = requests.get(url, timeout=40, stream=True, headers=HEADERS)
    r2.raise_for_status()
    with open(out_path, "wb") as f:
        for chunk in r2.iter_content(16384):
            f.write(chunk)
    return os.path.getsize(out_path)


def main():
    out_base = sys.argv[1] if len(sys.argv) > 1 else "."
    treks_dir = os.path.join(out_base, "treks")
    stays_dir = os.path.join(out_base, "stays")
    os.makedirs(treks_dir, exist_ok=True)
    os.makedirs(stays_dir, exist_ok=True)

    print("=== Trek images ===")
    for slug, term in TREKS:
        out = os.path.join(treks_dir, f"{slug}.jpg")
        if os.path.exists(out) and os.path.getsize(out) > 50_000:
            print(f"  skip  {slug} ({os.path.getsize(out)//1024}KB)")
            continue
        print(f"  fetch {slug}  [{term}]")
        try:
            sz = wikimedia_image(term, out)
            if sz:
                print(f"         ok  {sz//1024}KB")
            else:
                print(f"         no results")
        except Exception as e:
            print(f"         ERROR: {e}")
        time.sleep(0.4)

    print("\n=== Stay / hotel images ===")
    for slug, term in STAYS:
        out = os.path.join(stays_dir, f"{slug}.jpg")
        if os.path.exists(out) and os.path.getsize(out) > 20_000:
            print(f"  skip  {slug}")
            continue
        print(f"  fetch {slug}  [{term}]")
        try:
            sz = wikimedia_image(term, out)
            if sz:
                print(f"         ok  {sz//1024}KB")
            else:
                print(f"         no results")
        except Exception as e:
            print(f"         ERROR: {e}")
        time.sleep(0.4)

    print("\nDone.")


if __name__ == "__main__":
    main()
