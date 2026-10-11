import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CheckCircle2, Crosshair, Info, MapPin, RotateCcw, XCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Loading, Notice } from '@/components/ui';
import { distanceKm, pointInGeometry } from '@/lib/geo';

interface GisData { school: any; buffer: any }
interface Point { lat: number; lng: number; source: 'map' | 'gps' }

const getJson = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.json(); });

export default function AdmissionMap() {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinRef = useRef<L.CircleMarker | null>(null);
  const [data, setData] = useState<GisData | null>(null);
  const [error, setError] = useState('');
  const [point, setPoint] = useState<Point | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // 1. Load the two GeoJSON files exported from ArcGIS
  useEffect(() => {
    Promise.all([getJson('/gis/school-point.geojson'), getJson('/gis/buffer-3km.geojson')])
      .then(([s, b]) => setData({ school: s.features[0], buffer: b.features[0] }))
      .catch(() => setError('The map data could not be loaded. Check that the files are in public/gis.'));
  }, []);

  // 2. Draw the map once the data is ready
  useEffect(() => {
    if (!data || !box.current) return;
    const [sLng, sLat] = data.school.geometry.coordinates;
    const map = L.map(box.current, { scrollWheelZoom: false }).setView([sLat, sLng], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    const zone = L.geoJSON(data.buffer, { style: { color: '#5b4bff', weight: 2.5, fillColor: '#5b4bff', fillOpacity: 0.16 } }).addTo(map);
    map.fitBounds(zone.getBounds(), { padding: [16, 16] });
    L.circleMarker([sLat, sLng], { radius: 10, color: '#ffffff', weight: 3, fillColor: '#d92d4a', fillOpacity: 1 })
      .addTo(map)
      .bindTooltip('School', { permanent: true, direction: 'top', offset: [0, -8] });
    map.on('click', (e: L.LeafletMouseEvent) => { setGpsError(''); setPoint({ lat: e.latlng.lat, lng: e.latlng.lng, source: 'map' }); });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; pinRef.current = null; };
  }, [data]);

  // 3. Decide inside / outside for the chosen point
  const result = useMemo(() => {
    if (!data || !point) return null;
    const pt: [number, number] = [point.lng, point.lat];
    return { inside: pointInGeometry(pt, data.buffer.geometry), km: distanceKm(pt, data.school.geometry.coordinates) };
  }, [data, point]);

  // 4. Show the chosen point as a coloured pin
  useEffect(() => {
    const map = mapRef.current;
    pinRef.current?.remove();
    pinRef.current = null;
    if (!map || !point || !result) return;
    pinRef.current = L.circleMarker([point.lat, point.lng], {
      radius: 9, color: '#ffffff', weight: 3, fillColor: result.inside ? '#12a150' : '#f2a516', fillOpacity: 1,
    }).addTo(map);
    if (point.source === 'gps') map.panTo([point.lat, point.lng]);
  }, [point, result]);

  function useMyLocation() {
    setGpsError('');
    if (!navigator.geolocation) { setGpsError('Your browser does not support location.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocating(false); setPoint({ lat: p.coords.latitude, lng: p.coords.longitude, source: 'gps' }); },
      () => { setLocating(false); setGpsError('Could not get your location. Allow location access, or click your home on the map instead.'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const props = data?.school.properties ?? {};
  const radius = data?.buffer.properties?.BUFF_DIST ?? 3;

  return (
    <>
      <PageHeader eyebrow="Admission area" title="Admission area map">
        See whether your home is inside the {radius} km zone around our school.
      </PageHeader>
      <section className="section tight"><div className="container grid c32">
        <div className="card pad0">
          {error ? <div style={{ padding: 20 }}><Notice kind="error">{error}</Notice></div> : (
            <div className="map-box"><div ref={box} className="map-canvas" aria-label="Map of the school and its admission zone" />{!data && <div className="map-loading"><Loading /></div>}</div>
          )}
          <div className="map-legend">
            <span><i className="dot-school" /> School</span>
            <span><i className="dot-zone" /> {radius} km zone</span>
            <span><i className="dot-in" /> Inside</span>
            <span><i className="dot-out" /> Outside</span>
          </div>
        </div>

        <div className="stack">
          <div className="card stack">
            <h3>Check your home</h3>
            <p className="small muted">Click your home on the map, or use your phone or computer location.</p>
            <div className="row">
              <button className="btn btn-primary" onClick={useMyLocation} disabled={!data || locating}><Crosshair size={16} /> {locating ? 'Locating…' : 'Use my location'}</button>
              {point && <button className="btn btn-ghost" onClick={() => { setPoint(null); setGpsError(''); }}><RotateCcw size={16} /> Clear</button>}
            </div>
            {gpsError && <Notice kind="error">{gpsError}</Notice>}
            {result ? (
              <div className={`zone-result ${result.inside ? 'in' : 'out'}`} role="status">
                {result.inside ? <CheckCircle2 size={26} /> : <XCircle size={26} />}
                <div>
                  <b>{result.inside ? `Inside the ${radius} km zone` : `Outside the ${radius} km zone`}</b>
                  <div className="small">About {result.km.toFixed(2)} km from the school (straight line).</div>
                </div>
              </div>
            ) : <p className="small muted"><MapPin size={14} style={{ verticalAlign: -2 }} /> No location chosen yet.</p>}
          </div>

          <div className="card">
            <h3>School details</h3>
            <div className="kv">
              <div><span>School</span><span>{props.School_Name ?? '–'}</span></div>
              <div><span>Grades</span><span>{props.Grade_Range ?? '–'}</span></div>
              <div><span>District</span><span>{props.District ?? '–'}</span></div>
              <div><span>Zone radius</span><span>{radius} km</span></div>
            </div>
          </div>

          <div className="card"><div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <Info size={20} color="var(--primary)" style={{ flex: 'none' }} />
            <p className="small muted">Living inside the zone shows that a home is near the school. It does <b>not</b> by itself decide admission. The school follows the official admission rules.{' '}
              <Link to="/admissions" style={{ color: 'var(--primary)', fontWeight: 650 }}>Go to admissions</Link></p>
          </div></div>
        </div>
      </div></section>
    </>
  );
}