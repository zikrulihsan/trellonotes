// The parts of Netlify's edge runtime these functions use.
declare const Netlify: { env: { get(name: string): string | undefined } };
interface Context {
  next(): Promise<Response>;
}
