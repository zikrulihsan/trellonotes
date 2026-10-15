import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Monitor, Smartphone, Tablet } from 'lucide-react';
import type { Landing } from '@/lib/supabase/landing';
import type { PublicAuthor, PublishedPage } from '@/lib/supabase/published-pages';
import type { Section } from '@/features/reader/PublicReader';

const DEVICES = [
  { id: 'desktop', label: 'Desktop', width: 1280, icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: 768, icon: Tablet },
  { id: 'mobile', label: 'Mobile', width: 390, icon: Smartphone },
] as const;
type Device = (typeof DEVICES)[number]['id'];

/** The size that matches the screen the writer is on, which the overlay starts on. */
function screenDevice(): Device {
  if (window.innerWidth <= 760) return 'mobile';
  return window.innerWidth <= 1180 ? 'tablet' : 'desktop';
}

/**
 * The Me, Blog or About page as visitors will see it, drawn live from the unsaved draft in a
 * frame at a real device width and scaled down to fit. `focus` names the section the writer
 * just moved or restyled, which the frame brings into view each time `focusKey` changes.
 * `onClose` is set when it shows as an overlay: on tablets and phones it takes the whole
 * screen until the writer goes back to editing.
 */
export function LandingPreviewPane({
  landing,
  author,
  pages,
  view,
  focus,
  focusKey,
  onClose,
}: {
  landing: Landing;
  author: PublicAuthor & { name: string | null };
  /** The posts to show, when they aren't the writer's published pages (the playground). */
  pages?: PublishedPage[];
  view: Section;
  focus?: string;
  focusKey?: number;
  onClose?: () => void;
}) {
  const overlay = Boolean(onClose);
  // The overlay starts at the size of the screen it opens on.
  const [device, setDevice] = useState<Device>(() => (overlay ? screenDevice() : 'desktop'));
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ width: 0, height: 0 });
  // On a phone, the mobile view is drawn at the phone's own width, unscaled.
  const width =
    overlay && device === 'mobile' && box.width && box.width <= 760
      ? box.width
      : DEVICES.find((item) => item.id === device)!.width;

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => {
      // The frame fits inside the stage's padding, so a device as wide as the screen is never cut off.
      const { paddingLeft, paddingRight, paddingTop, paddingBottom } = getComputedStyle(element);
      setBox({
        width: Math.max(
          0,
          element.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight),
        ),
        height: Math.max(
          0,
          element.clientHeight - parseFloat(paddingTop) - parseFloat(paddingBottom),
        ),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // While it covers the screen, Escape goes back to editing too.
  useEffect(() => {
    if (!overlay) return;
    const leave = (event: KeyboardEvent) => event.key === 'Escape' && close.current?.();
    document.addEventListener('keydown', leave);
    return () => document.removeEventListener('keydown', leave);
  }, [overlay]);

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
      { type: 'notis:landing-preview', landing, author, pages, view, focus, focusKey },
      window.location.origin,
    );
  }, [ready, landing, author, pages, view, focus, focusKey]);

  const scale = box.width ? Math.min(1, box.width / width) : 1;
  return (
    <aside
      className={`landing-preview-pane ${overlay ? 'is-overlay' : ''}`}
      aria-label="Preview"
      role={overlay ? 'dialog' : undefined}
      aria-modal={overlay || undefined}
    >
      <div className="landing-preview-bar">
        {onClose ? (
          <button type="button" className="landing-preview-back" onClick={onClose}>
            <ArrowLeft size={17} /> Back to editing
          </button>
        ) : (
          <span className="landing-preview-title">Preview</span>
        )}
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
