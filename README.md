# Florbal – statistiky hráčů

Web pro pondělní florbal: pořadí hráčů podle výher, účast, vývoj každého hráče během sezóny
a administrace pro zápis nových termínů.

**Živá verze:** https://florbal-statistiky.netlify.app

- `app/` – aplikace (veřejný web, administrace, lokální server, Netlify Function). Návod je v [app/README.md](app/README.md).
- `Florbal 26-27.xlsx` – původní Excelová tabulka, ze které se nahrála úvodní data.

## Rychlý start

```bash
cd app
npm install
npm start
```

Pak otevřete http://localhost:3000. Při prvním spuštění se heslo admina uloží do `app/data/PRVNI-HESLO-ADMIN.txt`.

## Data v repozitáři

Kopie aplikace začíná s **aktuálními daty z webu** (hráči, termíny, nastavení – bez hesel).
Jsou v souboru [app/lib/seed-data.js](app/lib/seed-data.js) a použijí se lokálně i na novém Netlify webu.
Aktualizují se příkazem `npm run sync` ve složce `app` (stáhne data z živého webu), po kterém je potřeba změnu commitnout.

Výpočty (Výhry % = výhry ÷ odehráno, Účast % = odehráno ÷ všechny zápasy, pořadí = RANK podle výher)
odpovídají původnímu Excelu. Ověří to `npm test`.
