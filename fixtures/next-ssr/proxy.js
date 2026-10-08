// Per-request nonce owned by the consumer app (architecture §9): CSP-A is
// enforced, CSP-B (style-src-attr 'none') is report-only. Next.js reads the
// request CSP header and puts the nonce on its own inline scripts.
import { NextResponse } from 'next/server';

function policy(nonce, styleAttr) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-attr ${styleAttr}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function proxy(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const enforced = policy(nonce, "'unsafe-inline'");
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', enforced);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', enforced);
  response.headers.set('Content-Security-Policy-Report-Only', policy(nonce, "'none'"));
  return response;
}

export const config = {
  matcher: [{
    source: '/((?!_next/static|_next/image|favicon.ico).*)',
    missing: [{ type: 'header', key: 'next-router-prefetch' }, { type: 'header', key: 'purpose', value: 'prefetch' }],
  }],
};
