import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { changeDomain, getOwnDomain, type DomainStatus } from '@/lib/supabase/custom-domains';
import {
  NETLIFY_APEX_IP,
  SUBDOMAIN_ROOT,
  SUBDOMAINS_LIVE,
  domainProblem,
  isApexDomain,
  normalizeDomain,
  verifyRecordName,
  verifyRecordValue,
} from '@/lib/site-host';

/** The DNS records a writer adds where they bought the domain. */
function records(domain: string, userId: string, target?: string) {
  if (!isApexDomain(domain))
    return [{ type: 'CNAME', name: domain, value: target ?? 'your Notis address' }];
  return [
    { type: 'A', name: domain, value: NETLIFY_APEX_IP },
    { type: 'TXT', name: verifyRecordName(domain), value: verifyRecordValue(userId) },
  ];
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="domain-copy"
      aria-label={`Copy ${value}`}
      onClick={() =>
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
    >
      <code>{value}</code>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

/** Lets a writer show their public page on a domain they own, and on their Notis subdomain. */
export function CustomDomain({ userId, handle }: { userId: string; handle: string | null }) {
  const [status, setStatus] = useState<DomainStatus>();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    getOwnDomain(supabase, userId).then(
      (row) => {
        if (!active) return;
        setStatus({ domain: row?.domain ?? null, live: Boolean(row?.verified_at) });
        // A domain still waiting on DNS is checked again each time the screen opens.
        if (row && !row.verified_at) void run({ action: 'check' });
      },
      () => active && setStatus({ domain: null, live: false }),
    );
    return () => {
      active = false;
    };
  }, [userId]);

  async function run(request: Parameters<typeof changeDomain>[1]) {
    if (!supabase) return;
    setBusy(true);
    setError('');
    try {
      setStatus(await changeDomain(supabase, request));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function connect(event: FormEvent) {
    event.preventDefault();
    const domain = normalizeDomain(value);
    const problem = domainProblem(domain);
    if (problem) setError(problem);
    else void run({ action: 'connect', domain });
  }

  if (!status) return null;
  const subdomain = handle && `${handle}.${SUBDOMAIN_ROOT}`;
  return (
    <section className="landing-fieldset landing-domain" aria-labelledby="landing-domain">
      <h2 id="landing-domain">
        <Globe size={16} /> Your own domain
      </h2>
      <p className="landing-admin-hint">
        Show your public page at an address you own, like <strong>zikrul.dev</strong>. Visitors stay
        on your domain; Notis serves the page.
      </p>
      {SUBDOMAINS_LIVE && subdomain && (
        <p className="landing-domain-line">
          Your Notis address:{' '}
          <a href={`https://${subdomain}`} target="_blank" rel="noreferrer">
            {subdomain} <ExternalLink size={13} />
          </a>
        </p>
      )}

      {!status.domain ? (
        <form className="landing-domain-form" onSubmit={connect}>
          <input
            aria-label="Your domain"
            placeholder="zikrul.dev"
            value={value}
            autoCapitalize="off"
            spellCheck={false}
            onChange={(event) => {
              setValue(event.target.value);
              setError('');
            }}
          />
          <Button type="submit" variant="primary" disabled={busy || !value.trim()}>
            {busy ? 'Connecting…' : 'Connect'}
          </Button>
        </form>
      ) : status.live ? (
        <p className="landing-domain-line">
          <span className="landing-domain-badge is-live">Live</span>
          <a href={`https://${status.domain}`} target="_blank" rel="noreferrer">
            {status.domain} <ExternalLink size={13} />
          </a>
          <button
            type="button"
            className="public-address-change"
            disabled={busy}
            onClick={() => void run({ action: 'remove' })}
          >
            Remove
          </button>
        </p>
      ) : (
        <>
          <p className="landing-domain-line">
            <span className="landing-domain-badge">Waiting for DNS</span>
            <strong>{status.domain}</strong>
          </p>
          <p className="landing-admin-hint">
            Add {isApexDomain(status.domain) ? 'these records' : 'this record'} where you bought the
            domain (Niagahoster, Cloudflare, Namecheap…). It can take a few minutes to an hour to
            spread; Notis then sets up HTTPS on its own.
          </p>
          <table className="landing-domain-records">
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {records(status.domain, userId, status.target).map((record) => (
                <tr key={record.type}>
                  <td>{record.type}</td>
                  <td>
                    <CopyValue value={record.name} />
                  </td>
                  <td>
                    <CopyValue value={record.value} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {status.problem && <p className="landing-admin-hint">Last check: {status.problem}</p>}
          <div className="landing-domain-actions">
            <Button variant="primary" disabled={busy} onClick={() => void run({ action: 'check' })}>
              {busy ? 'Checking…' : 'Check again'}
            </Button>
            <Button disabled={busy} onClick={() => void run({ action: 'remove' })}>
              Remove
            </Button>
          </div>
        </>
      )}
      {error && (
        <p className="publish-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
