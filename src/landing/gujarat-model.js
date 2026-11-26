import * as THREE from 'three';

// Local equirectangular projection centered on the state. Longitude is
// scaled at the central latitude so east–west distances keep their proportions.
const centerLongitude = 71.55;
const centerLatitude = 23.05;
const longitudeScale = Math.cos(THREE.MathUtils.degToRad(centerLatitude));
const unitsPerDegree = 0.64;
const surface = 0.20;

const cities = [
  [70.8022, 22.3039], // Rajkot
  [72.5714, 23.0225], // Ahmedabad
  [72.8311, 21.1702], // Surat
];

function project([longitude, latitude]) {
  return new THREE.Vector2(
    (longitude - centerLongitude) * longitudeScale * unitsPerDegree,
    (latitude - centerLatitude) * unitsPerDegree,
  );
}

function traceRing(path, coordinates) {
  const [start, ...rest] = coordinates.map(project);
  path.moveTo(start.x, start.y);
  for (const point of rest) path.lineTo(point.x, point.y);
  path.closePath();
  return path;
}

export function createGujaratModel(geometry, texture) {
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  const relief = new THREE.Group();
  const mapFace = new THREE.MeshPhysicalMaterial({
    color: '#ba7952', vertexColors: true, roughness: 0.34, metalness: 0.72,
    clearcoat: 0.28, clearcoatRoughness: 0.44, envMapIntensity: 0.62,
    bumpMap: texture, bumpScale: texture ? 0.023 : 0,
  });
  const mapEdge = new THREE.MeshStandardMaterial({
    color: '#71331b', roughness: 0.3, metalness: 0.66, envMapIntensity: 0.71,
  });
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: '#ffbb77', transparent: true, opacity: 0.40,
  });
  const bronzeShadow = new THREE.Color('#573320');
  const bronzeLight = new THREE.Color('#ffd5a2');
  const shade = new THREE.Color();

  for (const [exterior, ...holes] of polygons) {
    const shape = traceRing(new THREE.Shape(), exterior);
    shape.holes = holes.map(ring => traceRing(new THREE.Path(), ring));

    // A small bevel on the outer coast preserves the narrow inlets.
    const meshGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: surface, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2,
    });
    const positions = meshGeometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    for (let index = 0; index < positions.count; index++) {
      const amount = THREE.MathUtils.clamp(
        0.50 + positions.getY(index) * 0.22 - positions.getX(index) * 0.17, 0.04, 1,
      );
      shade.copy(bronzeShadow).lerp(bronzeLight, amount).toArray(colors, index * 3);
    }
    meshGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    relief.add(new THREE.Mesh(meshGeometry, [mapFace, mapEdge]));

    const coast = exterior.map(coordinate => {
      const point = project(coordinate);
      return new THREE.Vector3(point.x, point.y, surface + 0.011);
    });
    relief.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(coast), outlineMaterial));
  }

  const anchors = cities.map(coordinates => {
    const point = project(coordinates);
    return new THREE.Vector3(point.x, point.y, surface + 0.04);
  });
  const markers = anchors.map(position => {
    const marker = new THREE.Group();
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.027, 16, 10),
      new THREE.MeshBasicMaterial({ color: '#ffe5ba' }),
    );
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.065, 40),
      new THREE.MeshBasicMaterial({
        color: '#ffb060', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    marker.position.copy(position);
    marker.add(light, halo);
    relief.add(marker);
    return { halo };
  });

  const routeSegments = 48;
  const routeSides = 6;
  const routeMaterial = new THREE.MeshBasicMaterial({
    color: '#ffbf80', transparent: true, opacity: 0.72, depthWrite: false,
  });
  const routes = anchors.map((start, index) => {
    const end = anchors[(index + 1) % anchors.length];
    const control = start.clone().lerp(end, 0.5);
    control.z += 0.28;
    const curve = new THREE.QuadraticBezierCurve3(start, control, end);
    const geometry = new THREE.TubeGeometry(curve, routeSegments, 0.008, routeSides, false);
    const mesh = new THREE.Mesh(geometry, routeMaterial);
    relief.add(mesh);
    return { curve, mesh };
  });
  const pulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.023, 12, 8),
    new THREE.MeshBasicMaterial({ color: '#fff2d5', transparent: true, depthWrite: false }),
  );
  relief.add(pulse);

  function update(elapsed, moving, progress, city, cityAge) {
    const engagement = THREE.MathUtils.smoothstep(progress, 0.02, 0.15);
    const reveal = moving ? THREE.MathUtils.smoothstep(cityAge, 0, 1.05) : 1;
    const orbit = cityAge <= 1.05 ? reveal : (elapsed * 0.30) % 1;
    const travel = moving ? THREE.MathUtils.lerp(orbit, 1, engagement) : 1;
    const route = routes[city];
    route.curve.getPoint(travel, pulse.position);
    route.mesh.geometry.setDrawRange(0, Math.ceil(Math.max(reveal, travel) * routeSegments) * routeSides * 6);
    routes.forEach(({ mesh }, index) => { mesh.visible = city === index; });
    pulse.material.opacity = 1 - THREE.MathUtils.smoothstep(progress, 0.15, 0.18);
    markers.forEach(({ halo }, index) => {
      const wave = moving ? (elapsed * 0.55 + index * 0.31) % 1 : 0.3;
      halo.scale.setScalar(0.8 + wave * 1.05);
      halo.material.opacity = (1 - wave) * (index === city ? 0.95 : 0.42);
    });
  }
  return { relief, anchors, relay: city => routes[city].curve.v2, update };
}
