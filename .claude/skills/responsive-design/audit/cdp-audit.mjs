// Emula dispositivos sobre la auditoría servida por Karma y guarda medidas y capturas.
// Uso: node cdp-audit.mjs <carpeta-salida> [m375,t768,...]
//
// Requiere: Karma sirviendo en :9876 (karma-serve.cjs) y un Chrome con
// --remote-debugging-port=9333 y un --user-data-dir temporal.
//
// Por qué no ChromeHeadless con --window-size: headless no baja de 500 px de
// ancho y --force-device-scale-factor no cambia el viewport CSS. Solo
// Emulation.setDeviceMetricsOverride da un móvil real de 375 px.
//
// Por qué la altura es grande y NO se usa captureBeyondViewport: esa opción
// redimensiona la página durante la captura y descoloca el layout con sidebar
// fijo (el contenido sale debajo del menú). Un viewport alto evita el problema.
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? '.';
const DEVICES = [
  { name: 'm375', width: 375, height: 2600, mobile: true },
  { name: 't768', width: 768, height: 2400, mobile: true },
  { name: 't1024', width: 1024, height: 1400, mobile: true },
  { name: 'd1366', width: 1366, height: 1400, mobile: false },
  { name: 'd1920', width: 1920, height: 1400, mobile: false },
];
const only = process.argv[3]?.split(',');

mkdirSync(join(OUT, 'shots'), { recursive: true });
const log = join(OUT, 'audit-log.txt');
writeFileSync(log, '');

const version = await (await fetch('http://127.0.0.1:9333/json/version')).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve));

let nextId = 0;
const pending = new Map();
const listeners = [];
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method) {
    listeners.forEach((listener) => listener(msg));
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);

for (const device of DEVICES.filter((d) => !only || only.includes(d.name))) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: device.width, height: device.height, deviceScaleFactor: 1, mobile: device.mobile,
  }, sessionId);
  await send('Emulation.setTouchEmulationEnabled', { enabled: device.mobile }, sessionId);

  const done = new Promise((resolve) => {
    const handler = async (msg) => {
      if (msg.method !== 'Runtime.consoleAPICalled' || msg.sessionId !== sessionId) return;
      const text = msg.params.args.map((arg) => arg.value ?? '').join(' ');
      if (text.startsWith('RESP|')) appendFileSync(log, `${device.name}|${text}\n`);
      if (text.startsWith('SHOT|')) {
        const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
        writeFileSync(join(OUT, 'shots', `${device.name}-${text.slice(5)}.png`), Buffer.from(shot.data, 'base64'));
      }
      if (text.startsWith('DONE|')) {
        listeners.splice(listeners.indexOf(handler), 1);
        resolve();
      }
    };
    listeners.push(handler);
  });

  await send('Page.navigate', { url: 'http://localhost:9876/debug.html' }, sessionId);
  await Promise.race([done, new Promise((resolve) => setTimeout(resolve, 300000))]);
  console.log(`listo ${device.name}`);
}

ws.close();
process.exit(0);
