import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Monitor, Smartphone, Tablet, X } from 'lucide-react';
import type { Landing } from '@/lib/supabase/landing';
import type { PublicAuthor } from '@/lib/supabase/published-pages';
import type { Section } from '@/features/reader/PublicReader';

const DEVICES = [
  { id: 'desktop', label: 'Desktop', width: 1280, icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: 768, icon: Tablet },
  { id: 'mobile', label: 'Mobile', width: 390, icon: Smartphone },
] as const;
type Device = (typeof DEVICES)[number]['id'];

/**
 * The Me, Blog or About page as visitors will see it, drawn live from the unsaved draft in a
 * frame at a real device width and scaled down to fit. `focus` names the section the writer
 * just moved or restyled, which the frame brings into view each time `focusKey` changes.
 * `onClose` is set when it shows as an overlay.
 */
export function LandingPreviewPane({
  landing,
  author,
  view,
  focus,
  focusKey,
  onClose,
}: {
  landing: Landing;
  author: PublicAuthor & { name: string | null };
  view: Section;
  focus?: string;
  focusKey?: number;
  onClose?: () => void;
}) {
  const [device, setDevice] = useState<Device>('desktop');
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const width = DEVICES.find((item) => item.id === device)!.width;

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => setBox({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const listen = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow)
        return;
      if ((event.data as { type?: string })?.type === 'notis:landing-preview-ready') setReady(true);
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);

  useEffect(() => {
    if (!ready) return;
    frame.current?.contentWindow?.postMessage(
      { type: 'notis:landing-preview', landing, author, view, focus, focusKey },
      window.location.origin,
    );
  }, [ready, landing, author, view, focus, focusKey]);

  const scale = box.width ? Math.min(1, box.width / width) : 1;
  return (
    <aside className={`landing-preview-pane ${onClose ? 'is-overlay' : ''}`} aria-label="Preview">
      <div className="landing-preview-bar">
        <span className="landing-preview-title">Preview</span>
        <div className="landing-preview-devices" role="radiogroup" aria-label="Screen size">
          {DEVICES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={device === id}
              aria-label={label}
              title={label}
              className={device === id ? 'is-active' : ''}
              onClick={() => setDevice(id)}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
        {onClose && (
          <button
            type="button"
            className="icon-button"
            aria-label="Close preview"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        )}
      </div>
      <div className="landing-preview-stage" ref={stage}>
        <div
          className="landing-preview-device"
          style={{ width: width * scale, height: box.height }}
        >
          <iframe
            ref={frame}
            title="Preview of your public page"
            src="/landing-preview"
            style={{
              width,
              height: scale ? box.height / scale : box.height,
              transform: `scale(${scale})`,
            }}
          />
        </div>
      </div>
      <p className="landing-preview-note">Unsaved changes show here. Links don't open.</p>
    </aside>
  );
}
