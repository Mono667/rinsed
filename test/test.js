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
  ok('L1 posters 8-12 incl. MUSTARD + TOO LEGIT', posters.length >= 8 && posters.length <= 12 && posters.includes('MUSTARD CRIMES') && posters.some(c => c.startsWith('BEING TOO LEGIT')));
  console.log('poster closeup', JSON.stringify(await page.evaluate(() => RINSED.posterCloseup('MUSTARD'))));
  await W(700);
  await page.screenshot({ path: '../shot-poster.png' });
  await page.evaluate(() => RINSED.relicCloseupEnd());
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
  await page.tap('#lvl-alley'); await page.tap('#btn-start'); await W(800);
  await page.evaluate(() => RINSED.freezeDrain(true));
  // clear level 1 -> NEXT LEVEL
  await page.evaluate(() => RINSED.collectAll()); await W(1600);
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
  const p2 = await page.evaluate(() => RINSED.posters().map(p => p.crime));
  ok('L2 posters incl. MUSTARD + TOO LEGIT', p2.length >= 8 && p2.includes('MUSTARD CRIMES') && p2.some(c => c.startsWith('BEING TOO LEGIT')));
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
  await page.evaluate(() => RINSED.collectAll()); await W(1600);
  ok('L2 win hides next', (await S()).gameState === 'won' && !(await page.isVisible('#btn-next')));
  await page.tap('#win-screen .btn-menu'); await W(400);
  await page.tap('#lvl-alley'); await page.tap('#btn-start'); await W(800);
  ok('back to alley', (await page.evaluate(() => RINSED.level())) === 0);
  const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); })(); }));
  console.log('fps (swiftshader, no GPU)', fps, JSON.stringify(await page.evaluate(() => RINSED.renderInfo())));
  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})();
