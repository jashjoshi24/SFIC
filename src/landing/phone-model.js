import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const width = 2.17;
const height = 4.48;

function roundedRectangle(w, h, radius) {
  const x = -w / 2;
  const y = -h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + w - radius, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + radius);
  shape.lineTo(x + w, y + h - radius);
  shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  shape.lineTo(x + radius, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function fillRound(ctx, x, y, w, h, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}

function wrap(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? line + ' ' + word : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  return line ? [...lines, line] : lines;
}

export function createPhoneModel() {
  const model = new THREE.Group();
  const frame = new THREE.MeshPhysicalMaterial({
    color: '#b28866', metalness: 0.95, roughness: 0.27, envMapIntensity: 1.3,
  });
  const dark = new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.30, metalness: 0.52 });
  const chassis = new THREE.ExtrudeGeometry(roundedRectangle(width, height, 0.22), {
    depth: 0.16, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 3, curveSegments: 14,
  });
  chassis.translate(0, 0, -0.08);
  model.add(new THREE.Mesh(chassis, frame));

  const cover = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectangle(width - 0.04, height - 0.04, 0.19)), dark);
  cover.position.z = 0.119;
  model.add(cover);

  const image = document.createElement('canvas');
  image.width = 900;
  image.height = 1900;
  const texture = new THREE.CanvasTexture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const actionImage = image.cloneNode();
  const actionTexture = new THREE.CanvasTexture(actionImage);
  actionTexture.colorSpace = texture.colorSpace;
  actionTexture.anisotropy = texture.anisotropy;
  const screen = {
    message: { value: texture },
    guidance: { value: actionTexture },
    reveal: { value: 0 },
    spotlight: { value: 1 },
    selectedLine: { value: new THREE.Vector2() },
    feedback: { value: 1 },
    feedbackColor: { value: new THREE.Color('#a4d7bd') },
  };
  const displayWidth = width - 0.15;
  const displayHeight = height - 0.16;
  const displayGeometry = new THREE.ShapeGeometry(roundedRectangle(displayWidth, displayHeight, 0.19));
  const positions = displayGeometry.getAttribute('position');
  const uv = displayGeometry.getAttribute('uv');
  for (let index = 0; index < positions.count; index++) {
    uv.setXY(index, positions.getX(index) / displayWidth + 0.5, positions.getY(index) / displayHeight + 0.5);
  }
  const display = new THREE.Mesh(displayGeometry, new THREE.ShaderMaterial({
    uniforms: screen,
    vertexShader: `
      varying vec2 screenUv;
      void main() {
        screenUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D message;
      uniform sampler2D guidance;
      uniform float reveal;
      uniform float spotlight;
      uniform vec2 selectedLine;
      uniform float feedback;
      uniform vec3 feedbackColor;
      varying vec2 screenUv;

      void main() {
        float row = 1.0 - screenUv.y;
        float sweep = mix(-0.09, 1.09, reveal);
        float guidanceMask = 1.0 - smoothstep(sweep - 0.027, sweep + 0.027, row);
        vec3 color = mix(texture2D(message, screenUv).rgb, texture2D(guidance, screenUv).rgb, guidanceMask);

        float scanLight = 1.0 - smoothstep(0.002, 0.029, abs(row - sweep));
        color += vec3(0.14, 0.50, 0.32) * scanLight * 0.44;

        float lineMask = smoothstep(selectedLine.x - 0.004, selectedLine.x, row)
          * (1.0 - smoothstep(selectedLine.y, selectedLine.y + 0.004, row));
        float highlightCenter = mix(-0.30, 1.30, spotlight);
        float signalLight = 1.0 - smoothstep(0.025, 0.29, abs(screenUv.x - highlightCenter));
        signalLight *= smoothstep(0.09, 0.11, screenUv.x) * (1.0 - smoothstep(0.89, 0.91, screenUv.x));
        color += vec3(0.66, 0.24, 0.06) * lineMask * signalLight * (1.0 - guidanceMask) * 0.28;

        float distanceFromStatus = length(vec2(screenUv.x - 0.5, (row - 0.162) * 2.11));
        float feedbackRing = 1.0 - smoothstep(0.002, 0.030, abs(distanceFromStatus - mix(0.075, 0.30, feedback)));
        color += feedbackColor * feedbackRing * sin(feedback * 3.14159) * guidanceMask * 0.48;
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  }));
  display.position.z = 0.124;
  model.add(display);

  for (const [x, y, h] of [[-1.115, 0.65, 0.30], [-1.115, 1.07, 0.25], [1.115, 0.84, 0.58]]) {
    const button = new THREE.Mesh(new RoundedBoxGeometry(0.039, h, 0.10, 3, 0.02), frame);
    button.position.set(x, y, 0);
    model.add(button);
  }

  const rear = new THREE.MeshPhysicalMaterial({
    color: '#211914', roughness: 0.53, metalness: 0.3, clearcoat: 0.2,
  });
  const rearPanel = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRectangle(width - 0.07, height - 0.07, 0.19)), rear,
  );
  rearPanel.rotation.y = Math.PI;
  rearPanel.position.z = -0.119;
  model.add(rearPanel);
  const cameraIsland = new THREE.Mesh(new RoundedBoxGeometry(0.77, 0.86, 0.10, 5, 0.09), rear);
  cameraIsland.position.set(-0.59, 1.62, -0.147);
  model.add(cameraIsland);
  const lensGlass = new THREE.MeshPhysicalMaterial({
    color: '#0b1020', metalness: 0.5, roughness: 0.16, clearcoat: 0.9,
  });
  for (const [x, y] of [[-0.72, 1.78], [-0.49, 1.45]]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 32), frame);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, -0.201);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.107, 24, 14), lensGlass);
    lens.scale.z = 0.32;
    lens.position.set(x, y, -0.222);
    model.add(ring, lens);
  }
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.056, 16, 8),
    new THREE.MeshStandardMaterial({ color: '#ceb9a8', roughness: 0.42 }),
  );
  flash.scale.z = 0.32;
  flash.position.set(-0.39, 1.83, -0.2);
  model.add(flash);

  const port = new THREE.Mesh(new RoundedBoxGeometry(0.285, 0.012, 0.070, 3, 0.006), dark);
  port.position.y = -height / 2 - 0.036;
  model.add(port);
  const speakerOpening = new THREE.CircleGeometry(0.017, 12);
  for (const x of [-0.49, -0.40, -0.31, 0.31, 0.40, 0.49]) {
    const opening = new THREE.Mesh(speakerOpening, dark);
    opening.rotation.x = Math.PI / 2;
    opening.position.set(x, -height / 2 - 0.037, 0);
    model.add(opening);
  }

  const messageContext = image.getContext('2d');
  const actionContext = actionImage.getContext('2d');

  function drawScreen(ctx, copy, signal, action, decision) {
    const result = action && copy.decisionResults[decision];
    const accent = decision === 'open' || !action ? '#ffab70' : '#bce1c6';
    const font = (weight, size) => { ctx.font = `${weight} ${size}px "Noto Sans Gujarati", Manrope, sans-serif`; };
    const backdrop = ctx.createLinearGradient(0, 0, 900, 1900);
    backdrop.addColorStop(0, '#211b17');
    backdrop.addColorStop(1, '#101013');
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, 900, 1900);
    fillRound(ctx, 333, 42, 234, 64, 32, '#09090a');
    ctx.fillStyle = '#313b4a';
    ctx.beginPath();
    ctx.arc(536, 74, 9, 0, Math.PI * 2);
    ctx.fill();
    font(600, 29);
    ctx.fillStyle = '#ddcfc2';
    ctx.textAlign = 'center';
    ctx.fillText('SURAKSHIT GUJARAT', 450, 180);
    fillRound(ctx, 391, 250, 118, 118, 36, action && decision !== 'open' ? '#2a3b31' : '#453023');
    font(700, 57);
    ctx.fillStyle = accent;
    ctx.fillText(action && decision !== 'open' ? (result ? '✓' : '?') : '!', 450, 330);
    font(700, 43);
    ctx.fillStyle = '#ffead8';
    ctx.fillText(action ? copy.actFirst : copy.phone.from, 450, 451, 780);

    ctx.textAlign = 'left';
    font(500, 39);
    ctx.fillStyle = '#cbb8a6';
    const caption = action ? (result?.body ?? copy.phone.lines[0]) : copy.phone.title;
    wrap(ctx, caption, 698).forEach((line, index) => ctx.fillText(line, 90, 565 + index * 62));

    if (action) {
      fillRound(ctx, 76, 867, 748, 390, 36, decision === 'open' ? '#3b291e' : '#23322c');
      font(700, 45);
      ctx.fillStyle = '#ffebd8';
      wrap(ctx, result?.title ?? copy.decisionQuestion, 610)
        .forEach((line, index) => ctx.fillText(line, 129, 973 + index * 66));
      fillRound(ctx, 129, 1096, 642, 104, 21, accent);
      font(700, 40);
      ctx.fillStyle = '#201311';
      ctx.textAlign = 'center';
      const actionLabel = decision === 'open' ? copy.decisionVerify : decision === 'verify' ? copy.checkMessage : copy.phone.lines[3];
      ctx.fillText(actionLabel, 450, 1164, 580);
    } else {
      fillRound(ctx, 58, 727, 784, 780, 36, '#2a231e');
      const selected = [1, 3, 4][signal];
      let y = 824;
      font(500, 39);
      copy.phone.lines.forEach((line, index) => {
        const lines = wrap(ctx, line, 660);
        if (index === selected) {
          const top = y - 47;
          const lineHeight = 62 * lines.length + 25;
          fillRound(ctx, 84, top, 729, lineHeight, 14, '#603c28');
          screen.selectedLine.value.set(top / image.height, (top + lineHeight) / image.height);
        }
        ctx.fillStyle = index === selected ? '#ffe2c6' : index === 3 ? '#bdd9ec' : '#f1e6d9';
        lines.forEach((segment, lineIndex) => ctx.fillText(segment, 108, y + lineIndex * 62, 673));
        y += lines.length * 62 + 42;
      });
      fillRound(ctx, 75, 1557, 750, 88, 16, '#3d2b20');
      font(700, 32);
      ctx.fillStyle = '#ffbf8c';
      ctx.textAlign = 'center';
      ctx.fillText(copy.phone.labels[signal], 450, 1614, 690);
    }
    ctx.textAlign = 'center';
    font(500, 31);
    ctx.fillStyle = '#bfa995';
    ctx.fillText(copy.phone.footer, 450, 1735, 773);
    fillRound(ctx, 331, 1848, 238, 11, 6, '#dad0c5');
  }

  return {
    model,
    height: height + 0.07,
    draw(copy, signal, decision) {
      drawScreen(messageContext, copy, signal, false, null);
      drawScreen(actionContext, copy, signal, true, decision);
      screen.feedbackColor.value.set(decision === 'open' ? '#ff9b57' : '#a4d7bd');
      texture.needsUpdate = actionTexture.needsUpdate = true;
    },
    animate(reveal, spotlight, feedback) {
      screen.reveal.value = reveal;
      screen.spotlight.value = spotlight;
      screen.feedback.value = feedback;
    },
    dispose() {
      texture.dispose();
      actionTexture.dispose();
    },
  };
}
