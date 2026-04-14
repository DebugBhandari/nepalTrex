#!/usr/bin/env python3
import os
import requests
import time

HEADERS = {
    "User-Agent": "NepalTrex/1.0 python-requests",
    "Referer": "https://commons.wikimedia.org/",
}

direct = [
    ("/root/nepalTrex/app/public/treks/helambu.jpg",
     "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Gumba_at_helambu.jpg/1280px-Gumba_at_helambu.jpg"),
    ("/root/nepalTrex/app/public/treks/tsum-valley.jpg",
     "https://upload.wikimedia.org/wikipedia/commons/5/5e/Tsum_Valley.jpg"),
    ("/root/nepalTrex/app/public/treks/kanchenjunga.jpg",
     "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Kanchenjunga_2012.jpg/1280px-Kanchenjunga_2012.jpg"),
    ("/root/nepalTrex/app/public/stays/lodge-exterior.jpg",
     "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Teahouse_Himalaya.jpg/1280px-Teahouse_Himalaya.jpg"),
    ("/root/nepalTrex/app/public/stays/hotel-room.jpg",
     "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg"),
    ("/root/nepalTrex/app/public/stays/food-dal-bhat.jpg",
     "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg"),
    ("/root/nepalTrex/app/public/stays/food-momo.jpg",
     "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg"),
]

time.sleep(5)
for out_path, url in direct:
    if os.path.exists(out_path) and os.path.getsize(out_path) > 30000:
        print(f"skip {os.path.basename(out_path)}")
        continue
    print(f"fetch {os.path.basename(out_path)}")
    try:
        r = requests.get(url, timeout=40, stream=True, headers=HEADERS)
        r.raise_for_status()
        with open(out_path, "wb") as f:
            for chunk in r.iter_content(16384):
                f.write(chunk)
        print(f"  ok {os.path.getsize(out_path)//1024}KB")
    except Exception as e:
        print(f"  err {e}")
    time.sleep(2)
print("done")
