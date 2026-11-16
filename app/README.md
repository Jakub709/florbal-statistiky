# Florbal – statistiky hráčů

Webová aplikace pro pondělní florbal: pořadí podle výher, účast, vývoj každého hráče a administrace pro zápis nových termínů.
Nepotřebuje žádné knihovny ani databázový server. Stačí mít nainstalovaný **Node.js 18+**.

## Spuštění

**Nejjednodušeji (Windows):** dvojklik na `spustit.bat`. Otevře se prohlížeč s aplikací.
Okno příkazového řádku nechte otevřené, jeho zavřením se aplikace vypne.

Nebo z příkazové řádky:

```bash
cd app
npm start
```

- Web: http://localhost:3000
- Administrace: http://localhost:3000/admin

Jiný port: `PORT=8080 npm start`.

## První přihlášení do administrace

Při prvním spuštění se vygeneruje náhodné heslo pro uživatele `admin` a uloží se do souboru
`data/PRVNI-HESLO-ADMIN.txt`. Po přihlášení si heslo změňte (Administrace → Nastavení).
Po změně hesla se tento soubor sám smaže.

## Co umí

**Veřejná část**
- Přehled: souhrnná čísla sezóny, nejlepší trojice, tabulka hráčů (řazení podle libovolného sloupce),
  graf Výhry × účast a graf docházky po termínech.
- Detail hráče: vývoj úspěšnosti během sezóny, výsledky termín po termínu.
- Termíny: všechny hrací dny s výsledky jednotlivých hráčů.
- Jak počítáme: vysvětlení výpočtů.
- Světlý a tmavý režim, funguje i na mobilu.

**Administrace**
- Nový termín: datum, počet zápasů a u každého přítomného hráče výhry (prohry se dopočítají).
  Upozorní, když součty nesedí.
- Úprava a mazání termínů.
- Hráči: přidání, přejmenování, deaktivace (zmizí z formuláře, statistiky zůstanou), smazání.
- Nastavení: název, sezóna, minimální účast pro zařazení do pořadí, změna hesla.
- Záloha (JSON) a export pro Excel (CSV).
- Obnova ze zálohy: nahraje stažený JSON a nahradí jím současná data. Předchozí stav se
  automaticky uloží do `data/zalohy/`, takže jde krok vrátit.

## Výpočty (stejné jako v Excelu)

| Ukazatel | Vzorec |
|---|---|
| Odehráno | výhry + prohry |
| Výhry % | výhry ÷ odehráno |
| Účast % | odehráno ÷ součet zápasů všech termínů |
| Pořadí | RANK podle Výhry % (stejné procento = stejné místo) |

`npm test` znovu načte původní `Florbal 26-27.xlsx` a ověří, že aplikace dává stejná čísla jako Excel.

## Data

Lokálně je vše v souboru `data/db.json` (není v repozitáři). Pokud ještě neexistuje, aplikace začne
z aktuálních dat v `lib/seed-data.js`, který je součástí repozitáře.

- `npm run sync` – stáhne aktuální data z živého webu do `lib/seed-data.js` (pak změnu commitněte).
- `npm run seed` – totéž, ale z lokálního `data/db.json`.

Původní data šla nahrát i přímo z Excelu:

```bash
npm run import -- "../Florbal 26-27.xlsx" --force
```

Pozor: `--force` přepíše všechny hráče a termíny v aplikaci.
U posledních tří termínů v Excelu chybělo datum, proto se při importu doplnily další pondělí
(26. 10., 2. 11. a 9. 11. 2026). Případně je opravte v administraci.

## Web na Netlify

Aplikace běží na **https://florbal-statistiky.netlify.app** (administrace na `/admin`).

- Statické stránky jsou ve složce `public/`, API běží jako Netlify Function `netlify/functions/api.mjs`.
  Logiku sdílí s lokálním serverem (`lib/core.js`).
- Data na webu jsou uložená v **Netlify Blobs** (úložiště `florbal`), ne v `data/db.json`.
  Web a lokální verze jsou tedy dvě oddělené kopie dat. Přenést je mezi sebou můžete přes
  Zálohu (JSON) a Obnovu ze zálohy v administraci.
- Při prvním spuštění se web naplní daty z `lib/seed-data.js`. Nový web vytvořený z repozitáře
  tak začne s daty, která v repozitáři byla naposledy uložena přes `npm run sync`.
- Počáteční heslo admina na webu je v proměnné prostředí `ADMIN_PASSWORD` na Netlify
  a v souboru `data/NETLIFY-HESLO-ADMIN.txt`. Po změně hesla v administraci už neplatí.
- Složku `data/` nikdy nenahrávejte na Netlify, jsou v ní lokální hesla.

Nové nasazení po úpravě kódu: Netlify CLI (`npx netlify-cli deploy --prod`) spusťte ve složce `app`
po přihlášení k účtu (`npx netlify-cli login`) a propojení s projektem `florbal-statistiky`.
Data na webu se nasazením nepřepíšou.

## Fotografie

Z Wikimedia Commons, licence CC BY-SA 4.0. Autoři jsou uvedeni v patičce webu a v `public/img/credits.json`.
