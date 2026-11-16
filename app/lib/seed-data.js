// Aktuální data aplikace (hráči, termíny, nastavení) – bez hesel a tajných klíčů.
// Generuje se příkazem `npm run sync` (z živého webu) nebo `npm run seed` (z data/db.json).
// Nová kopie aplikace (lokálně i na Netlify) začíná z těchto dat.
module.exports = {
  "settings": {
    "title": "Florbal",
    "season": "2026/27",
    "subtitle": "Pondělní florbal – statistiky hráčů",
    "minAttendance": 0
  },
  "players": [
    {
      "id": "p1",
      "name": "Blažíček Robin",
      "active": true
    },
    {
      "id": "p2",
      "name": "Dymák Petr",
      "active": true
    },
    {
      "id": "p3",
      "name": "Tlustý Tomáš",
      "active": true
    },
    {
      "id": "p4",
      "name": "Šimánek David",
      "active": true
    },
    {
      "id": "p5",
      "name": "Ostrý Martin",
      "active": true
    },
    {
      "id": "p6",
      "name": "Beneš Petr",
      "active": true
    },
    {
      "id": "p7",
      "name": "Růžička Filip",
      "active": true
    },
    {
      "id": "p8",
      "name": "Klepárník Martin",
      "active": true
    },
    {
      "id": "p9",
      "name": "Sláma Adam",
      "active": true
    },
    {
      "id": "p10",
      "name": "Šimon Jan",
      "active": true
    },
    {
      "id": "p11",
      "name": "Bednářová Káťa",
      "active": true
    },
    {
      "id": "p12",
      "name": "Smrčka Ladislav",
      "active": true
    },
    {
      "id": "p13",
      "name": "Hrstka David",
      "active": true
    }
  ],
  "sessions": [
    {
      "id": "s1",
      "date": "2026-09-07",
      "games": 4,
      "note": "",
      "results": {
        "p1": {
          "w": 3,
          "l": 1
        },
        "p2": {
          "w": 2,
          "l": 2
        },
        "p3": {
          "w": 2,
          "l": 2
        },
        "p5": {
          "w": 2,
          "l": 2
        },
        "p7": {
          "w": 3,
          "l": 1
        },
        "p8": {
          "w": 4,
          "l": 0
        },
        "p9": {
          "w": 1,
          "l": 3
        },
        "p10": {
          "w": 2,
          "l": 2
        },
        "p11": {
          "w": 1,
          "l": 3
        },
        "p12": {
          "w": 0,
          "l": 4
        }
      }
    },
    {
      "id": "s2",
      "date": "2026-09-14",
      "games": 3,
      "note": "",
      "results": {
        "p2": {
          "w": 3,
          "l": 0
        },
        "p3": {
          "w": 2,
          "l": 1
        },
        "p4": {
          "w": 2,
          "l": 1
        },
        "p5": {
          "w": 3,
          "l": 0
        },
        "p6": {
          "w": 2,
          "l": 1
        },
        "p8": {
          "w": 2,
          "l": 1
        },
        "p9": {
          "w": 0,
          "l": 3
        },
        "p10": {
          "w": 0,
          "l": 3
        },
        "p12": {
          "w": 1,
          "l": 2
        }
      }
    },
    {
      "id": "s3",
      "date": "2026-09-21",
      "games": 3,
      "note": "",
      "results": {
        "p2": {
          "w": 2,
          "l": 1
        },
        "p3": {
          "w": 2,
          "l": 1
        },
        "p5": {
          "w": 1,
          "l": 2
        },
        "p6": {
          "w": 2,
          "l": 1
        },
        "p7": {
          "w": 2,
          "l": 1
        },
        "p8": {
          "w": 1,
          "l": 2
        },
        "p9": {
          "w": 1,
          "l": 2
        },
        "p10": {
          "w": 1,
          "l": 2
        },
        "p12": {
          "w": 2,
          "l": 1
        }
      }
    },
    {
      "id": "s4",
      "date": "2026-09-28",
      "games": 4,
      "note": "",
      "results": {
        "p2": {
          "w": 3,
          "l": 1
        },
        "p3": {
          "w": 3,
          "l": 1
        },
        "p4": {
          "w": 2,
          "l": 2
        },
        "p6": {
          "w": 2,
          "l": 2
        },
        "p7": {
          "w": 0,
          "l": 4
        },
        "p8": {
          "w": 1,
          "l": 3
        },
        "p9": {
          "w": 3,
          "l": 1
        },
        "p11": {
          "w": 2,
          "l": 2
        }
      }
    },
    {
      "id": "s5",
      "date": "2026-10-05",
      "games": 3,
      "note": "",
      "results": {
        "p2": {
          "w": 2,
          "l": 1
        },
        "p4": {
          "w": 2,
          "l": 1
        },
        "p5": {
          "w": 1,
          "l": 2
        },
        "p6": {
          "w": 2,
          "l": 1
        },
        "p7": {
          "w": 1,
          "l": 2
        },
        "p8": {
          "w": 1,
          "l": 2
        },
        "p9": {
          "w": 2,
          "l": 1
        },
        "p12": {
          "w": 1,
          "l": 2
        }
      }
    },
    {
      "id": "s6",
      "date": "2026-10-12",
      "games": 3,
      "note": "",
      "results": {
        "p2": {
          "w": 2,
          "l": 1
        },
        "p4": {
          "w": 1,
          "l": 2
        },
        "p5": {
          "w": 3,
          "l": 0
        },
        "p6": {
          "w": 1,
          "l": 2
        },
        "p7": {
          "w": 2,
          "l": 1
        },
        "p8": {
          "w": 2,
          "l": 1
        },
        "p9": {
          "w": 2,
          "l": 1
        },
        "p12": {
          "w": 0,
          "l": 3
        },
        "p13": {
          "w": 0,
          "l": 3
        }
      }
    },
    {
      "id": "s7",
      "date": "2026-10-19",
      "games": 3,
      "note": "",
      "results": {
        "p2": {
          "w": 1,
          "l": 2
        },
        "p4": {
          "w": 1,
          "l": 2
        },
        "p5": {
          "w": 2,
          "l": 1
        },
        "p6": {
          "w": 2,
          "l": 1
        },
        "p7": {
          "w": 3,
          "l": 0
        },
        "p8": {
          "w": 2,
          "l": 1
        },
        "p9": {
          "w": 1,
          "l": 2
        },
        "p10": {
          "w": 2,
          "l": 1
        },
        "p13": {
          "w": 0,
          "l": 3
        }
      }
    },
    {
      "id": "s8",
      "date": "2026-10-26",
      "games": 3,
      "note": "Datum doplněno odhadem při importu (v Excelu chybělo).",
      "results": {
        "p2": {
          "w": 1,
          "l": 2
        },
        "p4": {
          "w": 3,
          "l": 0
        },
        "p5": {
          "w": 1,
          "l": 2
        },
        "p6": {
          "w": 2,
          "l": 1
        },
        "p8": {
          "w": 0,
          "l": 3
        },
        "p9": {
          "w": 1,
          "l": 2
        },
        "p10": {
          "w": 1,
          "l": 2
        },
        "p12": {
          "w": 2,
          "l": 1
        },
        "p13": {
          "w": 1,
          "l": 2
        }
      }
    },
    {
      "id": "s9",
      "date": "2026-11-02",
      "games": 3,
      "note": "Datum doplněno odhadem při importu (v Excelu chybělo).",
      "results": {
        "p2": {
          "w": 2,
          "l": 1
        },
        "p4": {
          "w": 2,
          "l": 1
        },
        "p5": {
          "w": 3,
          "l": 0
        },
        "p6": {
          "w": 1,
          "l": 2
        },
        "p7": {
          "w": 1,
          "l": 2
        },
        "p8": {
          "w": 2,
          "l": 1
        },
        "p9": {
          "w": 0,
          "l": 3
        },
        "p10": {
          "w": 2,
          "l": 1
        },
        "p12": {
          "w": 1,
          "l": 2
        },
        "p13": {
          "w": 1,
          "l": 2
        }
      }
    },
    {
      "id": "s10",
      "date": "2026-11-09",
      "games": 2,
      "note": "Datum doplněno odhadem při importu (v Excelu chybělo).",
      "results": {
        "p2": {
          "w": 2,
          "l": 0
        },
        "p3": {
          "w": 1,
          "l": 1
        },
        "p4": {
          "w": 2,
          "l": 0
        },
        "p5": {
          "w": 0,
          "l": 2
        },
        "p6": {
          "w": 1,
          "l": 1
        },
        "p8": {
          "w": 0,
          "l": 2
        },
        "p9": {
          "w": 1,
          "l": 1
        },
        "p10": {
          "w": 0,
          "l": 2
        },
        "p12": {
          "w": 1,
          "l": 1
        },
        "p13": {
          "w": 2,
          "l": 0
        }
      }
    }
  ]
};
