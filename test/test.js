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
  await page.goto('http://localhost:8765/index.html?seed=' + (process.env.SEED || '424242'));
  await W(2500);
  const vp = page.viewportSize(); console.log('viewport', vp);
  await page.screenshot({ path: '../shot-start.png' });
  await page.tap('#btn-start'); await W(600);
  console.log('after start', JSON.stringify(await S()));
  console.log('reachable', JSON.stringify(await page.evaluate(() => RINSED.reachable())));
  const cdp = await ctx.newCDPSession(page);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const jx = 110, jy = vp.height - 95;
  await T('touchStart', [{ x: jx, y: jy, id: 1 }]);
  for (let i = 1; i <= 10; i++) { await T('touchMove', [{ x: jx, y: jy - i * 6, id: 1 }]); await W(30); }
  await W(1000);
  const cx = vp.width - 250, cy = 120;
  await T('touchStart', [{ x: jx, y: jy - 60, id: 1 }, { x: cx, y: cy, id: 2 }]);
  for (let i = 1; i <= 10; i++) { await T('touchMove', [{ x: jx, y: jy - 60, id: 1 }, { x: cx - i * 8, y: cy + i * 2, id: 2 }]); await W(30); }
  await T('touchEnd', []);
  await W(200);
  for (const id of ['#btn-run', '#btn-jump', '#btn-hit', '#btn-hit']) { await page.tap(id); await W(300); }
  await T('touchStart', [{ x: jx, y: jy, id: 3 }]); await T('touchMove', [{ x: jx + 20, y: jy - 55, id: 3 }]);
  await W(1200); await T('touchEnd', []);
  const s1 = await S(); console.log('after touch input', JSON.stringify({ pos: s1.pos, hp: s1.hp, stamina: s1.stamina, calls: s1.calls, tris: s1.tris }));
  await page.evaluate(() => RINSED.freezeDrain(true));
  // alley gameplay shot: stand at a relic spot looking down the alley
  console.log('frame relic', await page.evaluate(() => { const r = RINSED.relicSpots()[2]; const ok = RINSED.frame(r[0], r[1], 5) || RINSED.frame(r[0], r[1], 3.5) || RINSED.frame(r[0], r[1], 2.5); RINSED.setCam(cameraAngleX + 0.35, 0.22); return ok; }));
  await W(700);
  await page.screenshot({ path: '../shot-game.png' });
  // near a girl -> bubble
  console.log('frame girl', await page.evaluate(() => { const g = RINSED.girlSpots()[0]; const ok = RINSED.frame(g[0], g[1], 3.4); RINSED.setCam(cameraAngleX + 0.5, 0.2); return ok; }));
  await W(1200);
  await page.screenshot({ path: '../shot-girl.png' });
  console.log('bubble text', await page.evaluate(() => [...document.querySelectorAll('.bubble')].map(b => b.innerText + ' | op=' + b.style.opacity)));
  // go down -> RINSED flash -> revive
  await page.evaluate(() => { const g = RINSED.girlSpots()[0]; RINSED.frame(g[0], g[1], 9); healers.forEach(h => h.healCd = 30); });
  await W(300);
  await page.evaluate(() => RINSED.hurt(500));
  await W(350);
  await page.screenshot({ path: '../shot-rinsed.png' });
  let st;
  for (let k = 0; k < 40; k++) { st = await S(); if (st.downPhase === 'reviving') break; await W(250); }
  console.log('revive phase', st.downPhase, JSON.stringify(st.girls));
  await page.evaluate(() => RINSED.clearYaw());
  await W(900);
  await page.screenshot({ path: '../shot-revive.png' });
  await W(2500);
  st = await S(); console.log('after revive', JSON.stringify({ hp: st.hp, downed: st.downed, gs: st.gameState }));
  // no medics left -> game over
  await page.evaluate(() => healers.forEach(h => h.reviveCd = 999));
  await W(2200);
  await page.evaluate(() => { invuln = 0; RINSED.hurt(500); });
  await W(2600);
  st = await S(); console.log('gameover?', st.gameState, await page.isVisible('#gameover-screen'), await page.textContent('#gameover-screen .title-logo'));
  await page.screenshot({ path: '../shot-gameover.png' });
  // restarts: new seed each time, no geometry growth
  const geos = [];
  for (let k = 0; k < 3; k++) {
    await page.tap(k === 0 ? '#btn-retry' : '#btn-retry'); await W(700);
    st = await S(); geos.push([st.seed, st.geos, st.sceneObjs, st.walls, st.thugs, st.girls.length, st.hp]);
    await page.evaluate(() => { RINSED.freezeDrain(false); invuln = 0; healers.forEach(h => h.reviveCd = 999); RINSED.hurt(500); });
    await W(2400);
  }
  console.log('restarts [seed, geometries, sceneChildren, walls, thugs, girls, hp]', JSON.stringify(geos));
  await page.tap('#btn-retry'); await W(600);
  console.log('reachable2', JSON.stringify(await page.evaluate(() => RINSED.reachable())));
  await page.evaluate(() => RINSED.collectAll()); await W(1500);
  st = await S(); console.log('won?', st.gameState, await page.isVisible('#win-screen'));
  await page.tap('#btn-restart'); await W(600);
  st = await S(); console.log('after restart', st.gameState, st.seed, st.relicCount, st.hp);
  const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); })(); }));
  console.log('fps (swiftshader, no GPU)', fps, 'drawcalls', (await S()).calls);
  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})();
