#!/usr/bin/env python3
"""Buchee Teknik Temizlik 1.0: dependency-free static smoke checks.

Run: python3 scripts/check_frontend_integrity.py
This is NOT a substitute for mobile browser or Supabase integration testing.
"""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"
APP = ROOT / "app.js"


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.assets = []
        self.has_lang_tr = False
        self.has_viewport = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html" and a.get("lang") == "tr":
            self.has_lang_tr = True
        if tag == "meta" and a.get("name") == "viewport":
            self.has_viewport = True
        if "id" in a:
            self.ids.append(a["id"])
        if tag == "script" and a.get("src"):
            self.assets.append(("js", a["src"]))
        if tag == "link" and a.get("rel") == "stylesheet" and a.get("href"):
            self.assets.append(("css", a["href"]))


def main():
    errors = []
    warnings = []
    if not HTML.is_file() or not APP.is_file():
        print("FAIL: index.html veya app.js bulunamadi")
        return 1

    parser = PageParser()
    parser.feed(HTML.read_text(encoding="utf-8"))
    app = APP.read_text(encoding="utf-8")
    if not parser.has_lang_tr:
        errors.append("HTML dil etiketi lang=tr degil")
    if not parser.has_viewport:
        errors.append("Mobil viewport meta etiketi eksik")

    duplicates = [key for key, count in Counter(parser.ids).items() if count > 1]
    if duplicates:
        errors.append("Tekrarlanan HTML ID: " + ", ".join(duplicates))

    for element_id in ("app-root", "main-content", "pati-header-notifications", "buchee-header-messages"):
        if element_id not in parser.ids:
            errors.append("Zorunlu arayuz kimligi eksik: " + element_id)

    seen = Counter(src.split("?", 1)[0] for _, src in parser.assets)
    repeated = [path for path, count in seen.items() if count > 1]
    if repeated:
        errors.append("Tekrarlanan JS/CSS dosyasi: " + ", ".join(repeated))

    for kind, src in parser.assets:
        path = src.split("?", 1)[0].split("#", 1)[0]
        if re.match(r"^(?:https?:)?//|^data:", path):
            continue
        if not (ROOT / path.lstrip("/")).is_file():
            errors.append("Eksik yerel " + kind + " dosyasi: " + path)

    if len(parser.assets) > 100:
        warnings.append(f"Cok sayida stil/betik baglantisi: {len(parser.assets)}; konsolidasyon gerekli")

    for feature in ("dm-record-start", "pati-reel", "follow", "notifications"):
        if feature not in app:
            warnings.append("app.js icinde beklenen ozellik anahtari yok: " + feature)

    print(f"Kontrol: {len(parser.assets)} yerel/uzak CSS ve JS baglantisi, {len(parser.ids)} HTML kimligi")
    for warning in warnings:
        print("UYARI:", warning)
    for error in errors:
        print("HATA:", error)
    if errors:
        print(f"SONUC: BASARISIZ ({len(errors)} hata)")
        return 1
    print("SONUC: Temel statik kontroller basarili (tarayici testi yerine gecmez)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
