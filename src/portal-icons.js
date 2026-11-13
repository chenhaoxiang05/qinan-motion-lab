const drawings={
  check:`<path class="portal-scan-corners" d="M11 5H5v6m16-6h6v6M5 21v6h6m16-6v6h-6"/><path class="portal-motion-part portal-scan-line" d="M8 10h16"/><path d="M13 16h6" opacity=".3"/>`,
  contacts:`<g class="portal-motion-part portal-phone-handset"><path d="M7.4 5h3.5l2.2 5.2-2.6 2.4a20.5 20.5 0 0 0 8.9 8.9l2.4-2.6 5.2 2.2v3.5a2.7 2.7 0 0 1-2.9 2.7A23.7 23.7 0 0 1 4.7 7.9 2.7 2.7 0 0 1 7.4 5Z"/></g><path class="portal-motion-part portal-phone-wave portal-phone-wave-near" d="M19 8a6 6 0 0 1 5 5"/><path class="portal-motion-part portal-phone-wave portal-phone-wave-far" d="M19.5 3.5a10 10 0 0 1 9 9"/>`,
  practice:`<g class="portal-motion-part portal-practice-cards"><path d="M7 10H5v17h16v-2" opacity=".45"/><rect x="10" y="4" width="17" height="19" rx="1.5"/><path class="portal-motion-part portal-practice-check" d="m14 13 3.2 3.3 5.7-6.2"/></g>`,
  history:`<circle cx="16" cy="16" r="11.5"/><path d="M16 4.5v2M27.5 16h-2M16 27.5v-2M4.5 16h2" opacity=".4"/><path class="portal-motion-part portal-clock-minute" d="M16 16V8"/><path class="portal-motion-part portal-clock-hour" d="m16 16 5 3"/><circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none"/>`,
};

/** Decorative, purpose-specific portal glyphs; the surrounding link owns its name. */
export function portalIcon(kind) {
  if(!Object.hasOwn(drawings,kind))return '';
  return `<svg class="portal-icon-svg portal-icon-${kind}" viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${drawings[kind]}</svg>`;
}
