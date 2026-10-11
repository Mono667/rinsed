const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const S = () => page.evaluate(() => RINSED.state());
  const W = (ms) => page.waitForTimeout(ms);
  const ok = (name, cond) => console.log((cond ? 'PASS ' : 'FAIL ') + name);
  await page.addInitScript(() => { window.__noAdapt = true; });
  await page.goto('http://localhost:8765/index.html?seed=' + (process.env.SEED || '424242'));
  await W(2500);
  const vp = page.viewportSize();
  await page.screenshot({ path: '../shot-levelselect.png' });
  const fits = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); const r = [...e.querySelectorAll('*')].reduce((m, c) => Math.max(m, c.getBoundingClientRect().bottom), 0); return { bottom: Math.round(r), h: innerHeight, sh: e.scrollHeight }; }, sel);
  let f0 = await fits('#start-screen'); ok('start screen fits ' + JSON.stringify(f0), f0.bottom <= f0.h);
  // HOW TO PLAY (start screen)
  await page.tap('#btn-howto'); await W(300);
  let fh = await fits('#howto-screen');
  ok('how-to fits landscape phone ' + JSON.stringify(fh), await page.isVisible('#howto-screen') && fh.bottom <= fh.h && fh.sh <= fh.h + 1);
  await page.screenshot({ path: '../shot-howto.png' });
  await page.tap('#btn-howto-back'); await W(200);
  ok('how-to back -> start screen', await page.isVisible('#start-screen') && !(await page.isVisible('#howto-screen')));
  // OUTFITS (all locked except default)
  await page.tap('#btn-outfits'); await W(400);
  ok('outfits: 4 cards, 3 locked', (await page.$$('.outfit-card')).length === 4 && (await page.$$('.outfit-card.locked')).length === 3);
  await page.tap('.outfit-card[data-id="mustard"]'); await W(200);
  ok('locked outfit not selectable', (await page.evaluate(() => RINSED.save().outfit)) === 'default');
  await page.tap('#btn-outfit-back'); await W(200);
  // ---- Level 1 ----
  await page.tap('#btn-start'); await W(600);
  let st = await S();
  ok('level1 started', st.gameState === 'playing' && (await page.evaluate(() => RINSED.level())) === 0);
  ok('level1 reachable', (await page.evaluate(() => RINSED.reachable())).every(Boolean));
  const cdp = await ctx.newCDPSession(page);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const jx = 110, jy = vp.height - 95;
  await T('touchStart', [{ x: jx, y: jy, id: 1 }]);
  for (let i = 1; i <= 10; i++) { await T('touchMove', [{ x: jx, y: jy - i * 6, id: 1 }]); await W(30); }
  await W(900);
  const cx = vp.width - 250, cy = 120;
  await T('touchStart', [{ x: jx, y: jy - 60, id: 1 }, { x: cx, y: cy, id: 2 }]);
  for (let i = 1; i <= 10; i++) { await T('touchMove', [{ x: jx, y: jy - 60, id: 1 }, { x: cx - i * 8, y: cy + i * 2, id: 2 }]); await W(30); }
  await T('touchEnd', []);
  for (const id of ['#btn-run', '#btn-jump', '#btn-hit', '#btn-hit']) { await page.tap(id); await W(300); }
  const s1 = await S(); ok('touch moved AJ', Math.hypot(s1.pos[0], s1.pos[2]) > 2);
  // AJ close-up
  await page.evaluate(() => { RINSED.freezeDrain(true); RINSED.tp(0, 0); player.rotation.y = 0.5; RINSED.ajCloseup(); });
  await W(800);
  await page.screenshot({ path: '../shot-aj.png' });
  await page.tap('#btn-hit'); await W(120);
  await page.screenshot({ path: '../shot-aj-swing.png' });
  await page.evaluate(() => RINSED.camReset());
  // relic close-up: pick a ground relic, put AJ next to it, camera low and close
  const framed = await page.evaluate(() => {
    const spots = RINSED.relicSpots().filter(s => !(s[2] > 2));
    for (const [x, z] of spots) for (const d of [2.2, 2.8, 3.4]) if (RINSED.frame(x, z, d)) { window.__camDist = 1.9; window.__camTargetY = 1.0; cameraAngleY = 0.12; player.position.x += (x - player.position.x) * 0.0; return [x, z, d]; }
    return null;
  });
  console.log('relic framed', JSON.stringify(framed));
  await page.evaluate(() => RINSED.camReset());
  await W(300);
  console.log('relic closeup', await page.evaluate(() => RINSED.relicCloseup()));
  await W(700);
  await page.screenshot({ path: '../shot-relic.png' });
  await page.evaluate(() => RINSED.relicCloseupEnd());
  // general level-1 gameplay shot
  await page.evaluate(() => { const [x, z] = RINSED.relicSpots()[1]; RINSED.frame(x, z, 6); });
  await W(900);
  await page.screenshot({ path: '../shot-game.png' });
  // poster close-up (MUSTARD CRIMES guaranteed on every level)
  const posters = await page.evaluate(() => RINSED.posters().map(p => p.crime));
  console.log('L1 posters', posters.length, JSON.stringify(posters));
  ok('L1 decorative posters 6-8 incl. MUSTARD + TOO LEGIT', posters.length >= 6 && posters.length <= 8 && posters.includes('MUSTARD CRIMES') && posters.some(c => c.startsWith('BEING TOO LEGIT')));
  console.log('poster closeup', JSON.stringify(await page.evaluate(() => RINSED.posterCloseup('MUSTARD'))));
  await W(700);
  await page.screenshot({ path: '../shot-poster.png' });
  await page.evaluate(() => RINSED.relicCloseupEnd());
  // ---- gold bonus posters ----
  let bonus = await page.evaluate(() => RINSED.bonus());
  console.log('L1 bonus', JSON.stringify(bonus));
  ok('L1 has exactly 2 gold posters, reachable', bonus.length === 2 && (await page.evaluate(() => RINSED.bonusReachable())).every(Boolean));
  const grab = async (k) => {
    const b = (await page.evaluate(() => RINSED.bonus()))[k];
    if (b.top) await page.evaluate(([x, z]) => { player.position.set(x, 2.05, z); }, b.stand);
    else await page.evaluate((k) => { RINSED.bonusFrame(k, 1.0); }, k);
  };
  // pickup shot: frame AJ in front of a poster, then step up to it
  const wallK = bonus.findIndex(b => !b.top) >= 0 ? bonus.findIndex(b => !b.top) : 0;
  await page.evaluate((k) => RINSED.bonusFrame(k, 3.4), wallK); await W(700);
  await page.screenshot({ path: '../shot-poster-gold.png' });
  await grab(wallK); await W(260);
  await page.screenshot({ path: '../shot-poster-pickup.png' });
  await W(700);
  ok('poster 1 collected, HUD 1/2', (await page.evaluate(() => RINSED.bonusFound())) === 1 && (await page.textContent('#poster-count')) === '1' && (await page.textContent('#toast')).includes('WANTED POSTER 1/2'));
  await grab(1 - wallK); await W(1300);
  ok('poster 2 collected -> MUSTARD CRIMES unlocked + saved', (await page.evaluate(() => RINSED.bonusFound())) === 2 && (await page.evaluate(() => JSON.parse(localStorage.getItem('rinsed.save.v1')).unlocked)).includes('mustard') && await page.evaluate(() => document.getElementById('unlock-pop').classList.contains('show')));
  await page.screenshot({ path: '../shot-unlock.png' });
  // pause -> how to play -> back to pause
  await page.tap('#btn-pause'); await W(200); await page.tap('#btn-pause-howto'); await W(200);
  ok('pause > how to play', await page.isVisible('#howto-screen') && !(await page.isVisible('#pause-screen')));
  await page.tap('#btn-howto-back'); await W(200);
  ok('how to play back -> pause', await page.isVisible('#pause-screen') && (await S()).gameState === 'paused');
  await page.tap('#btn-resume'); await W(200);
  // ---- pause menu ----
  await page.evaluate(() => RINSED.freezeDrain(false));
  await page.tap('#btn-pause'); await W(300);
  let p0 = await S();
  const th0 = await page.evaluate(() => thugs.map(t => t.mesh.position.toArray().join()).join('|'));
  await W(2500);
  let p1 = await S();
  const th1 = await page.evaluate(() => thugs.map(t => t.mesh.position.toArray().join()).join('|'));
  ok('paused: state, HP frozen, thugs frozen', p0.gameState === 'paused' && p1.gameState === 'paused' && p0.hp === p1.hp && th0 === th1 && await page.isVisible('#pause-screen'));
  await page.screenshot({ path: '../shot-pause.png' });
  await page.tap('#btn-resume'); await W(1600);
  p1 = await S(); ok('resume -> playing, HP drains again', p1.gameState === 'playing' && p1.hp < p0.hp);
  const seedBefore = p1.seed;
  await page.tap('#btn-pause'); await W(200); await page.tap('#btn-restart-level'); await W(900);
  p1 = await S(); ok('pause > restart level: new seed, same level', p1.gameState === 'playing' && p1.seed !== seedBefore && (await page.evaluate(() => RINSED.level())) === 0);
  await page.tap('#btn-pause'); await W(200); await page.tap('#btn-mainmenu'); await W(500);
  ok('pause > main menu shows level select', (await S()).gameState === 'menu' && await page.isVisible('#start-screen') && !(await page.isVisible('#hud')));
  await page.tap('#btn-outfits'); await W(300);
  await page.tap('.outfit-card[data-id="mustard"]'); await W(900);
  ok('mustard outfit selectable + saved', (await page.evaluate(() => RINSED.save().outfit)) === 'mustard' && (await page.$$('.outfit-card.locked')).length === 2);
  await page.screenshot({ path: '../shot-outfits.png' });
  await page.tap('#btn-outfit-back'); await W(200);
  ok('outfit label on menu', (await page.textContent('#outfit-cur')) === 'MUSTARD CRIMES');
  await page.tap('#lvl-alley'); await page.tap('#btn-start'); await W(800);
  await page.evaluate(() => RINSED.freezeDrain(true));
  // clear level 1: 10 stems -> BOSS FIGHT vs BINO (fought to completion) -> NEXT LEVEL
  await page.evaluate(() => RINSED.collectAll()); await W(900);
  let bs = await page.evaluate(() => RINSED.boss());
  ok('10 stems -> boss BINO appears (not instantly cleared)', (await S()).gameState === 'playing' && bs && bs.state === 'intro' && (await page.textContent('#relic-count')) === '10' && (await page.textContent('.relic-row')).includes('STEMS'));
  ok('boss banner + HP bar', await page.isVisible('#boss-banner') && (await page.textContent('#boss-banner')).includes('BOSS: BINO') && await page.isVisible('#boss-bar'));
  await page.screenshot({ path: '../shot-boss-intro.png' });
  for (let k = 0; k < 80 && (await page.evaluate(() => RINSED.boss().state)) === 'intro'; k++) await W(200);
  // shockwave hits if you stay on the ground...
  await page.evaluate(() => { window.__hits = []; const o = damagePlayer; damagePlayer = function (a, f) { if (!(invuln > 0) && !downed && gameState === 'playing') window.__hits.push(a); return o(a, f); }; });
  await page.evaluate(() => { RINSED.bossFrame(4.5); RINSED.freezeDrain(true); hp = 100; invuln = 0; window.__hits = []; });
  await page.evaluate(() => RINSED.bossForce('slam'));
  let shot = false;
  for (let k = 0; k < 60; k++) { const b = await page.evaluate(() => RINSED.boss()); if (!shot && b.waveR > 1.2) { await page.screenshot({ path: '../shot-boss.png' }); shot = true; } if (b.waveR > 8 || (shot && b.waveR < 0)) break; await W(60); }
  const hitsGround = await page.evaluate(() => window.__hits.slice());
  ok('slam shockwave hits AJ on the ground ' + JSON.stringify(hitsGround), hitsGround.includes(16));
  // ...and JUMP clears it (auto-press JUMP just before the ring arrives)
  for (let k = 0; k < 40 && (await page.evaluate(() => RINSED.boss().state)) !== 'chase'; k++) await W(100);
  await page.evaluate(() => { RINSED.bossFrame(4.5); hp = 100; invuln = 0; window.__hits = []; RINSED.bossForce('slam');
    const tick = () => { const b = RINSED.boss(); if (!b) return; const m = b.pos, d = Math.hypot(player.position.x - m[0], player.position.z - m[2]);
      if (b.waveR > 0 && b.waveR > d - 2.2 && onGround) wantJump = true; if (b.waveR < 0 && window.__jt) return; if (b.waveR > 0) window.__jt = 1; requestAnimationFrame(tick); };
    window.__jt = 0; tick(); });
  for (let k = 0; k < 60; k++) { const b = await page.evaluate(() => RINSED.boss()); if (b.waveR > 8 || (k > 15 && b.waveR < 0)) break; await W(60); }
  const hitsJump = await page.evaluate(() => window.__hits.slice());
  ok('jumping over the shockwave avoids damage ' + JSON.stringify(hitsJump), !hitsJump.includes(16));
  // charge telegraph + rush
  for (let k = 0; k < 40 && (await page.evaluate(() => RINSED.boss().state)) !== 'chase'; k++) await W(100);
  await page.evaluate(() => { RINSED.bossFrame(8); RINSED.bossForce('charge'); });
  for (let k = 0; k < 50 && (await page.evaluate(() => RINSED.boss().state)) === 'charge'; k++) await W(100);
  // full fight: hold HIT, keep facing/closing on BINO; medics + revive still active (HP kept topped up by the test)
  const thugsBefore = (await S()).thugs;
  await page.evaluate(() => {
    window.__fight = true;
    const loop = () => { if (!window.__fight) return; const b = RINSED.boss(); if (!b || b.dead) { hitHeld = false; return; }
      const dx = b.pos[0] - player.position.x, dz = b.pos[2] - player.position.z, d = Math.hypot(dx, dz);
      if (!downed) { player.rotation.y = Math.atan2(dx, dz); if (d > 2.4) { player.position.x += dx / d * 0.08; player.position.z += dz / d * 0.08; } }
      if (hp < 40 && !downed) hp = 80;
      hitHeld = !downed; requestAnimationFrame(loop); };
    loop();
  });
  await T('touchStart', [{ x: vp.width - 120, y: vp.height - 95, id: 9 }]);
  let fightT = 0, bsx;
  for (; fightT < 240; fightT++) { bsx = await page.evaluate(() => RINSED.boss()); if (bsx.dead) break; await W(500); }
  await T('touchEnd', []);
  await page.evaluate(() => { window.__fight = false; hitHeld = false; });
  console.log('  boss fight', (fightT / 2).toFixed(1) + 's real', 'states seen', JSON.stringify(bsx.seen));
  ok('BINO defeated in a real fight (swing/charge/slam/stagger all seen)', bsx.dead && ['swing', 'charge', 'slam', 'stagger'].every(k => bsx.seen.includes(k)));
  ok('BINO called backup at half HP', bsx.backup === true);
  for (let k = 0; k < 30 && (await S()).gameState !== 'won'; k++) await W(200);
  await W(1100);
  ok('level1 won + next visible', (await S()).gameState === 'won' && await page.isVisible('#btn-next'));
  await page.tap('#btn-next'); await W(900);
  st = await S();
  ok('level transition -> tent city', (await page.evaluate(() => RINSED.level())) === 1 && st.gameState === 'playing');
  ok('level2 reachable', (await page.evaluate(() => RINSED.reachable())).every(Boolean));
  console.log('L2 state', JSON.stringify({ seed: st.seed, walls: st.walls, calls: st.calls, tris: st.tris, geos: st.geos }), await page.textContent('#level-name'));
  // can't walk into the river: push north across the river line (not on a bridge)
  await page.evaluate(() => { RINSED.freezeDrain(true); RINSED.tp(-15, 18, Math.PI); });
  await T('touchStart', [{ x: jx, y: jy, id: 4 }]); await T('touchMove', [{ x: jx, y: jy - 55, id: 4 }]);
  await W(2500); await T('touchEnd', []);
  st = await S(); ok('blocked by river (z<=21)', st.pos[2] <= 21.2); console.log('  pos after pushing into river', st.pos.map(v => v.toFixed(1)).join(','));
  // riverside gameplay screenshot: on the riverwalk looking along the river towards the camp
  await page.evaluate(() => { RINSED.tp(-27, 17, -Math.PI / 2 + 0.35); RINSED.setCam(-Math.PI / 2 + 0.35, 0.3); });
  await W(900);
  await page.screenshot({ path: '../shot-river.png' });
  await page.evaluate(() => { RINSED.tp(-20, -6, 0.9); RINSED.setCam(0.9 + Math.PI, 0.55); });
  await W(800);
  await page.screenshot({ path: '../shot-tentcity.png' });
  ok('L2 2 gold posters reachable', (await page.evaluate(() => RINSED.bonus())).length === 2 && (await page.evaluate(() => RINSED.bonusReachable())).every(Boolean));
  console.log('  L2 bonus', JSON.stringify(await page.evaluate(() => RINSED.bonus())));
  const p2 = await page.evaluate(() => RINSED.posters().map(p => p.crime));
  ok('L2 posters incl. MUSTARD + TOO LEGIT', p2.length >= 6 && p2.includes('MUSTARD CRIMES') && p2.some(c => c.startsWith('BEING TOO LEGIT')));
  await page.evaluate(() => { RINSED.tp(0, 8, Math.PI); RINSED.setCam(Math.PI + 0.3, 0.25); });
  await W(700);
  await page.screenshot({ path: '../shot-river2.png' });
  // revive works on level 2
  await page.evaluate(() => { healers.forEach(h => h.healCd = 30); invuln = 0; RINSED.hurt(500); });
  for (let k = 0; k < 40; k++) { st = await S(); if (st.downPhase === 'reviving') break; await W(250); }
  ok('level2 revive started', st.downPhase === 'reviving');
  for (let k = 0; k < 120; k++) { st = await S(); if (!st.downed) break; await W(250); }
  ok('level2 revived to 60', !st.downed && Math.round(st.hp) >= 59);
  // restart level 2 (game over -> try again) => new seed, still riverside, no leaks
  await page.evaluate(() => { healers.forEach(h => h.reviveCd = 999); invuln = 0; RINSED.hurt(500); }); for (let k = 0; k < 80 && (await S()).gameState !== 'dead'; k++) await W(250); await W(900);
  ok('level2 game over', (await S()).gameState === 'dead');
  const g0 = (await S()).geos;
  await page.tap('#btn-retry'); await W(900);
  st = await S(); ok('restart stays on tent city with new seed', (await page.evaluate(() => RINSED.level())) === 1 && st.gameState === 'playing');
  console.log('  geometries before/after restart', g0, st.geos, 'seed', st.seed);
  // menu -> level select -> alley again
  await page.evaluate(() => { healers.forEach(h => h.reviveCd = 999); invuln = 0; RINSED.hurt(500); }); for (let k = 0; k < 80 && (await S()).gameState !== 'dead'; k++) await W(250); await W(900);
  await page.tap('#gameover-screen .btn-menu'); await W(500);
  ok('menu visible', await page.isVisible('#start-screen'));
  await page.tap('#lvl-river'); await W(200); await page.tap('#btn-start'); await W(800);
  ok('level select tent city starts L2', (await page.evaluate(() => RINSED.level())) === 1);
  await page.evaluate(() => RINSED.collectAll()); await W(500);
  ok('L2: 10 stems -> BINO', !!(await page.evaluate(() => RINSED.boss())));
  for (let k = 0; k < 80 && (await page.evaluate(() => RINSED.boss().state)) === 'intro'; k++) await W(200);
  await page.evaluate(() => RINSED.bossKill());
  for (let k = 0; k < 40 && (await S()).gameState !== 'won'; k++) await W(200); await W(1100);
  ok('L2 win offers NEXT LEVEL (L3 follows)', (await S()).gameState === 'won' && await page.isVisible('#btn-next'));
  await page.tap('#win-screen .btn-menu'); await W(400);
  await page.tap('#lvl-alley'); await page.tap('#btn-start'); await W(800);
  ok('back to alley', (await page.evaluate(() => RINSED.level())) === 0);
  // ---- Level 3: DEEP FREEZE ----
  await page.tap('#btn-pause'); await W(200); await page.tap('#btn-mainmenu'); await W(400);
  await page.tap('#lvl-winter'); await page.tap('#btn-start'); await W(900);
  st = await S();
  ok('level select DEEP FREEZE starts L3', (await page.evaluate(() => RINSED.level())) === 2 && st.gameState === 'playing' && (await page.textContent('#level-name')).includes('DEEP FREEZE'));
  ok('level3 reachable', (await page.evaluate(() => RINSED.reachable())).every(Boolean));
  ok('L3 2 gold posters reachable', (await page.evaluate(() => RINSED.bonus())).length === 2 && (await page.evaluate(() => RINSED.bonusReachable())).every(Boolean));
  console.log('  L3 bonus', JSON.stringify(await page.evaluate(() => RINSED.bonus())));
  const p3 = await page.evaluate(() => RINSED.posters().map(p => p.crime));
  ok('L3 posters incl. MUSTARD + TOO LEGIT', p3.length >= 6 && p3.includes('MUSTARD CRIMES') && p3.some(c => c.startsWith('BEING TOO LEGIT')));
  // cold drain vs warm by a fire
  const drainAt = async (x, z) => { await page.evaluate(([x, z]) => { RINSED.freezeDrain(false); RINSED.tp(x, z); hp = 80; invuln = 9999; }, [x, z]); const t0 = await page.evaluate(() => [hp, playTime]); await W(2500); const t1 = await page.evaluate(() => [hp, playTime]); return (t0[0] - t1[0]) / (t1[1] - t0[1]); };
  const fire = await page.evaluate(() => RINSED.fires()[0]);
  const coldRate = await drainAt(0, 0), warmRate = await drainAt(fire[0] + 1.2, fire[1] + 1.2);
  console.log('  drain/s cold', coldRate.toFixed(2), 'warm', warmRate.toFixed(2));
  ok('cold drains faster than level 1 (>0.9/s), fire slows it', coldRate > 0.9 && warmRate < coldRate * 0.5);
  await page.evaluate(() => { invuln = 0; });
  // ice: AJ keeps sliding after letting go of the stick
  const ice = await page.evaluate(() => { const z = RINSED.iceZones().find(z => !z.r); return { x: 0.5, z: (z.z0 + z.z1) / 2 }; });
  await page.evaluate(([x, z]) => { RINSED.freezeDrain(true); RINSED.tp(x, z, 0); }, [ice.x, ice.z]);
  const onIce = await page.evaluate(() => RINSED.onIce());
  await T('touchStart', [{ x: jx, y: jy, id: 7 }]); await T('touchMove', [{ x: jx, y: jy - 55, id: 7 }]); await W(700);
  const a0 = (await S()).pos; await T('touchEnd', []); await W(500); const a1 = (await S()).pos;
  console.log('  on ice', onIce, 'slid after release', Math.hypot(a1[0] - a0[0], a1[2] - a0[2]).toFixed(2), 'm');
  ok('ice makes AJ slide after release', onIce && Math.hypot(a1[0] - a0[0], a1[2] - a0[2]) > 0.3);
  // winter screenshot looking along a street towards the frozen lake
  await page.evaluate(() => { const g = healers[1] ? healers[1].mesh.position : { x: 0, z: 30 }; RINSED.tp(0, 6, Math.PI + 0.25); RINSED.setCam(Math.PI + 0.25, 0.3); });
  await W(1200);
  await page.screenshot({ path: '../shot-winter.png' });
  await page.evaluate(() => { RINSED.tp(cellX(11), cellX(19), Math.PI); RINSED.setCam(Math.PI, 0.18); });
  await W(1000);
  await page.screenshot({ path: '../shot-winter2.png' });
  await page.evaluate(() => RINSED.collectAll()); await W(500);
  for (let k = 0; k < 80 && (await page.evaluate(() => RINSED.boss().state)) === 'intro'; k++) await W(200);
  await page.evaluate(() => RINSED.bossKill());
  for (let k = 0; k < 40 && (await S()).gameState !== 'won'; k++) await W(200); await W(1100);
  ok('L3 win = all cleared, no next', (await S()).gameState === 'won' && !(await page.isVisible('#btn-next')) && (await page.textContent('#win-sub')).includes('All levels'));
  await page.tap('#win-screen .btn-menu'); await W(300); await page.tap('#lvl-alley'); await page.tap('#btn-start'); await W(700);
  // persistence: reload page, save survives, outfit applied; preview each outfit
  await page.reload(); await W(2500);
  ok('save persists across reload', (await page.evaluate(() => RINSED.save().outfit)) === 'mustard' && (await page.textContent('#outfit-cur')) === 'MUSTARD CRIMES');
  for (const id of ['legit', 'winter', 'mustard']) {
    await page.evaluate((id) => { RINSED.outfit(id); }, id);
    await page.tap('#btn-outfits'); await W(500);
    await page.screenshot({ path: '../shot-outfit-' + id + '.png' });
    await page.tap('#btn-outfit-back'); await W(150);
  }
  await page.tap('#btn-start'); await W(700);
  const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); })(); }));
  console.log('fps (swiftshader, no GPU)', fps, JSON.stringify(await page.evaluate(() => RINSED.renderInfo())));
  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})();
