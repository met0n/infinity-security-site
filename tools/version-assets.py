#!/usr/bin/env python3
"""Versiona CSS e JS pelo hash do conteúdo.

Os arquivos têm nome fixo (style.css, main.js), então o navegador precisa de
uma URL diferente para perceber que houve mudança. Este script recalcula o
hash de cada arquivo e atualiza os links em todos os HTML do site.

Rode sempre que alterar assets/css/*.css ou assets/js/*.js:

    python3 tools/version-assets.py   (a partir de site/)
"""
import hashlib
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ALVOS = ["assets/css/style.css", "assets/js/main.js", "assets/js/shield-points.js",
         "assets/fonts/fonts.css"]


def hash_curto(caminho: pathlib.Path) -> str:
    return hashlib.sha256(caminho.read_bytes()).hexdigest()[:8]


def main() -> int:
    versoes = {}
    for rel in ALVOS:
        arquivo = RAIZ / rel
        if not arquivo.exists():
            print(f"aviso: {rel} não encontrado, ignorando")
            continue
        versoes[rel] = hash_curto(arquivo)

    htmls = sorted(RAIZ.glob("*.html")) + sorted(RAIZ.glob("**/*.html"))
    htmls = sorted(set(htmls))

    total = 0
    for html in htmls:
        texto = original = html.read_text(encoding="utf-8")
        for rel, versao in versoes.items():
            # substitui /rel e /rel?v=qualquercoisa por /rel?v=<hash>
            padrao = re.compile(r'(/' + re.escape(rel) + r')(\?v=[0-9a-f]+)?(["\'])')
            texto = padrao.sub(rf'\1?v={versao}\3', texto)
        if texto != original:
            html.write_text(texto, encoding="utf-8")
            total += 1

    for rel, versao in versoes.items():
        print(f"{rel} → v={versao}")
    print(f"{total} arquivo(s) HTML atualizado(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
