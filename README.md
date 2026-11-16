# Florbal – statistiky hráčů

Web pro pondělní florbal: pořadí hráčů podle výher, účast, vývoj každého hráče během sezóny
a administrace pro zápis nových termínů.

**Živá verze:** https://florbal-statistiky.netlify.app

- `app/` – aplikace (veřejný web, administrace, lokální server, Netlify Function). Návod je v [app/README.md](app/README.md).
- `Florbal 26-27.xlsx` – původní Excelová tabulka, ze které se nahrála úvodní data.

## Vlastní kopie webu na Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Jakub709/florbal-statistiky)

Tlačítko zkopíruje repozitář do vašeho GitHubu, založí web na Netlify a zeptá se na **ADMIN_PASSWORD**
(počáteční heslo do administrace). Web začne s aktuálními daty z repozitáře.

Ručně jde totéž přes Netlify → *Add new project* → *Import an existing project* → vybrat tento repozitář
(nastavení se načte samo z `netlify.toml`) a v *Environment variables* přidat `ADMIN_PASSWORD`.

> **Nenahrávejte ZIP ručně (Netlify Drop).** Ruční nahrání jen vystaví soubory, nic nesestaví.
> Nespustí se tak serverová část (API s daty) a web se nenačte.

## Rychlý start (lokálně)

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
