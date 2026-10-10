const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(2500);
  const vp = page.viewportSize(); console.log('viewport', vp);
  await page.screenshot({ path: '../shot-start.png' });
  await page.tap('#btn-start');
  await page.waitForTimeout(500);
  const cdp = await ctx.newCDPSession(page);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const s0 = await page.evaluate(() => RINSED.state());
  console.log('after start', JSON.stringify(s0));
  // joystick: touch inside zone, push up (forward)
  const jx = 110, jy = vp.height - 95;
  await T('touchStart', [{ x: jx, y: jy, id: 1 }]);
  for (let i = 1; i <= 10; i++) { await T('touchMove', [{ x: jx, y: jy - i * 6, id: 1 }]); await page.waitForTimeout(30); }
  await page.waitForTimeout(1200);
  // second finger: camera drag on right side while holding joystick
  const cx = vp.width - 250, cy = 120;
  await T('touchStart', [{ x: jx, y: jy - 60, id: 1 }, { x: cx, y: cy, id: 2 }]);
  for (let i = 1; i <= 10; i++) { await T('touchMove', [{ x: jx, y: jy - 60, id: 1 }, { x: cx - i * 8, y: cy + i * 2, id: 2 }]); await page.waitForTimeout(30); }
  await T('touchEnd', [{ x: jx, y: jy - 60, id: 1 }]);
  await page.waitForTimeout(300);
  const s1 = await page.evaluate(() => RINSED.state());
  console.log('after move', JSON.stringify(s1));
  // buttons
  for (const id of ['#btn-run', '#btn-jump', '#btn-hit', '#btn-hit']) { await page.tap(id); await page.waitForTimeout(350); }
  // run forward a bit
  await T('touchStart', [{ x: jx, y: jy, id: 3 }]);
  await T('touchMove', [{ x: jx + 20, y: jy - 55, id: 3 }]);
  await page.waitForTimeout(1500);
  const s2 = await page.evaluate(() => RINSED.state());
  await T('touchEnd', [{ x: jx + 20, y: jy - 55, id: 3 }]);
  console.log('after run', JSON.stringify(s2));
  await page.tap('#btn-hit');
  await page.waitForTimeout(150);
  await page.screenshot({ path: '../shot-game.png' });
  // death + restart
  const childCount = () => page.evaluate(() => document.querySelectorAll('.dmg-num').length);
  await page.evaluate(() => { for (let i = 0; i < 12; i++) setTimeout(() => RINSED.hurt(15), i * 700); });
  await page.waitForTimeout(10000);
  console.log('dead?', JSON.stringify(await page.evaluate(() => RINSED.state())), await page.isVisible('#gameover-screen'));
  await page.screenshot({ path: '../shot-gameover.png' });
  await page.tap('#btn-retry');
  await page.waitForTimeout(500);
  console.log('after retry', JSON.stringify(await page.evaluate(() => RINSED.state())));
  await page.evaluate(() => RINSED.collectAll());
  await page.waitForTimeout(1800);
  console.log('won?', JSON.stringify(await page.evaluate(() => RINSED.state())), await page.isVisible('#win-screen'));
  await page.screenshot({ path: '../shot-win.png' });
  await page.tap('#btn-restart');
  await page.waitForTimeout(500);
  console.log('after restart', JSON.stringify(await page.evaluate(() => RINSED.state())));
  const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); })(); }));
  console.log('fps (swiftshader)', fps);
  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})();
