/** "I have read the Terms and agree to the Privacy Policy", with both linked. */
export function ConsentCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="home-consent">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        I have read the{' '}
        <a href="/terms" target="_blank" rel="noreferrer">
          Terms
        </a>{' '}
        and agree to the{' '}
        <a href="/privacy" target="_blank" rel="noreferrer">
          Privacy Policy
        </a>
        .
      </span>
    </label>
  );
}
