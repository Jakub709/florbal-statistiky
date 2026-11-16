# Florbal – statistiky hráčů

Web pro pondělní florbal: pořadí hráčů podle výher, účast, vývoj každého hráče během sezóny
a administrace pro zápis nových termínů.

**Živá verze:** https://florbal-statistiky.netlify.app

- `app/` – aplikace (veřejný web, administrace, lokální server, Netlify Function). Návod je v [app/README.md](app/README.md).
- `Florbal 26-27.xlsx` – původní Excelová tabulka, ze které se nahrála úvodní data.

## Nejjednodušší: nahrát složku na Netlify (bez GitHubu)

1. Na GitHubu klikněte na **Code → Download ZIP** (účet není potřeba) a ZIP rozbalte.
2. Přihlaste se na [app.netlify.com](https://app.netlify.com), zvolte **Add new project → Deploy manually**
   a přetáhněte rozbalenou složku (celou, nebo jen `app/public`).
3. Hotovo. Web ukazuje statistiky ze souboru `app/public/data.json`.

**Zápis nových výsledků v této verzi:**
1. Otevřete na webu **Administrace**. Tato verze nemá přihlášení, změny se ukládají jen ve vašem prohlížeči.
2. Zapište termíny a hráče jako obvykle a klikněte na **Stáhnout data.json** v liště nahoře.
3. Staženým souborem nahraďte `app/public/data.json` ve své složce.
4. Na Netlify otevřete projekt → **Deploys** a přetáhněte tam složku znovu.

Bez nahrání nové složky změny nikdo jiný nevidí. Proto tato verze nepotřebuje heslo: zveřejnit je může
jen ten, kdo má přístup k projektu na Netlify.

## Plná verze s přihlášením a ukládáním na serveru

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Jakub709/florbal-statistiky)

Tlačítko zkopíruje repozitář do vašeho GitHubu, založí web na Netlify a zeptá se na **ADMIN_PASSWORD**
(počáteční heslo do administrace). Web začne s aktuálními daty z repozitáře.

Ručně jde totéž přes Netlify → *Add new project* → *Import an existing project* → vybrat tento repozitář
(nastavení se načte samo z `netlify.toml`) a v *Environment variables* přidat `ADMIN_PASSWORD`.

Rozdíl oproti nahrání složky: výsledky se zapisují přímo na webu po přihlášení, bez stahování
a nahrávání souborů. Vyžaduje to ale účet na GitHubu, protože jen sestavení z Gitu spustí serverovou část.

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
