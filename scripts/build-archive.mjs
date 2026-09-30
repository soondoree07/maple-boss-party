// 옛 파티 기록(밈곰잉 · 쭈진)을 옛 가격표(e3f8881 data.js)로 계산해 달별 요약 JSON 으로 고정한다.
// 다시 만들 때: git show e3f8881:js/data.js > <tmp>/old-data.mjs 후
//   S=<tmp> OUT=data/archive-2026.json node scripts/build-archive.mjs  (백업 경로는 아래 B)
// 계산 규칙은 옛 js/earnings.js 와 같다: 결정석 = 옛 가격 ÷ 참여 인원(파티원만), 드랍템 shared → ÷ 인원, 아니면 taker 전액.
import { readFileSync, writeFileSync } from 'node:fs';
const OLD = await import(process.env.S + '/old-data.mjs');
const B = '/home/soondoree07/maple-boss/backup-2026-09-30/';
const parties = JSON.parse(readFileSync(B + 'parties.json', 'utf8'));
const runs = JSON.parse(readFileSync(B + 'boss_runs.json', 'utf8'));
const settings = JSON.parse(readFileSync(B + 'boss_settings.json', 'utf8'));
const KEEP = ['0f265ffa5d80', 'd262cb9edd94'];

const out = { note: '2026-09 개편 전 옛 파티 기록. 결정석은 그때 가격표 기준, 이후 바뀌지 않는 고정 기록.', parties: [] };
for (const pid of KEEP) {
  const party = parties.find(p => p.id === pid);
  const defaults = settings.find(s => s.party_id === pid)?.defaults || {};
  const members = party.members;
  const months = new Map();
  const partyRuns = runs.filter(r => r.party_id === pid).sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));
  for (const r of partyRuns) {
    const month = r.date.slice(0, 7);
    if (!months.has(month)) months.set(month, { month, runCount: 0, earn: new Map(members.map(m => [m, { crystal: 0, loot: 0 }])), loot: [], bosses: new Map() });
    const M = months.get(month);
    M.runCount++;
    const participants = (r.member_snapshot || []).filter(m => members.includes(m));
    const n = participants.length;
    const diffKey = OLD.resolveDifficultyKey(r.boss, r.difficulty, defaults);
    const bossName = OLD.getBoss(r.boss)?.name || r.boss;
    M.bosses.set(bossName, (M.bosses.get(bossName) || 0) + 1);
    if (n > 0) {
      const share = OLD.getEffectiveCrystal(r.boss, diffKey) / n;
      participants.forEach(m => { M.earn.get(m).crystal += share; });
    }
    for (const lt of r.loot || []) {
      const price = Number(lt.price);
      if (!Number.isFinite(price) || price <= 0) continue;
      let who;
      if (lt.shared === true && n > 0) { participants.forEach(m => { M.earn.get(m).loot += price / n; }); who = `${participants.join(' · ')} 분배`; }
      else if (lt.taker && M.earn.has(lt.taker)) { M.earn.get(lt.taker).loot += price; who = `${lt.taker} 독식`; }
      else continue;
      M.loot.push({ date: r.date, boss: r.boss, bossName, difficulty: diffKey, item: lt.item, price, who });
    }
  }
  const monthList = [...months.values()].reverse().map(M => {
    const memberRows = members.map(name => { const e = M.earn.get(name); return { name, crystal: e.crystal, loot: e.loot, total: e.crystal + e.loot }; })
      .sort((a, b) => b.total - a.total);
    return {
      month: M.month, runCount: M.runCount,
      total: memberRows.reduce((s, x) => s + x.total, 0),
      members: memberRows,
      bosses: [...M.bosses].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      loot: M.loot.reverse(),
    };
  });
  const overall = members.map(name => ({ name, total: monthList.reduce((s, m) => s + m.members.find(x => x.name === name).total, 0) })).sort((a, b) => b.total - a.total);
  out.parties.push({ id: pid, name: party.name, members, runCount: partyRuns.length, total: overall.reduce((s, x) => s + x.total, 0), members_total: overall, months: monthList });
}
writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
for (const p of out.parties) console.log(p.name, p.runCount, '회', p.total.toFixed(1), '억', p.months.map(m => `${m.month}:${m.runCount}회/${m.total.toFixed(1)}억/드랍${m.loot.length}`).join(' '));
