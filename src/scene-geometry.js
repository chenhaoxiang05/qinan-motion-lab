import * as THREE from 'three';
import glyphs from './glyphs.json' with { type: 'json' };

/** Noto CJK outlines bundled with the site; no DOM parser or device font needed. */
export function glyphShapes(character) {
  const tokens = glyphs[character]?.match(/[A-Za-z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi);
  if (!tokens) throw new Error(`Missing local glyph: ${character}`);
  const path = new THREE.ShapePath();
  let index = 0, command = '', x = 0, y = 0, startX = 0, startY = 0;
  const number = () => Number(tokens[index++]);
  while (index < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[index])) command = tokens[index++];
    switch (command) {
      case 'M': x = number(); y = number(); path.moveTo(x, y); startX = x; startY = y; command = 'L'; break;
      case 'L': x = number(); y = number(); path.lineTo(x, y); break;
      case 'H': x = number(); path.lineTo(x, y); break;
      case 'V': y = number(); path.lineTo(x, y); break;
      case 'C': {
        const x1 = number(), y1 = number(), x2 = number(), y2 = number();
        x = number(); y = number(); path.bezierCurveTo(x1, y1, x2, y2, x, y); break;
      }
      case 'Z': path.currentPath.closePath(); x = startX; y = startY; command = ''; break;
      default: throw new Error(`Unsupported glyph command: ${command}`);
    }
  }
  // Font outlines use y-up, counter-clockwise outer contours.
  return path.toShapes(true);
}

function shieldContour() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.36);
  shape.bezierCurveTo(.36, 1.36, .72, 1.22, 1.02, 1.07);
  shape.bezierCurveTo(1.12, 1.02, 1.14, .94, 1.13, .82);
  shape.bezierCurveTo(1.10, .27, 1.04, -.25, .78, -.69);
  shape.bezierCurveTo(.58, -1.04, .25, -1.31, .07, -1.43);
  shape.quadraticCurveTo(0, -1.47, -.07, -1.43);
  shape.bezierCurveTo(-.25, -1.31, -.58, -1.04, -.78, -.69);
  shape.bezierCurveTo(-1.04, -.25, -1.10, .27, -1.13, .82);
  shape.bezierCurveTo(-1.14, .94, -1.12, 1.02, -1.02, 1.07);
  shape.bezierCurveTo(-.72, 1.22, -.36, 1.36, 0, 1.36);
  shape.closePath();
  return shape;
}

/** Smooth swept oval section, giving chrome a genuine continuous reflection surface. */
function rimGeometry(contour, { scale = 1, width = .048, depth = .070, z = .11 } = {}) {
  const points = contour.getSpacedPoints(256).slice(0, -1);
  const count = points.length, sections = 20, positions = [], indices = [];
  for (let i = 0; i < count; i++) {
    const previous = points[(i + count - 1) % count], next = points[(i + 1) % count];
    const tx = next.x - previous.x, ty = next.y - previous.y, length = Math.hypot(tx, ty);
    const nx = -ty / length, ny = tx / length;
    for (let j = 0; j < sections; j++) {
      const angle = j / sections * Math.PI * 2, amount = Math.cos(angle) * width;
      positions.push(points[i].x * scale + nx * amount, points[i].y * scale + ny * amount, z + Math.sin(angle) * depth);
      const a = i * sections + j, b = ((i + 1) % count) * sections + j;
      const c = ((i + 1) % count) * sections + (j + 1) % sections, d = i * sections + (j + 1) % sections;
      indices.push(a, d, b, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox();
  return geometry;
}

/** Closed, gently convex front and back; the face is never a flat extruded polygon. */
function faceGeometry(contour) {
  const outline = contour.getSpacedPoints(192).slice(0, -1), count = outline.length, rings = 28;
  const positions = [], indices = [];
  for (let side = 0; side < 2; side++) {
    for (let ring = 0; ring <= rings; ring++) {
      const radius = ring / rings;
      for (const point of outline) {
        positions.push(point.x * radius * .83, point.y * radius * .83,
          side === 0 ? -.07 + .13 * (1 - radius * radius) : -.15 - .025 * (1 - radius * radius));
      }
    }
  }
  const sideVertices = (rings + 1) * count;
  for (let side = 0; side < 2; side++) {
    const offset = side * sideVertices;
    for (let ring = 0; ring < rings; ring++) for (let j = 0; j < count; j++) {
      const a = offset + ring * count + j, b = offset + ring * count + (j + 1) % count;
      const c = offset + (ring + 1) * count + j, d = offset + (ring + 1) * count + (j + 1) % count;
      if (side === 0) indices.push(a, b, c, b, d, c); else indices.push(a, c, b, b, c, d);
    }
  }
  for (let j = 0; j < count; j++) {
    const a = rings * count + j, b = rings * count + (j + 1) % count;
    indices.push(a, b, a + sideVertices, b, b + sideVertices, a + sideVertices);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox();
  return geometry;
}

export function buildShieldGeometry() {
  const contour = shieldContour();
  const glyphGeometry = new THREE.ExtrudeGeometry(glyphShapes('安'), {
    depth: 34, bevelEnabled: true, bevelThickness: 5, bevelSize: 4, bevelSegments: 3, curveSegments: 10, steps: 1
  });
  glyphGeometry.computeBoundingBox();
  const center = glyphGeometry.boundingBox.getCenter(new THREE.Vector3());
  const scale = .98 / (glyphGeometry.boundingBox.max.x - glyphGeometry.boundingBox.min.x);
  glyphGeometry.translate(-center.x, -center.y, 0); glyphGeometry.scale(scale, scale, scale);
  glyphGeometry.translate(0, .10, 0);
  // The lettering floats in front of the smoked core, revealing separation in parallax.
  glyphGeometry.translate(0, 0, .30);
  glyphGeometry.computeVertexNormals(); glyphGeometry.computeBoundingBox();
  return {
    rimGeometry: rimGeometry(contour),
    coreGeometry: faceGeometry(contour),
    glyphGeometry,
    accentGeometry: rimGeometry(contour, { scale: .89, width: .007, depth: .009, z: -.03 })
  };
}

function polygonContains(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function sloganGrid(maximumCells) {
  const outlines = [], rows = ['先核实', '再放心'];
  rows.forEach((row, rowIndex) => [...row].forEach((character, column) => {
    const shapes = glyphShapes(character);
    const contours = shapes.map(shape => ({ outer: shape.getPoints(12), holes: shape.holes.map(h => h.getPoints(12)) }));
    const all = contours.flatMap(c => c.outer);
    const minX = Math.min(...all.map(p => p.x)), maxX = Math.max(...all.map(p => p.x));
    const minY = Math.min(...all.map(p => p.y)), maxY = Math.max(...all.map(p => p.y));
    outlines.push({ contours, minX, maxX, minY, maxY, rowIndex, column });
  }));
  // A complete coarser glyph is more legible than truncating the last character on mobile.
  let step = Math.max(31, Math.floor(31 * Math.sqrt(2610 / maximumCells)));
  for (;;) {
    const cells = [];
    for (const { contours, minX, maxX, minY, maxY, rowIndex, column } of outlines) {
      const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
      for (let y = minY + step * .42; y < maxY; y += step) for (let x = minX + step * .42; x < maxX; x += step) {
        if (contours.some(c => polygonContains(c.outer, x, y) && !c.holes.some(h => polygonContains(h, x, y)))) {
          cells.push([(x - centerX) * .00094 + (column - 1) * .99, (y - centerY) * .00094 + (.5 - rowIndex) * 1.11]);
        }
      }
    }
    if (cells.length && cells.length <= maximumCells) return {cells, pitch: step * .00094};
    if (step > 1000) return {cells: [[0, 0]], pitch: 1};
    step += 1;
  }
}

/** Morton ordering pairs nearby regions without random particle crossings. */
function spatialSort(points) {
  const xs=points.map(p=>p[0]), ys=points.map(p=>p[1]);
  const minX=Math.min(...xs), minY=Math.min(...ys);
  const width=Math.max(...xs)-minX || 1, height=Math.max(...ys)-minY || 1;
  const spread=value=>{let result=0;for(let bit=0;bit<10;bit++)result|=((value>>bit)&1)<<(bit*2);return result;};
  const key=p=>spread(Math.round((p[0]-minX)/width*1023))|(spread(Math.round((p[1]-minY)/height*1023))<<1);
  return points.map((point,index)=>({point,index,key:key(point)})).sort((a,b)=>a.key-b.key||a.index-b.index).map(entry=>entry.point);
}

function contoursFor(shapes, transform=(point)=>point) {
  return shapes.map(shape=>({outer:shape.getPoints(12).map(transform),holes:shape.holes.map(hole=>hole.getPoints(12).map(transform))}));
}
const contains=(contours,x,y)=>contours.some(c=>polygonContains(c.outer,x,y)&&!c.holes.some(h=>polygonContains(h,x,y)));
function edgeDistance(points,x,y) {
  let distance=Infinity;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y;
    const t=THREE.MathUtils.clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
    distance=Math.min(distance,Math.hypot(x-a.x-t*dx,y-a.y-t*dy));
  }
  return distance;
}
function radialFraction(points,x,y) {
  if(Math.abs(x)+Math.abs(y)<1e-9)return 0;
  let boundaryScale=Infinity;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y;
    const determinant=x*dy-y*dx;
    if(Math.abs(determinant)<1e-9)continue;
    const distance=(a.x*dy-a.y*dx)/determinant;
    const along=(a.x*y-a.y*x)/determinant;
    if(distance>0&&along>=0&&along<=1)boundaryScale=Math.min(boundaryScale,distance);
  }
  return Number.isFinite(boundaryScale)?1/boundaryScale:0;
}

/** One regular XY lattice samples each visible shield layer; no random clusters. */
function shieldGrid(count, minimumPitch) {
  const contour=shieldContour().getSpacedPoints(192).slice(0,-1);
  const core=contour.map(point=>point.clone().multiplyScalar(.83));
  const shapes=glyphShapes('安'), raw=contoursFor(shapes), all=raw.flatMap(c=>c.outer);
  const minX=Math.min(...all.map(p=>p.x)),maxX=Math.max(...all.map(p=>p.x));
  const minY=Math.min(...all.map(p=>p.y)),maxY=Math.max(...all.map(p=>p.y));
  const scale=.98/(maxX-minX+8),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  const letter=contoursFor(shapes,point=>new THREE.Vector2((point.x-cx)*scale,(point.y-cy)*scale+.10));
  let pitch=Math.max(minimumPitch,Math.sqrt(3.5/count));
  for(let attempt=0;attempt<80;attempt++){
    const points=[];
    for(let gy=Math.ceil(-1.54/pitch);gy<=Math.floor(1.44/pitch);gy++)for(let gx=Math.ceil(-1.22/pitch);gx<=Math.floor(1.22/pitch);gx++){
      const x=gx*pitch,y=gy*pitch;
      let z,color;
      if(contains(letter,x,y)){z=.335;color=[.92,.96,.91];}
      else if(polygonContains(core,x,y)){
        const radius=radialFraction(core,x,y);z=-.07+.13*(1-radius*radius);color=[.20,.23,.26];
      }else if(edgeDistance(contour,x,y)<.050){z=.16;color=[.78,.84,.89];}
      else continue;
      points.push([x,y,z,...color]);
    }
    if(points.length>=count){
      const ordered=spatialSort(points);
      // Even selection retains the whole outline and all material regions.
      return {points:Array.from({length:count},(_,i)=>ordered[Math.floor((i+.5)*ordered.length/count)]),pitch};
    }
    if(pitch<=minimumPitch+1e-9)throw new Error('Shield lattice cannot fit the requested glyph count without overlap.');
    pitch=Math.max(minimumPitch,pitch*.97);
  }
  throw new Error('Shield lattice allocation did not converge.');
}

/** Actual glyph count, a single depth plane, and an explicit 34% inter-cube gap. */
export function createVoxelTargets(maximumCount, suppliedGeometries) {
  if(!Number.isInteger(maximumCount)||maximumCount<1||maximumCount>4096)throw new Error('Voxel count must be an integer between 1 and 4096.');
  // Keep the optional geometry argument compatible with callers; sampling is analytic.
  void suppliedGeometries;
  const {cells,pitch}=sloganGrid(maximumCount),count=cells.length;
  const endPoints=spatialSort(cells),shield=shieldGrid(count,pitch);
  const starts=new Float32Array(count*3),ends=new Float32Array(count*3),colors=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const source=shield.points[i],target=endPoints[i];
    starts.set(source.slice(0,3),i*3);colors.set(source.slice(3,6),i*3);
    ends.set([target[0],target[1],0],i*3);
  }
  return {count,starts,ends,colors,pitch,cubeSize:pitch*.66,startPitch:shield.pitch};
}
