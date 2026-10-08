// Server Component layout. Rendering is dynamic so every request gets its own nonce.
import '@sdcorejs/nova/tokens.css';
import '@sdcorejs/nova/styles.css';
import './app.css';

import { connection } from 'next/server';

export const metadata = { title: 'Nova Next SSR fixture' };

export default async function RootLayout({ children }) {
  await connection();
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
