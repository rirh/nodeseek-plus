export function toolIcon(name: 'play' | 'stop' | 'close' | 'refresh' | 'history' | 'settings' | 'attendance' | 'footprints' | 'monitor' | 'messages' | 'ai' | 'hot') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '18'); svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', name === 'hot' ? 'M13 2c1 6-5 6-2 11 2-1 3-3 3-5 4 3 6 6 4 10a7 7 0 0 1-13-4c0-4 5-6 8-12Z' : name === 'ai' ? 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3M20 2v4M18 4h4' : name === 'play' ? 'M8 5l11 7-11 7V5' : name === 'stop' ? 'M6 6h12v12H6V6' : name === 'close' ? 'M6 6l12 12M18 6 6 18' : name === 'refresh' ? 'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1' : name === 'footprints' ? 'M4 4h16v12H9l-5 4V4M8 8h8M8 12h5' : name === 'monitor' ? 'M3 12h4l3-8 4 16 3-8h4' : name === 'messages' ? 'M3 5h18v14H3V5m0 0 9 7 9-7' : name === 'history' ? 'M3 11a9 9 0 1 1 2.6 7M3 4v7h7M12 7v5l3 2' : name === 'attendance' ? 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M8 16l3 3 5-6' : 'M4 7h16M4 17h16M8 4v6M16 14v6');
  if (name === 'monitor') { path.setAttribute('pathLength', '100'); path.classList.add('nspp-ecg-trace'); }
  svg.append(path);
  if (name === 'monitor') { const shine = path.cloneNode(true) as SVGElement; shine.classList.replace('nspp-ecg-trace', 'nspp-ecg-shine'); svg.append(shine); }
  return svg;
}
