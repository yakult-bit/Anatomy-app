export function securityHeaders(nonce:string,origin:string){
 return new Headers({
  'Content-Security-Policy':[`default-src 'none'`,`script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' https://challenges.cloudflare.com`,`style-src 'self' 'nonce-${nonce}'`,`style-src-attr 'none'`,`img-src 'self' data: https://lh3.googleusercontent.com https://lh4.googleusercontent.com https://lh5.googleusercontent.com https://lh6.googleusercontent.com`,`font-src 'self' data:`,`connect-src 'self' https://challenges.cloudflare.com`,`worker-src 'self' blob:`,`frame-src https://challenges.cloudflare.com`,`object-src 'none'`,`base-uri 'none'`,`form-action 'self'`,`frame-ancestors 'none'`,...(origin.startsWith('https:')?['upgrade-insecure-requests']:[])].join('; '),
  'Strict-Transport-Security':'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), accelerometer=(), gyroscope=(), magnetometer=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin'
 });
}
