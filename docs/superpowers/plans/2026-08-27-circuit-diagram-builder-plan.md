# 마이크로비트 회로도 제작 도구 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single self-contained HTML tool (teacher-facing) that lets a teacher drag micro:bit sensor/actuator part images onto a sensor:bit-style expansion board image, wire them to exact pin locations, view a live pin-connection summary, export the result as a PNG, and share a read-only link with students — ready to publish as a Claude Artifact.

**Architecture:** DOM-absolute-positioned component `<img>` elements dragged over a fixed board image, with an SVG overlay for wires that snap to precomputed connector coordinates. Pure state/encoding logic lives in a framework-free module (`src/logic.js`) that is unit tested with Node's built-in test runner. A tiny build script concatenates CSS/JS into one `dist/circuit-builder.html` file with no external dependencies (required for the Artifact CSP, which blocks CDN scripts).

**Tech Stack:** Vanilla HTML/CSS/JS (no frameworks, no npm packages), Python 3 + Pillow for one-time image cropping and base64 asset embedding, Node.js built-in `node:test` for unit tests, the project's own `mcp__Claude_Browser__*` tools for interactive/manual verification.

---

## Source material (already in repo root)

- `image1.png` (2242×1332) — the annotated wiring screenshot every part photo is cropped from.
- `breakeboard.jpeg` (1200×896) — the expansion board pin-map image used as the fixed board background.

## File Structure

```
microbit/
  image1.png                       (existing source)
  breakeboard.jpeg                 (existing source)
  scripts/
    crop_parts.py                  (Task 1)
    generate_assets_js.py          (Task 2)
  assets/
    parts/*.png                    (Task 1 output, 10 files)
  src/
    logic.js                       (Task 3 — pure state/encode logic)
    logic.test.js                  (Task 3 — node:test unit tests)
    assets-data.js                 (Task 2 output — generated, but committed)
    styles.css                     (Task 4)
    app.js                         (Tasks 5–12 — DOM/UI logic)
  build/
    template.html                  (Task 4)
    build.js                       (Task 4)
  dist/
    circuit-builder.html           (generated final artifact file)
  docs/superpowers/specs/2026-08-27-circuit-diagram-builder-design.md   (existing spec)
  docs/superpowers/plans/2026-08-27-circuit-diagram-builder-plan.md     (this file)
```

Every task that touches `src/app.js` after Task 5 either appends new top-level functions or replaces the small `init()` function wholesale (its full new body is always shown, never a diff).

---

### Task 1: Crop part images from the wiring screenshot

**Files:**
- Create: `scripts/crop_parts.py`
- Create (via script): `assets/parts/oled.png`, `assets/parts/water-pump.png`, `assets/parts/light-sensor.png`, `assets/parts/servo-motor.png`, `assets/parts/noise-sensor.png`, `assets/parts/neopixel.png`, `assets/parts/relay-switch.png`, `assets/parts/click-switch.png`, `assets/parts/water-sensor.png`, `assets/parts/fan.png`

- [ ] **Step 1: Write the crop script**

```python
# scripts/crop_parts.py
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'image1.png')
OUT_DIR = os.path.join(ROOT, 'assets', 'parts')

# Boxes are (left, top, right, bottom) pixel coordinates in image1.png
# (2242x1332), calibrated by visual inspection.
BOXES = {
    'oled.png': (90, 190, 460, 540),
    'water-pump.png': (1240, 175, 1500, 510),
    'light-sensor.png': (40, 720, 460, 910),
    'servo-motor.png': (390, 815, 720, 1000),
    'noise-sensor.png': (390, 1030, 700, 1200),
    'neopixel.png': (400, 1225, 700, 1332),
    'relay-switch.png': (1420, 700, 1880, 865),
    'click-switch.png': (1230, 810, 1560, 1020),
    'water-sensor.png': (1070, 980, 1470, 1170),
    'fan.png': (980, 1180, 1360, 1332),
}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    im = Image.open(SOURCE)
    for filename, box in BOXES.items():
        cropped = im.crop(box)
        cropped.save(os.path.join(OUT_DIR, filename))
        print(filename, cropped.size)


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run the script**

Run: `python3 scripts/crop_parts.py`

Expected output (10 lines, exact sizes):
```
oled.png (370, 350)
water-pump.png (260, 335)
light-sensor.png (420, 190)
servo-motor.png (330, 185)
noise-sensor.png (310, 170)
neopixel.png (300, 107)
relay-switch.png (460, 165)
click-switch.png (330, 210)
water-sensor.png (400, 190)
fan.png (380, 152)
```

- [ ] **Step 3: Verify file count**

Run: `ls assets/parts | wc -l`
Expected: `10`

- [ ] **Step 4: Commit**

```bash
git add scripts/crop_parts.py assets/parts
git commit -m "Add script to crop part images from wiring screenshot"
```

---

### Task 2: Generate embedded asset data (board pins + part metadata + base64 images)

**Files:**
- Create: `scripts/generate_assets_js.py`
- Create (via script): `src/assets-data.js`

- [ ] **Step 1: Write the generator script**

```python
# scripts/generate_assets_js.py
import base64
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARTS_DIR = os.path.join(ROOT, 'assets', 'parts')
BOARD_PATH = os.path.join(ROOT, 'breakeboard.jpeg')
OUT_PATH = os.path.join(ROOT, 'src', 'assets-data.js')


def data_uri(path, mime):
    with open(path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('ascii')
    return f'data:{mime};base64,{b64}'


PARTS = [
    {'id': 'oled', 'name': 'OLED 모니터', 'file': 'oled.png',
     'connectors': [{'id': 'main', 'x': 0.42, 'y': 0.13}]},
    {'id': 'water-pump', 'name': '워터펌프', 'file': 'water-pump.png',
     'connectors': [{'id': 'main', 'x': 0.83, 'y': 0.88}]},
    {'id': 'light-sensor', 'name': '빛 센서', 'file': 'light-sensor.png',
     'connectors': [{'id': 'main', 'x': 0.86, 'y': 0.5}]},
    {'id': 'servo-motor', 'name': '서보 모터', 'file': 'servo-motor.png',
     'connectors': [{'id': 'main', 'x': 0.9, 'y': 0.6}]},
    {'id': 'noise-sensor', 'name': '노이즈 센서', 'file': 'noise-sensor.png',
     'connectors': [{'id': 'main', 'x': 0.82, 'y': 0.47}]},
    {'id': 'neopixel', 'name': '네오픽셀 (야간조명)', 'file': 'neopixel.png',
     'connectors': [{'id': 'main', 'x': 0.82, 'y': 0.5}]},
    {'id': 'relay-switch', 'name': '릴레이 스위치', 'file': 'relay-switch.png',
     'connectors': [
         {'id': 'control', 'x': 0.13, 'y': 0.48},
         {'id': 'load', 'x': 0.87, 'y': 0.42},
     ]},
    {'id': 'click-switch', 'name': '딸깍 스위치', 'file': 'click-switch.png',
     'connectors': [{'id': 'main', 'x': 0.15, 'y': 0.45}]},
    {'id': 'water-sensor', 'name': '물 센서', 'file': 'water-sensor.png',
     'connectors': [{'id': 'main', 'x': 0.14, 'y': 0.5}]},
    {'id': 'fan', 'name': '선풍기 팬', 'file': 'fan.png',
     'connectors': [{'id': 'main', 'x': 0.14, 'y': 0.49}]},
]

# x, y are fractions (0..1) of BOARD_WIDTH/BOARD_HEIGHT, calibrated against
# a grid overlay of breakeboard.jpeg (1200x896).
BOARD_PINS = [
    {'id': '0', 'label': '0번 핀', 'x': 0.3325, 'y': 0.1942},
    {'id': '1', 'label': '1번 핀', 'x': 0.3325, 'y': 0.2344},
    {'id': '2', 'label': '2번 핀', 'x': 0.3325, 'y': 0.2746},
    {'id': '3', 'label': '3번 핀', 'x': 0.3325, 'y': 0.3147},
    {'id': '4', 'label': '4번 핀', 'x': 0.3325, 'y': 0.3549},
    {'id': '5', 'label': '5번 핀', 'x': 0.3325, 'y': 0.3951},
    {'id': '6', 'label': '6번 핀', 'x': 0.3325, 'y': 0.4353},
    {'id': '7', 'label': '7번 핀', 'x': 0.3325, 'y': 0.4754},
    {'id': '10', 'label': '10번 핀', 'x': 0.3325, 'y': 0.5000},
    {'id': '8', 'label': '8번 핀', 'x': 0.3325, 'y': 0.5513},
    {'id': '9', 'label': '9번 핀', 'x': 0.3325, 'y': 0.5893},
    {'id': '11', 'label': '11번 핀', 'x': 0.3325, 'y': 0.6295},
    {'id': '12', 'label': '12번 핀', 'x': 0.3325, 'y': 0.6696},
    {'id': '13', 'label': '13번 핀', 'x': 0.3325, 'y': 0.7076},
    {'id': '14', 'label': '14번 핀', 'x': 0.3325, 'y': 0.7478},
    {'id': '15', 'label': '15번 핀', 'x': 0.3325, 'y': 0.7857},
    {'id': '16', 'label': '16번 핀', 'x': 0.3325, 'y': 0.8237},
]


def main():
    parts_out = []
    for part in PARTS:
        path = os.path.join(PARTS_DIR, part['file'])
        with Image.open(path) as im:
            width, height = im.size
        parts_out.append({
            'id': part['id'],
            'name': part['name'],
            'image': data_uri(path, 'image/png'),
            'width': width,
            'height': height,
            'connectors': part['connectors'],
        })

    with Image.open(BOARD_PATH) as im:
        board_width, board_height = im.size

    data = {
        'BOARD_IMAGE': data_uri(BOARD_PATH, 'image/jpeg'),
        'BOARD_WIDTH': board_width,
        'BOARD_HEIGHT': board_height,
        'BOARD_PINS': BOARD_PINS,
        'PARTS': parts_out,
    }

    js = 'const ASSET_DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n'
    js += 'if (typeof module !== "undefined") { module.exports = ASSET_DATA; }\n'

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        f.write(js)
    print('wrote', OUT_PATH, 'parts=', len(parts_out))


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run the script**

Run: `python3 scripts/generate_assets_js.py`
Expected: `wrote .../src/assets-data.js parts= 10`

- [ ] **Step 3: Sanity-check the generated data**

Run:
```bash
node -e "
const A = require('./src/assets-data.js');
console.assert(A.PARTS.length === 10, 'expected 10 parts');
console.assert(A.BOARD_PINS.length === 17, 'expected 17 board pins');
console.assert(A.PARTS.find(p => p.id === 'relay-switch').connectors.length === 2, 'relay needs 2 connectors');
console.log('OK', A.PARTS.length, A.BOARD_PINS.length);
"
```
Expected: `OK 10 17` with no assertion errors printed above it.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate_assets_js.py src/assets-data.js
git commit -m "Generate embedded board/part asset data with pin coordinates"
```

---

### Task 3: Pure diagram logic module with unit tests

**Files:**
- Create: `src/logic.js`
- Test: `src/logic.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// src/logic.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const CircuitLogic = require('./logic.js');

test('createEmptyDiagram returns empty components and wires', () => {
  const diagram = CircuitLogic.createEmptyDiagram();
  assert.deepEqual(diagram, { components: [], wires: [] });
});

test('addComponent appends a new component with a generated id', () => {
  const diagram = CircuitLogic.createEmptyDiagram();
  const next = CircuitLogic.addComponent(diagram, 'light-sensor', 10, 20);
  assert.equal(next.components.length, 1);
  assert.equal(next.components[0].partId, 'light-sensor');
  assert.equal(next.components[0].x, 10);
  assert.equal(next.components[0].y, 20);
  assert.match(next.components[0].id, /^comp-/);
});

test('moveComponent updates only the matching component position', () => {
  let diagram = CircuitLogic.createEmptyDiagram();
  diagram = CircuitLogic.addComponent(diagram, 'servo-motor', 0, 0);
  const id = diagram.components[0].id;
  const moved = CircuitLogic.moveComponent(diagram, id, 99, 88);
  assert.equal(moved.components[0].x, 99);
  assert.equal(moved.components[0].y, 88);
});

test('removeComponent removes the component and any wires touching it', () => {
  let diagram = CircuitLogic.createEmptyDiagram();
  diagram = CircuitLogic.addComponent(diagram, 'light-sensor', 0, 0);
  const componentId = diagram.components[0].id;
  diagram = CircuitLogic.addWire(
    diagram,
    { kind: 'board', pinId: '1' },
    { kind: 'component', componentId, connectorId: 'main' },
    '#e8b923'
  );
  const cleared = CircuitLogic.removeComponent(diagram, componentId);
  assert.equal(cleared.components.length, 0);
  assert.equal(cleared.wires.length, 0);
});

test('addWire and removeWire manage the wire list', () => {
  let diagram = CircuitLogic.createEmptyDiagram();
  diagram = CircuitLogic.addWire(
    diagram,
    { kind: 'board', pinId: '1' },
    { kind: 'board', pinId: '2' },
    '#ff0000'
  );
  assert.equal(diagram.wires.length, 1);
  const wireId = diagram.wires[0].id;
  const cleared = CircuitLogic.removeWire(diagram, wireId);
  assert.equal(cleared.wires.length, 0);
});

test('encodeDiagram/decodeDiagram round-trips including Korean text', () => {
  let diagram = CircuitLogic.createEmptyDiagram();
  diagram = CircuitLogic.addComponent(diagram, '네오픽셀', 5, 5);
  const encoded = CircuitLogic.encodeDiagram(diagram);
  assert.equal(/[+/=]/.test(encoded), false);
  const decoded = CircuitLogic.decodeDiagram(encoded);
  assert.deepEqual(decoded, diagram);
});

test('buildPinSummary lists connected pins in board pin order', () => {
  const assetData = {
    BOARD_PINS: [
      { id: '1', label: '1번 핀' },
      { id: '2', label: '2번 핀' },
    ],
    PARTS: [{ id: 'light-sensor', name: '빛 센서' }],
  };
  let diagram = CircuitLogic.createEmptyDiagram();
  diagram = CircuitLogic.addComponent(diagram, 'light-sensor', 0, 0);
  const componentId = diagram.components[0].id;
  diagram = CircuitLogic.addWire(
    diagram,
    { kind: 'component', componentId, connectorId: 'main' },
    { kind: 'board', pinId: '2' },
    '#e8b923'
  );
  diagram = CircuitLogic.addWire(
    diagram,
    { kind: 'board', pinId: '1' },
    { kind: 'component', componentId, connectorId: 'main' },
    '#e8b923'
  );
  const summary = CircuitLogic.buildPinSummary(diagram, assetData);
  assert.deepEqual(summary.map((r) => r.pinId), ['1', '2']);
  assert.equal(summary[0].partName, '빛 센서');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test src/logic.test.js`
Expected: FAIL — `Cannot find module './logic.js'`

- [ ] **Step 3: Write the implementation**

```javascript
// src/logic.js
(function (root) {
  let _idCounter = 0;
  function generateId(prefix) {
    _idCounter += 1;
    return `${prefix}-${_idCounter}`;
  }

  function createEmptyDiagram() {
    return { components: [], wires: [] };
  }

  function addComponent(diagram, partId, x, y) {
    const component = { id: generateId('comp'), partId, x, y };
    return {
      components: [...diagram.components, component],
      wires: diagram.wires,
    };
  }

  function moveComponent(diagram, componentId, x, y) {
    return {
      components: diagram.components.map((c) =>
        c.id === componentId ? { ...c, x, y } : c
      ),
      wires: diagram.wires,
    };
  }

  function removeComponent(diagram, componentId) {
    return {
      components: diagram.components.filter((c) => c.id !== componentId),
      wires: diagram.wires.filter(
        (w) =>
          !(w.from.kind === 'component' && w.from.componentId === componentId) &&
          !(w.to.kind === 'component' && w.to.componentId === componentId)
      ),
    };
  }

  function addWire(diagram, from, to, color) {
    const wire = { id: generateId('wire'), from, to, color };
    return {
      components: diagram.components,
      wires: [...diagram.wires, wire],
    };
  }

  function removeWire(diagram, wireId) {
    return {
      components: diagram.components,
      wires: diagram.wires.filter((w) => w.id !== wireId),
    };
  }

  function utf8ToBase64(str) {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64');
    }
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  function base64ToUtf8(base64) {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('utf-8');
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function encodeDiagram(diagram) {
    const base64 = utf8ToBase64(JSON.stringify(diagram));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeDiagram(encoded) {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    return JSON.parse(base64ToUtf8(base64));
  }

  function findPart(assetData, partId) {
    return assetData.PARTS.find((p) => p.id === partId);
  }

  function buildPinSummary(diagram, assetData) {
    const rows = [];
    diagram.wires.forEach((wire) => {
      [wire.from, wire.to].forEach((end, idx) => {
        if (end.kind !== 'board') return;
        const other = idx === 0 ? wire.to : wire.from;
        if (other.kind !== 'component') return;
        const component = diagram.components.find((c) => c.id === other.componentId);
        if (!component) return;
        const part = findPart(assetData, component.partId);
        const pin = assetData.BOARD_PINS.find((p) => p.id === end.pinId);
        rows.push({
          pinId: end.pinId,
          pinLabel: pin ? pin.label : end.pinId,
          partName: part ? part.name : component.partId,
        });
      });
    });
    const order = assetData.BOARD_PINS.map((p) => p.id);
    rows.sort((a, b) => order.indexOf(a.pinId) - order.indexOf(b.pinId));
    return rows;
  }

  const CircuitLogic = {
    generateId,
    createEmptyDiagram,
    addComponent,
    moveComponent,
    removeComponent,
    addWire,
    removeWire,
    encodeDiagram,
    decodeDiagram,
    buildPinSummary,
  };

  if (typeof module !== 'undefined') {
    module.exports = CircuitLogic;
  } else {
    root.CircuitLogic = CircuitLogic;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

Note: the whole module is wrapped in an IIFE so that in the browser build (where this file's contents get concatenated straight into a `<script>` tag alongside `app.js`), internal helpers like `findPart` stay private and cannot collide with same-named functions defined later in `app.js`. Only `CircuitLogic` is exposed globally.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test src/logic.test.js`
Expected: `# pass 7` and `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add src/logic.js src/logic.test.js
git commit -m "Add pure diagram state/encoding logic with unit tests"
```

---

### Task 4: HTML shell, styles, and build script

**Files:**
- Create: `build/template.html`
- Create: `src/styles.css`
- Create: `build/build.js`

- [ ] **Step 1: Write the HTML shell template**

```html
<!-- build/template.html -->
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>마이크로비트 회로도 제작 도구</title>
<style>/*__STYLES__*/</style>
</head>
<body>
<div id="app">
  <aside id="palette"></aside>
  <main id="board-area">
    <div id="board-wrap">
      <img id="board-image" alt="확장보드" />
      <svg id="wire-layer"></svg>
      <div id="components-layer"></div>
    </div>
  </main>
  <aside id="side-panel">
    <div id="toolbar">
      <button id="btn-export">이미지로 내보내기</button>
      <button id="btn-share">학생 공유 링크 생성</button>
      <button id="btn-add-part">부품 추가</button>
    </div>
    <table id="summary-table">
      <thead><tr><th>핀</th><th>부품</th></tr></thead>
      <tbody></tbody>
    </table>
    <div id="export-output"></div>
    <div id="share-output"></div>
  </aside>
</div>
<div id="add-part-modal" hidden></div>
<script>/*__ASSETS_JS__*/</script>
<script>/*__LOGIC_JS__*/</script>
<script>/*__APP_JS__*/</script>
</body>
</html>
```

- [ ] **Step 2: Write the stylesheet**

```css
/* src/styles.css */
:root {
  --bg: #f5f6f8;
  --panel-bg: #ffffff;
  --border: #d9dce1;
  --text: #1f2430;
  --accent: #2f6fed;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  background: var(--bg);
  color: var(--text);
}
#app {
  display: grid;
  grid-template-columns: 200px 1fr 260px;
  gap: 12px;
  padding: 12px;
  height: 100vh;
}
#palette {
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  overflow-y: auto;
}
.palette-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  font-size: 12px;
}
.palette-item:hover { background: #eef2ff; }
.palette-item img { width: 64px; height: 64px; object-fit: contain; }
#board-area {
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: auto;
  position: relative;
}
#board-wrap { position: relative; }
#board-image { display: block; width: 100%; height: auto; }
#wire-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
#components-layer { position: absolute; inset: 0; }
.placed-component { position: absolute; cursor: grab; user-select: none; }
.placed-component img { display: block; pointer-events: none; }
.placed-component.selected { outline: 2px solid var(--accent); }
.connector-dot {
  position: absolute;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  margin-top: -6px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
  cursor: crosshair;
}
.connector-dot.connecting { outline: 2px solid var(--accent); }
#side-panel {
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}
#toolbar { display: flex; flex-direction: column; gap: 6px; }
#toolbar button {
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}
#toolbar button:hover { background: #eef2ff; }
#summary-table { width: 100%; border-collapse: collapse; font-size: 13px; }
#summary-table th, #summary-table td {
  border: 1px solid var(--border);
  padding: 4px 6px;
  text-align: left;
}
#export-output img { max-width: 100%; }
#share-output input { width: 100%; padding: 6px; }
body[data-view-only] #palette,
body[data-view-only] #toolbar #btn-add-part,
body[data-view-only] #toolbar #btn-share {
  display: none;
}
#add-part-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
#add-part-modal .modal-box {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
#add-part-preview-wrap { position: relative; }
#add-part-preview-wrap img { max-width: 100%; }
```

- [ ] **Step 3: Write the build script**

```javascript
// build/build.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'build/template.html'), 'utf-8');
const styles = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf-8');
const assetsJs = fs.readFileSync(path.join(root, 'src/assets-data.js'), 'utf-8');
const logicJs = fs.readFileSync(path.join(root, 'src/logic.js'), 'utf-8');
const appJs = fs.readFileSync(path.join(root, 'src/app.js'), 'utf-8');

const output = template
  .replace('/*__STYLES__*/', styles)
  .replace('/*__ASSETS_JS__*/', assetsJs)
  .replace('/*__LOGIC_JS__*/', logicJs)
  .replace('/*__APP_JS__*/', appJs);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/circuit-builder.html'), output);
console.log('Built dist/circuit-builder.html (' + output.length + ' bytes)');
```

- [ ] **Step 4: Create a minimal `src/app.js` stub so the build can run**

```javascript
// src/app.js
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('board-image').src = ASSET_DATA.BOARD_IMAGE;
});
```

- [ ] **Step 5: Run the build**

Run: `node build/build.js`
Expected: `Built dist/circuit-builder.html (NNNN bytes)` (a large number, since images are embedded as base64)

- [ ] **Step 6: Verify no unresolved placeholders remain**

Run: `grep -c "__STYLES__\|__ASSETS_JS__\|__LOGIC_JS__\|__APP_JS__" dist/circuit-builder.html || true`
Expected: `0`

- [ ] **Step 7: Commit**

```bash
git add build/template.html build/build.js src/styles.css src/app.js dist/circuit-builder.html
git commit -m "Add build pipeline that assembles the single-file artifact HTML"
```

---

### Task 5: Render the part palette and the board with pin markers

**Files:**
- Modify: `src/app.js` (replace the stub from Task 4 entirely)

- [ ] **Step 1: Replace `src/app.js` with the palette/board rendering logic**

```javascript
// src/app.js
(function () {
  let diagram = CircuitLogic.createEmptyDiagram();
  let customParts = [];
  let viewOnly = false;

  const DRAFT_KEY = 'microbit-circuit-draft';
  const CUSTOM_PARTS_KEY = 'microbit-circuit-custom-parts';

  function allParts() {
    return ASSET_DATA.PARTS.concat(customParts);
  }

  function findPart(partId) {
    return allParts().find((p) => p.id === partId);
  }

  function partDisplaySize(part) {
    const width = 110;
    const height = Math.round((part.height / part.width) * width);
    return { width, height };
  }

  function renderPalette() {
    const palette = document.getElementById('palette');
    palette.innerHTML = '';
    allParts().forEach((part) => {
      const item = document.createElement('div');
      item.className = 'palette-item';
      const img = document.createElement('img');
      img.src = part.image;
      const label = document.createElement('span');
      label.textContent = part.name;
      item.appendChild(img);
      item.appendChild(label);
      palette.appendChild(item);
    });
  }

  function renderBoardPins() {
    const wrap = document.getElementById('board-wrap');
    const layer = document.createElement('div');
    layer.id = 'board-pins-layer';
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    ASSET_DATA.BOARD_PINS.forEach((pin) => {
      const dot = document.createElement('div');
      dot.className = 'connector-dot';
      dot.style.left = pin.x * ASSET_DATA.BOARD_WIDTH + 'px';
      dot.style.top = pin.y * ASSET_DATA.BOARD_HEIGHT + 'px';
      dot.style.background = '#e8b923';
      dot.title = pin.label;
      dot.dataset.kind = 'board';
      dot.dataset.pinId = pin.id;
      layer.appendChild(dot);
    });
    wrap.appendChild(layer);
  }

  function renderComponents() {
    const layer = document.getElementById('components-layer');
    layer.innerHTML = '';
  }

  function renderWires() {
    const svg = document.getElementById('wire-layer');
    svg.setAttribute('viewBox', `0 0 ${ASSET_DATA.BOARD_WIDTH} ${ASSET_DATA.BOARD_HEIGHT}`);
    svg.innerHTML = '';
  }

  function renderSummary() {
    const tbody = document.querySelector('#summary-table tbody');
    tbody.innerHTML = '';
  }

  function renderAll() {
    renderPalette();
    renderComponents();
    renderWires();
    renderSummary();
  }

  function init() {
    document.getElementById('board-image').src = ASSET_DATA.BOARD_IMAGE;
    document.getElementById('board-wrap').style.width = ASSET_DATA.BOARD_WIDTH + 'px';
    renderBoardPins();
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
```

- [ ] **Step 2: Rebuild**

Run: `node build/build.js`
Expected: `Built dist/circuit-builder.html (...)`

- [ ] **Step 3: Verify in the browser**

Use `mcp__Claude_Browser__navigate` to open `file:///Users/kangchanghwan/Documents/진산중학교/microbit/dist/circuit-builder.html`, then `mcp__Claude_Browser__read_page` (filter `all`) or a screenshot.

Expected: the left palette lists 10 items with Korean names (OLED 모니터, 워터펌프, 빛 센서, 서보 모터, 노이즈 센서, 네오픽셀 (야간조명), 릴레이 스위치, 딸깍 스위치, 물 센서, 선풍기 팬); the board image renders with 17 small yellow dots overlaid at the pin positions, roughly aligned with the printed pin numbers on the board image.

- [ ] **Step 4: Commit**

```bash
git add src/app.js dist/circuit-builder.html
git commit -m "Render part palette and board pin markers"
```

---

### Task 6: Place components on the board and drag them

**Files:**
- Modify: `src/app.js`

- [ ] **Step 1: Add placement, dragging, and draft persistence**

Replace the `renderPalette` function body's item creation to make items clickable, replace `renderComponents` to actually draw placed parts, and add new functions. Apply these changes to `src/app.js`:

```javascript
  // Replace the palette item creation inside renderPalette() by adding,
  // right after `item.appendChild(label);` and before
  // `palette.appendChild(item);`:
      item.addEventListener('click', () => addComponentToCanvas(part.id));
```

```javascript
  // Replace the whole renderComponents() function with:
  let dragState = null;

  function addComponentToCanvas(partId) {
    const offset = diagram.components.length * 20;
    diagram = CircuitLogic.addComponent(diagram, partId, 300 + offset, 60 + offset);
    persistDraft();
    renderAll();
  }

  function startDrag(e, componentId) {
    e.stopPropagation();
    const comp = diagram.components.find((c) => c.id === componentId);
    const wrapRect = document.getElementById('board-wrap').getBoundingClientRect();
    const scale = ASSET_DATA.BOARD_WIDTH / wrapRect.width;
    dragState = {
      componentId,
      offsetX: (e.clientX - wrapRect.left) * scale - comp.x,
      offsetY: (e.clientY - wrapRect.top) * scale - comp.y,
    };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  }

  function onDragMove(e) {
    if (!dragState) return;
    const wrapRect = document.getElementById('board-wrap').getBoundingClientRect();
    const scale = ASSET_DATA.BOARD_WIDTH / wrapRect.width;
    const x = (e.clientX - wrapRect.left) * scale - dragState.offsetX;
    const y = (e.clientY - wrapRect.top) * scale - dragState.offsetY;
    diagram = CircuitLogic.moveComponent(diagram, dragState.componentId, Math.round(x), Math.round(y));
    renderComponents();
    renderWires();
  }

  function onDragEnd() {
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    dragState = null;
    persistDraft();
  }

  function renderComponents() {
    const layer = document.getElementById('components-layer');
    layer.innerHTML = '';
    diagram.components.forEach((comp) => {
      const part = findPart(comp.partId);
      if (!part) return;
      const size = partDisplaySize(part);
      const el = document.createElement('div');
      el.className = 'placed-component';
      el.style.left = comp.x + 'px';
      el.style.top = comp.y + 'px';
      el.dataset.componentId = comp.id;

      const img = document.createElement('img');
      img.src = part.image;
      img.style.width = size.width + 'px';
      img.style.height = size.height + 'px';
      img.draggable = false;
      el.appendChild(img);

      if (!viewOnly) {
        el.addEventListener('pointerdown', (e) => startDrag(e, comp.id));
      }

      layer.appendChild(el);
    });
  }

  function persistDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(diagram));
    } catch (e) {
      /* storage unavailable; ignore */
    }
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) diagram = JSON.parse(raw);
    } catch (e) {
      /* ignore corrupt draft */
    }
  }
```

Replace the whole `init()` function with:

```javascript
  function init() {
    restoreDraft();
    document.getElementById('board-image').src = ASSET_DATA.BOARD_IMAGE;
    document.getElementById('board-wrap').style.width = ASSET_DATA.BOARD_WIDTH + 'px';
    renderBoardPins();
    renderAll();
  }
```

- [ ] **Step 2: Rebuild**

Run: `node build/build.js`

- [ ] **Step 3: Verify in the browser**

Use the Browser tools: navigate to the `dist/circuit-builder.html` file, click a palette item (e.g. 빛 센서), confirm an image appears on the board via `read_page` or a screenshot, then drag it with `computer` (`left_click_drag`) and confirm its position changed. Reload the page (`navigate` to the same URL again) and confirm the component is still there in the same place (draft persistence).

- [ ] **Step 4: Commit**

```bash
git add src/app.js dist/circuit-builder.html
git commit -m "Add drag-and-drop component placement with draft autosave"
```

---

### Task 7: Wire drawing between connectors

**Files:**
- Modify: `src/app.js`

- [ ] **Step 1: Add connector dots, click-to-connect wiring, and SVG rendering**

In `renderBoardPins()`, add a click handler to each board pin dot (insert right before `layer.appendChild(dot);`):

```javascript
      if (!viewOnly) {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          onConnectorClick({ kind: 'board', pinId: pin.id });
        });
      }
```

In `renderComponents()`, add connector dots for each placed part's connectors. Insert this right before `layer.appendChild(el);`:

```javascript
      part.connectors.forEach((conn) => {
        const dot = document.createElement('div');
        dot.className = 'connector-dot';
        dot.style.left = conn.x * size.width + 'px';
        dot.style.top = conn.y * size.height + 'px';
        dot.style.background = '#333';
        dot.dataset.kind = 'component';
        dot.dataset.componentId = comp.id;
        dot.dataset.connectorId = conn.id;
        if (!viewOnly) {
          dot.addEventListener('click', (e) => {
            e.stopPropagation();
            onConnectorClick({ kind: 'component', componentId: comp.id, connectorId: conn.id });
          });
        }
        el.appendChild(dot);
      });
```

Add these new functions (place them near `onDragEnd`):

```javascript
  let connecting = null;

  function sameConnector(a, b) {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'board') return a.pinId === b.pinId;
    return a.componentId === b.componentId && a.connectorId === b.connectorId;
  }

  function markConnecting(ref, on) {
    const selector = ref.kind === 'board'
      ? `.connector-dot[data-kind="board"][data-pin-id="${ref.pinId}"]`
      : `.connector-dot[data-kind="component"][data-component-id="${ref.componentId}"][data-connector-id="${ref.connectorId}"]`;
    const el = document.querySelector(selector);
    if (el) el.classList.toggle('connecting', on);
  }

  function onConnectorClick(ref) {
    if (!connecting) {
      connecting = ref;
      markConnecting(ref, true);
      return;
    }
    if (sameConnector(connecting, ref)) {
      markConnecting(connecting, false);
      connecting = null;
      return;
    }
    diagram = CircuitLogic.addWire(diagram, connecting, ref, '#e8b923');
    markConnecting(connecting, false);
    connecting = null;
    persistDraft();
    renderAll();
  }

  function connectorPosition(ref) {
    if (ref.kind === 'board') {
      const pin = ASSET_DATA.BOARD_PINS.find((p) => p.id === ref.pinId);
      return { x: pin.x * ASSET_DATA.BOARD_WIDTH, y: pin.y * ASSET_DATA.BOARD_HEIGHT };
    }
    const comp = diagram.components.find((c) => c.id === ref.componentId);
    if (!comp) return { x: 0, y: 0 };
    const part = findPart(comp.partId);
    const conn = part.connectors.find((c) => c.id === ref.connectorId);
    const size = partDisplaySize(part);
    return { x: comp.x + conn.x * size.width, y: comp.y + conn.y * size.height };
  }
```

Replace the whole `renderWires()` function with:

```javascript
  function renderWires() {
    const svg = document.getElementById('wire-layer');
    svg.setAttribute('viewBox', `0 0 ${ASSET_DATA.BOARD_WIDTH} ${ASSET_DATA.BOARD_HEIGHT}`);
    svg.innerHTML = '';
    diagram.wires.forEach((wire) => {
      const p1 = connectorPosition(wire.from);
      const p2 = connectorPosition(wire.to);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', p1.x);
      line.setAttribute('y1', p1.y);
      line.setAttribute('x2', p2.x);
      line.setAttribute('y2', p2.y);
      line.setAttribute('stroke', wire.color);
      line.setAttribute('stroke-width', '3');
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
    });
  }
```

Add an Escape-to-cancel listener at the bottom of the IIFE, just before `document.addEventListener('DOMContentLoaded', init);`:

```javascript
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && connecting) {
      markConnecting(connecting, false);
      connecting = null;
    }
  });
```

- [ ] **Step 2: Rebuild**

Run: `node build/build.js`

- [ ] **Step 3: Verify in the browser**

Place two components (e.g. 빛 센서 and 서보 모터). Click the 1번 핀 board dot, then click the 빛 센서's connector dot — confirm a yellow line is drawn connecting them (via screenshot or by checking `svg line` count with `read_page`/`javascript_tool` inspection). Click the same board pin twice in a row and confirm it cancels instead of self-connecting. Reload and confirm the wire persists.

- [ ] **Step 4: Commit**

```bash
git add src/app.js dist/circuit-builder.html
git commit -m "Add click-to-connect wire drawing between connectors"
```

---

### Task 8: Select and delete components/wires

**Files:**
- Modify: `src/app.js`

- [ ] **Step 1: Add selection state and delete-key handling**

Add a `selected` variable near the top of the IIFE, next to `let connecting = null;`:

```javascript
  let selected = null; // { type: 'component' | 'wire', id }
```

In `renderComponents()`, update the class assignment line and add a click handler. Replace:

```javascript
      el.className = 'placed-component';
```

with:

```javascript
      el.className = 'placed-component' + (selected && selected.type === 'component' && selected.id === comp.id ? ' selected' : '');
```

and, right after the `if (!viewOnly) { el.addEventListener('pointerdown', ...) }` block, add:

```javascript
      if (!viewOnly) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          selected = { type: 'component', id: comp.id };
          renderComponents();
        });
      }
```

In `renderWires()`, replace the line-building block to add selection highlighting and click-to-select. Replace:

```javascript
      line.setAttribute('stroke-width', '3');
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
```

with:

```javascript
      const isSelected = selected && selected.type === 'wire' && selected.id === wire.id;
      line.setAttribute('stroke-width', isSelected ? '5' : '3');
      line.setAttribute('stroke-linecap', 'round');
      if (!viewOnly) {
        line.style.pointerEvents = 'stroke';
        line.style.cursor = 'pointer';
        line.addEventListener('click', (e) => {
          e.stopPropagation();
          selected = { type: 'wire', id: wire.id };
          renderAll();
        });
      }
      svg.appendChild(line);
```

Add a board-area click handler (clicking empty space clears selection) and a delete-key handler. Add both just before `document.addEventListener('DOMContentLoaded', init);`:

```javascript
  document.getElementById('board-area').addEventListener('click', () => {
    selected = null;
    renderAll();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (!selected) return;
    if (selected.type === 'component') {
      diagram = CircuitLogic.removeComponent(diagram, selected.id);
    } else {
      diagram = CircuitLogic.removeWire(diagram, selected.id);
    }
    selected = null;
    persistDraft();
    renderAll();
  });
```

- [ ] **Step 2: Rebuild**

Run: `node build/build.js`

- [ ] **Step 3: Verify in the browser**

Click a placed component to select it (confirm the blue outline via screenshot), press Backspace, confirm it disappears along with any wires attached to it. Repeat for a wire (click it, press Delete, confirm it's gone). Click empty board space and confirm nothing stays selected.

- [ ] **Step 4: Commit**

```bash
git add src/app.js dist/circuit-builder.html
git commit -m "Add selection and delete for components and wires"
```

---

### Task 9: Live pin-connection summary table

**Files:**
- Modify: `src/app.js`

- [ ] **Step 1: Implement `renderSummary`**

Replace the whole `renderSummary()` function with:

```javascript
  function renderSummary() {
    const tbody = document.querySelector('#summary-table tbody');
    tbody.innerHTML = '';
    const rows = CircuitLogic.buildPinSummary(diagram, { BOARD_PINS: ASSET_DATA.BOARD_PINS, PARTS: allParts() });
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      const tdPin = document.createElement('td');
      tdPin.textContent = row.pinLabel;
      const tdPart = document.createElement('td');
      tdPart.textContent = row.partName;
      tr.appendChild(tdPin);
      tr.appendChild(tdPart);
      tbody.appendChild(tr);
    });
  }
```

- [ ] **Step 2: Rebuild**

Run: `node build/build.js`

- [ ] **Step 3: Verify in the browser**

Connect 1번 핀 to 빛 센서. Use `get_page_text` or `read_page` to confirm the summary table now shows a row "1번 핀 / 빛 센서". Delete the wire and confirm the row disappears.

- [ ] **Step 4: Commit**

```bash
git add src/app.js dist/circuit-builder.html
git commit -m "Add live pin connection summary table"
```

---

### Task 10: Image export

**Files:**
- Modify: `src/app.js`

- [ ] **Step 1: Add export rendering to an offscreen canvas**

Add these functions near the end of the IIFE, before the `document.addEventListener('keydown', ...)` block added in Task 8:

```javascript
  function drawWiresAndComponents(ctx, done) {
    diagram.wires.forEach((wire) => {
      const p1 = connectorPosition(wire.from);
      const p2 = connectorPosition(wire.to);
      ctx.strokeStyle = wire.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    const images = diagram.components.map((comp) => {
      const part = findPart(comp.partId);
      const size = partDisplaySize(part);
      const img = new Image();
      img.src = part.image;
      return { img, comp, size };
    });

    let remaining = images.length;
    if (remaining === 0) {
      done();
      return;
    }
    images.forEach(({ img, comp, size }) => {
      img.onload = () => {
        ctx.drawImage(img, comp.x, comp.y, size.width, size.height);
        remaining -= 1;
        if (remaining === 0) done();
      };
    });
  }

  function drawSummaryTable(ctx, rows, x, y, rowHeight) {
    ctx.fillStyle = '#1f2430';
    ctx.font = '16px sans-serif';
    ctx.fillText('핀 연결 요약', x, y + rowHeight * 0.7);
    rows.forEach((row, i) => {
      ctx.fillText(`${row.pinLabel} — ${row.partName}`, x, y + rowHeight * (i + 1.7));
    });
  }

  function showExportPreview(dataUrl) {
    const out = document.getElementById('export-output');
    out.innerHTML = '';
    const info = document.createElement('p');
    info.textContent = '아래 이미지를 우클릭 → "이미지를 다른 이름으로 저장"을 선택하세요.';
    const img = document.createElement('img');
    img.src = dataUrl;
    out.appendChild(info);
    out.appendChild(img);
  }

  function exportImage() {
    const pad = 16;
    const rowHeight = 22;
    const summaryRows = CircuitLogic.buildPinSummary(diagram, { BOARD_PINS: ASSET_DATA.BOARD_PINS, PARTS: allParts() });
    const canvas = document.createElement('canvas');
    canvas.width = ASSET_DATA.BOARD_WIDTH;
    canvas.height = ASSET_DATA.BOARD_HEIGHT + pad * 2 + rowHeight * (summaryRows.length + 1);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const boardImg = new Image();
    boardImg.onload = () => {
      ctx.drawImage(boardImg, 0, 0, ASSET_DATA.BOARD_WIDTH, ASSET_DATA.BOARD_HEIGHT);
      drawWiresAndComponents(ctx, () => {
        drawSummaryTable(ctx, summaryRows, pad, ASSET_DATA.BOARD_HEIGHT + pad, rowHeight);
        showExportPreview(canvas.toDataURL('image/png'));
      });
    };
    boardImg.src = ASSET_DATA.BOARD_IMAGE;
  }
```

Wire up the toolbar button. Replace the whole `init()` function with:

```javascript
  function init() {
    restoreDraft();
    document.getElementById('board-image').src = ASSET_DATA.BOARD_IMAGE;
    document.getElementById('board-wrap').style.width = ASSET_DATA.BOARD_WIDTH + 'px';
    renderBoardPins();
    renderAll();
    document.getElementById('btn-export').addEventListener('click', exportImage);
  }
```

- [ ] **Step 2: Rebuild**

Run: `node build/build.js`

- [ ] **Step 3: Verify in the browser**

Place a couple of components and wire them, click "이미지로 내보내기", and confirm an `<img>` appears under the button showing the board, the placed parts, the wires, and the summary text below the board. Use `read_network_requests` is not needed; instead use `read_page` to confirm `#export-output img` exists, and `javascript_tool` (inspection only) to confirm its `src` starts with `data:image/png;base64,` and has length > 1000.

- [ ] **Step 4: Commit**

```bash
git add src/app.js dist/circuit-builder.html
git commit -m "Add PNG export of the composed circuit diagram"
```

---

### Task 11: Student share link and view-only mode

**Files:**
- Modify: `src/app.js`

- [ ] **Step 1: Add share link generation and view-only bootstrap**

Add these functions near `exportImage`:

```javascript
  function generateShareLink() {
    const encoded = CircuitLogic.encodeDiagram(diagram);
    const base = window.location.href.split('#')[0];
    const link = `${base}#view=${encoded}`;
    const out = document.getElementById('share-output');
    out.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'text';
    input.readOnly = true;
    input.value = link;
    input.addEventListener('click', () => input.select());
    out.appendChild(input);
  }

  function parseViewHash() {
    const match = window.location.hash.match(/^#view=([A-Za-z0-9_-]+)$/);
    if (!match) return null;
    try {
      return CircuitLogic.decodeDiagram(match[1]);
    } catch (e) {
      return null;
    }
  }
```

Replace the whole `init()` function with:

```javascript
  function init() {
    restoreCustomParts();
    const viewData = parseViewHash();
    if (viewData) {
      viewOnly = true;
      diagram = viewData;
      document.body.setAttribute('data-view-only', 'true');
    } else {
      restoreDraft();
    }

    document.getElementById('board-image').src = ASSET_DATA.BOARD_IMAGE;
    document.getElementById('board-wrap').style.width = ASSET_DATA.BOARD_WIDTH + 'px';
    renderBoardPins();
    renderAll();

    document.getElementById('btn-export').addEventListener('click', exportImage);
    if (!viewOnly) {
      document.getElementById('btn-share').addEventListener('click', generateShareLink);
    }
  }
```

Note: `init()` now calls `restoreCustomParts()`, which does not exist yet — it is added in Task 12. Add a temporary no-op stub right above `init()` for now so Task 11 builds cleanly on its own:

```javascript
  function restoreCustomParts() {
    /* implemented in Task 12 */
  }
```

- [ ] **Step 2: Rebuild**

Run: `node build/build.js`

- [ ] **Step 3: Verify in the browser**

Build a small diagram, click "학생 공유 링크 생성", confirm a link appears in a readonly input field ending in `#view=...`. Copy that exact URL and `navigate` to it in the same tab. Confirm: the palette and "부품 추가"/"학생 공유 링크 생성" buttons are hidden, the same components/wires/summary render read-only, and "이미지로 내보내기" still works.

- [ ] **Step 4: Commit**

```bash
git add src/app.js dist/circuit-builder.html
git commit -m "Add student share link and read-only view mode"
```

---

### Task 12: Custom part upload

**Files:**
- Modify: `src/app.js`

- [ ] **Step 1: Replace the Task 11 stub with real persistence, and add the upload modal**

Replace the temporary stub:

```javascript
  function restoreCustomParts() {
    /* implemented in Task 12 */
  }
```

with:

```javascript
  function persistCustomParts() {
    try {
      localStorage.setItem(CUSTOM_PARTS_KEY, JSON.stringify(customParts));
    } catch (e) {
      /* ignore */
    }
  }

  function restoreCustomParts() {
    try {
      const raw = localStorage.getItem(CUSTOM_PARTS_KEY);
      if (raw) customParts = JSON.parse(raw);
    } catch (e) {
      customParts = [];
    }
  }

  let pendingPartImage = null;
  let pendingConnector = null;

  function openAddPartModal() {
    const modal = document.getElementById('add-part-modal');
    modal.hidden = false;
    modal.innerHTML = `
      <div class="modal-box">
        <h3>새 부품 추가</h3>
        <input type="file" id="add-part-file" accept="image/*" />
        <div id="add-part-preview-wrap"></div>
        <p style="font-size:12px;color:#555">이미지를 클릭해서 연결 지점을 지정하세요.</p>
        <input type="text" id="add-part-name" placeholder="부품 이름" />
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button id="add-part-cancel">취소</button>
          <button id="add-part-save">저장</button>
        </div>
      </div>
    `;
    pendingPartImage = null;
    pendingConnector = null;

    document.getElementById('add-part-file').addEventListener('change', handlePartFileChange);
    document.getElementById('add-part-cancel').addEventListener('click', closeAddPartModal);
    document.getElementById('add-part-save').addEventListener('click', saveNewPart);
  }

  function closeAddPartModal() {
    document.getElementById('add-part-modal').hidden = true;
  }

  function handlePartFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        pendingPartImage = { dataUrl: reader.result, width: img.width, height: img.height };
        renderPartPreview();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function renderPartPreview() {
    const wrap = document.getElementById('add-part-preview-wrap');
    wrap.innerHTML = '';
    const img = document.createElement('img');
    img.id = 'add-part-preview';
    img.src = pendingPartImage.dataUrl;
    img.addEventListener('click', (e) => {
      const rect = img.getBoundingClientRect();
      pendingConnector = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
      renderPartPreview();
    });
    wrap.appendChild(img);
    if (pendingConnector) {
      const marker = document.createElement('div');
      marker.style.position = 'absolute';
      marker.style.left = pendingConnector.x * img.clientWidth + 'px';
      marker.style.top = pendingConnector.y * img.clientHeight + 'px';
      marker.style.width = '10px';
      marker.style.height = '10px';
      marker.style.marginLeft = '-5px';
      marker.style.marginTop = '-5px';
      marker.style.borderRadius = '50%';
      marker.style.background = '#2f6fed';
      wrap.appendChild(marker);
    }
  }

  function saveNewPart() {
    const name = document.getElementById('add-part-name').value.trim();
    if (!pendingPartImage || !pendingConnector || !name) {
      window.alert('이미지, 연결 지점, 이름을 모두 입력하세요.');
      return;
    }
    const part = {
      id: CircuitLogic.generateId('custom-part'),
      name,
      image: pendingPartImage.dataUrl,
      width: pendingPartImage.width,
      height: pendingPartImage.height,
      connectors: [{ id: 'main', x: pendingConnector.x, y: pendingConnector.y }],
    };
    customParts.push(part);
    persistCustomParts();
    closeAddPartModal();
    renderAll();
  }
```

Replace the whole `init()` function to wire up the "부품 추가" button:

```javascript
  function init() {
    restoreCustomParts();
    const viewData = parseViewHash();
    if (viewData) {
      viewOnly = true;
      diagram = viewData;
      document.body.setAttribute('data-view-only', 'true');
    } else {
      restoreDraft();
    }

    document.getElementById('board-image').src = ASSET_DATA.BOARD_IMAGE;
    document.getElementById('board-wrap').style.width = ASSET_DATA.BOARD_WIDTH + 'px';
    renderBoardPins();
    renderAll();

    document.getElementById('btn-export').addEventListener('click', exportImage);
    if (!viewOnly) {
      document.getElementById('btn-share').addEventListener('click', generateShareLink);
      document.getElementById('btn-add-part').addEventListener('click', openAddPartModal);
    }
  }
```

- [ ] **Step 2: Rebuild**

Run: `node build/build.js`

- [ ] **Step 3: Verify in the browser**

Click "부품 추가", upload any small PNG (e.g. reuse `assets/parts/fan.png` via the file picker), click a point on the preview to place the connector marker, type a name, click 저장. Confirm the new part now appears at the top of the palette. Reload the page and confirm the custom part is still in the palette (persisted via `localStorage`).

- [ ] **Step 4: Commit**

```bash
git add src/app.js dist/circuit-builder.html
git commit -m "Add custom part upload with connector picking and persistence"
```

---

### Task 13: Full manual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run through the spec's test checklist in the browser**

Using the Browser tools against `dist/circuit-builder.html`, verify, in order (clearing `localStorage` first via `javascript_tool` running `localStorage.clear()` so the run starts clean):

1. Add 3–4 different parts from the palette and drag them to distinct positions.
2. Connect each to a plausible board pin (e.g. 빛 센서→1번 핀, 서보 모터→2번 핀, 노이즈 센서→4번 핀), confirm colored lines are drawn and snap to the exact dot positions.
3. Confirm the summary table lists all three connections in ascending pin order.
4. Select one wire and one component, delete each with Backspace, confirm both the element and the table row disappear.
5. Click "이미지로 내보내기" and confirm the exported PNG visually matches the on-screen layout.
6. Click "학생 공유 링크 생성", open the link in a new tab, confirm read-only rendering (no palette/toolbar edit buttons, same diagram, working export button).
7. Reload the original (non-`#view=`) tab and confirm the in-progress draft was restored.
8. Add a custom part via "부품 추가", reload, confirm it persisted.

- [ ] **Step 2: Fix any issues found**

If any check fails, fix the relevant function in `src/app.js`, rebuild with `node build/build.js`, and re-verify just that check.

- [ ] **Step 3: Commit if any fixes were made**

```bash
git add src/app.js dist/circuit-builder.html
git commit -m "Fix issues found during end-to-end verification"
```

(Skip this commit if step 1 passed with no changes needed.)

---

### Task 14: Publish as a Claude Artifact

**Files:** none (publishing step)

- [ ] **Step 1: Confirm the file is self-contained**

Run: `grep -oE 'https?://[^"'"'"')]+' dist/circuit-builder.html | sort -u`
Expected: no output (no external URLs — everything must be inlined as data URIs per Artifact CSP rules). If any external URL shows up, find and remove/inline it before proceeding.

- [ ] **Step 2: Publish**

Use the `Artifact` tool with `file_path: dist/circuit-builder.html`, a short distinctive `title` (e.g. "마이크로비트 회로도 제작기"), a one-sentence `description`, and a `favicon` (e.g. "🔌").

- [ ] **Step 3: Confirm the published link works**

Open the returned Artifact URL and repeat a short smoke test: add one part, connect one wire, confirm the summary table updates, confirm "이미지로 내보내기" produces an image.

- [ ] **Step 4: Share the link with the user**

Report the Artifact URL back to the user so they can start building real circuit diagrams and share view-only links with students.

---

## Self-Review Notes

- **Spec coverage:** 편집 모드 배치/드래그(Task 6), 전선 연결(Task 7), 삭제(Task 8), 요약표(Task 9), 이미지 내보내기(Task 10), 공유 링크 + 보기 전용(Task 11), 부품 추가(Task 12), localStorage 영속성(Tasks 6 & 12), Artifact 배포(Task 14) — every design-doc section maps to a task.
- **Placeholder scan:** all code blocks are complete and runnable; no TBD/TODO markers remain.
- **Type consistency:** connector references use one consistent shape throughout — `{ kind: 'board', pinId }` or `{ kind: 'component', componentId, connectorId }` — and `CircuitLogic` function names (`addComponent`, `moveComponent`, `removeComponent`, `addWire`, `removeWire`, `encodeDiagram`, `decodeDiagram`, `buildPinSummary`, `generateId`) are identical across `logic.js`, `logic.test.js`, and every `app.js` task.
