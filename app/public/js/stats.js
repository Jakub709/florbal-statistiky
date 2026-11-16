/**
 * Výpočet statistik – stejné vzorce jako v původní Excelové tabulce:
 *   odehráno = Σ výhry + Σ prohry
 *   Výhry %  = výher / odehráno                      (Excel: C = F / E)
 *   Účast %  = odehráno / Σ zápasů všech hracích dnů (Excel: D = E / SUM(H2:CA2))
 *   Pořadí   = RANK podle Výhry % (shodné hodnoty sdílejí pořadí)
 * Navíc: minimální účast pro zařazení do pořadí (nastavuje admin, výchozí 0 = jako Excel).
 * Soubor funguje v prohlížeči (window.FlorbalStats) i v Node.js (require).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlorbalStats = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function compute(data) {
    const settings = data.settings || {};
    const minAtt = Number(settings.minAttendance) || 0;
    const sessions = [...data.sessions].sort((a, b) => a.date.localeCompare(b.date));
    const totalGames = sessions.reduce((a, s) => a + s.games, 0);

    const players = data.players.map((p) => {
      let wins = 0, losses = 0, days = 0, cw = 0, cp = 0;
      const history = [];
      const form = [];
      sessions.forEach((s, i) => {
        const r = s.results[p.id];
        if (r) {
          wins += r.w; losses += r.l; days++;
          cw += r.w; cp += r.w + r.l;
          form.push(r.w > r.l ? 'W' : r.w < r.l ? 'L' : 'D');
        }
        history.push({
          sessionId: s.id, date: s.date, index: i, games: s.games,
          w: r ? r.w : null, l: r ? r.l : null,
          cumWinPct: cp ? cw / cp : null,
        });
      });
      const played = wins + losses;
      const winPct = played ? wins / played : null;
      const attendance = totalGames ? played / totalGames : 0;
      const firstIdx = history.findIndex((h) => h.w !== null);
      return {
        id: p.id, name: p.name, active: p.active !== false,
        played, wins, losses, days, winPct, attendance,
        eligible: played > 0 && attendance * 100 + 1e-9 >= minAtt,
        firstDate: firstIdx >= 0 ? history[firstIdx].date : null,
        form: form.slice(-5), history, rank: null,
      };
    });

    // RANK.EQ: 1 + počet hráčů s lepším poměrem (porovnání křížovým násobením kvůli přesnosti)
    const ranked = players.filter((p) => p.eligible);
    ranked.forEach((p) => {
      p.rank = 1 + ranked.filter((o) => o.wins * p.played > p.wins * o.played).length;
    });

    const sorted = [...players].sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank || b.attendance - a.attendance || a.name.localeCompare(b.name, 'cs');
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return (b.winPct ?? -1) - (a.winPct ?? -1) || a.name.localeCompare(b.name, 'cs');
    });

    const sessionStats = sessions.map((s) => {
      const res = Object.entries(s.results);
      return {
        ...s,
        playerCount: res.length,
        totalW: res.reduce((a, [, r]) => a + r.w, 0),
        totalL: res.reduce((a, [, r]) => a + r.l, 0),
      };
    });

    const totalWins = players.reduce((a, p) => a + p.wins, 0);
    const totalPlayed = players.reduce((a, p) => a + p.played, 0);
    return {
      settings, totalGames, sessions: sessionStats, players: sorted,
      avgPlayers: sessions.length ? sessionStats.reduce((a, s) => a + s.playerCount, 0) / sessions.length : 0,
      avgWinPct: totalPlayed ? totalWins / totalPlayed : 0,
      lastSession: sessionStats[sessionStats.length - 1] || null,
    };
  }

  return { compute };
});
