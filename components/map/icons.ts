import L from 'leaflet'

export const terminalIcon = L.divIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -34],
  html: `
    <div style="
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      position:relative;
    ">
      <!-- pin body -->
      <div style="
        width:28px;height:28px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:#2563eb;border:2px solid #93c5fd;
        box-shadow:0 2px 8px rgba(37,99,235,0.4);
        display:flex;align-items:center;justify-content:center;
      ">
        <!-- Bus glyph, matching the lucide Bus icon used elsewhere in the app.
             Inlined as raw path data because Leaflet divIcons take an HTML
             string, so the React component cannot be used here. -->
        <svg style="transform:rotate(45deg);width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6v6"/>
          <path d="M15 6v6"/>
          <path d="M2 12h19.6"/>
          <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
          <circle cx="7" cy="18" r="2"/>
          <path d="M9 18h5"/>
          <circle cx="16" cy="18" r="2"/>
        </svg>
      </div>
    </div>
  `,
})

export const busIcon = (vehicleNumber?: string) =>
  L.divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    html: `
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
        <span style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.25);animation:bus-pulse 1.6s ease-out infinite;"></span>
        <div style="width:26px;height:26px;border-radius:50%;background:#2563eb;border:2.5px solid #93c5fd;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px rgba(37,99,235,0.3);font-size:10px;font-weight:700;color:#fff;font-family:monospace;letter-spacing:-0.5px;line-height:1;z-index:1;">
          ${vehicleNumber ? vehicleNumber.slice(-3) : '🚌'}
        </div>
      </div>
      <style>
        @keyframes bus-pulse {
          0%   { transform:scale(0.8); opacity:0.8; }
          100% { transform:scale(2.2); opacity:0; }
        }
      </style>
    `,
  })