# Hướng dẫn tích hợp SD Nova P0

> **Trạng thái:** P0 (12 dossier) đã được triển khai và kiểm cục bộ trên nhánh `feat/nova-p0`, nhưng **P0 này chưa được publish**: quy trình này không publish P0; `package.json` vẫn là `private: true`, phiên bản `0.0.0`, license [MIT](../../LICENSE) của Nova đã được duyệt. Các dossier P1, P2, P3 vẫn là đề xuất, chưa được duyệt hay triển khai.

Tài liệu này dành cho ứng dụng dùng Nova P0. Mọi đoạn mã TSX bên dưới được chép nguyên văn từ [fixture ví dụ](../../test/types/consumer-integration.tsx), và fixture này được typecheck qua bản đóng gói (`exports` của package) với TypeScript 6.0.3 và 5.7.3 bằng `npm run typecheck:fixtures`.

## 1. Phạm vi P0

| Subpath | Nội dung |
|---|---|
| `@sdcorejs/nova/theme` | `NovaProvider`, `ThemeProvider`, `useNovaTheme` |
| `@sdcorejs/nova/i18n` | `vi`, `en`, kiểu `NovaStrings`, `NovaStringOverrides` |
| `@sdcorejs/nova/types` | Kiểu dùng chung |
| `@sdcorejs/nova/button`, `avatar`, `badge`, `card`, `link`, `breadcrumb`, `alert`, `data-state` | Component hiển thị và hành động |
| `@sdcorejs/nova/field`, `input`, `checkbox`, `switch`, `radio-group` | Field và control form |
| `@sdcorejs/nova/tokens.css`, `styles.css`, `styles/*.css` | CSS đã biên dịch |

Hợp đồng chi tiết nằm ở các dossier, ví dụ [S01](specs/S01.vi.md), [C05](specs/C05.vi.md), [C06](specs/C06.vi.md) và [C10](specs/C10.vi.md). Mọi đường dẫn khác (mã trong `src`, module nội bộ, class `.nova-*`, cấu trúc DOM bên trong) không phải API công khai.

## 2. Khi P0 này chưa được publish

Vì P0 này chưa được publish, tài liệu này không hướng dẫn cài từ npm. Bằng chứng tích hợp hiện có đến từ `npm run smoke:pack`: lệnh này build, đóng gói tarball bằng `npm pack` rồi cài tarball (không lưu vào manifest) vào các fixture Vite CSR, Next.js SSR và fixture cô lập bundle để chạy bản production.

## 3. Nạp CSS

```ts
import '@sdcorejs/nova/tokens.css';
import '@sdcorejs/nova/styles.css';
```

- `tokens.css` khai báo biến `--nova-*` cho `light`, `dark` và `system`. Với `system`, biến được chọn bằng media query `prefers-color-scheme`, nên lần vẽ đầu đã đúng mà không cần JavaScript.
- `styles.css` gồm phần base và CSS của mọi component, không gồm token.
- Nếu chỉ cần một vài component: nạp `tokens.css`, `styles/base.css` và từng file như `styles/button.css`. `styles/base.css` chứa quy tắc của scope theme nên không được bỏ.
- CSS của Nova nằm trong `@layer nova.tokens, nova.base, nova.components` và không reset `html`, `body` hay phần tử trần.

## 4. Scope theme không tô nền: ứng dụng tô bề mặt

`NovaProvider` và `ThemeProvider` render một phần tử scope mang `data-nova-theme`, `dir` và `lang`. Phần tử này có `display: contents`: nó không tạo hộp và không tô nền. Biến `--nova-*` của theme áp dụng cho phần tử con, nhưng không ai tự tô nền cho vùng đó.

Vì vậy ứng dụng phải tô một bề mặt thật bằng phần tử của mình, đặt **bên trong** mỗi scope theme: ngay dưới `NovaProvider`, ngay dưới mỗi `ThemeProvider` lồng (island) và ngay dưới nội dung của mỗi portal.

```css
.app-surface {
  background: var(--nova-color-background);
  color: var(--nova-color-text);
}

.app-overlay {
  border: 1px solid var(--nova-color-border);
  padding: 16px;
}
```

- Không đặt nền inline đại trà lên từng component Nova (`style` với `background`). Component trong suốt như `Link` hay `Spinner` dựa vào bề mặt bạn tô.
- Không tô `html` hay `body` thay cho bề mặt trong scope: chúng nằm ngoài scope nên không nhận biến của theme đang dùng.
- Bằng chứng: kịch bản trình duyệt `display` đo độ tương phản trên Chromium, Firefox và WebKit. Bề mặt do ứng dụng tô trong scope sáng, scope tối, island lồng và nội dung portal đều đạt tối thiểu 4.5:1. Trường hợp scope tối không có bề mặt và island không có bề mặt đều dưới 4.5:1, nên đó là cách dùng **không được hỗ trợ**.

## 5. Provider gốc và SSR

<!-- example: imports -->
```tsx
import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@sdcorejs/nova/button';
import { Card, Section } from '@sdcorejs/nova/card';
import { NovaProvider, ThemeProvider, useNovaTheme } from '@sdcorejs/nova/theme';
```

<!-- example: app-root -->
```tsx
export function AppRoot({ initialResolvedTheme, children }: { initialResolvedTheme: 'light' | 'dark'; children: ReactNode }) {
  return (
    <NovaProvider theme="system" initialResolvedTheme={initialResolvedTheme} locale="vi" dir="ltr" className="brand-tokens">
      <div className="app-surface">{children}</div>
    </NovaProvider>
  );
}
```

- Với `theme="system"`, server và lần render đầu ở client đều dùng `initialResolvedTheme`. Hãy truyền một giá trị ổn định mà server biết trước (ví dụ lựa chọn đã lưu của người dùng) và truyền đúng giá trị đó cho lần render đầu ở client. Markup hai phía giống nhau nên hydrate không lỗi.
- Nova chỉ đọc `matchMedia` sau khi mount và gỡ listener khi unmount. Import và render không truy cập `window` hay `document`.
- Nếu server không biết lựa chọn của người dùng, hãy dùng `'light'`. Màu ở lần vẽ đầu vẫn theo media query của `tokens.css`; chỉ giá trị `resolvedTheme` trong JavaScript được cập nhật sau khi mount.
- `locale`, `dir`, `timeZone`, `strings` và `className` (lớp token của bạn, ở đây là `brand-tokens`) đặt ở `NovaProvider`. Mỗi `ThemeProvider` lồng kế thừa locale, dir, strings và lớp token, đồng thời đặt `dir` và `lang` lên phần tử scope của nó.
- Với Next.js App Router: `NovaProvider` và `ThemeProvider` là Client Component trong bản build, nên layout là Server Component vẫn render được chúng với props tuần tự hoá được. File có hook (như `ThemeStatus` hay `ThemedPortal` dưới đây) phải bắt đầu bằng `'use client'`, giống fixture ví dụ.

## 6. Island theme lồng

<!-- example: dark-island -->
```tsx
export function DarkIsland({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme="dark">
      <div className="app-surface">{children}</div>
    </ThemeProvider>
  );
}
```

- `theme` là bắt buộc (`'light' | 'dark' | 'system'`); `initialResolvedTheme` là tùy chọn, dùng khi `theme="system"`.
- Island chỉ ghi đè theme cho cây con và vẫn cần bề mặt riêng bên trong.
- `ThemeProvider` dùng độc lập (không có `NovaProvider` bao ngoài) tạo scope đầy đủ với mặc định `vi` và `ltr`.

## 7. Đọc theme hiện tại

<!-- example: theme-status -->
```tsx
export function ThemeStatus() {
  const { theme, resolvedTheme } = useNovaTheme();
  return <p>Theme: {theme} → {resolvedTheme}</p>;
}
```

`useNovaTheme()` trả đúng `{ theme, resolvedTheme }` của scope gần nhất và không có setter. Muốn đổi theme, hãy đổi prop `theme` của provider bằng state của ứng dụng. Với `system`, `resolvedTheme` chỉ chính xác sau khi mount.

## 8. Portal của ứng dụng

<!-- example: themed-portal -->
```tsx
const subscribe = () => () => {};
const getBody = () => document.body;
const getServerBody = () => null;

export function ThemedPortal({ children }: { children: ReactNode }) {
  const { theme, resolvedTheme } = useNovaTheme();
  const body = useSyncExternalStore(subscribe, getBody, getServerBody);
  if (!body) return null;
  return createPortal(
    <ThemeProvider theme={theme} initialResolvedTheme={resolvedTheme}>
      <div className="app-surface app-overlay">{children}</div>
    </ThemeProvider>,
    body,
  );
}
```

- React context đi qua portal, nhưng trong DOM nội dung portal nằm ngoài phần tử scope nên không nhận biến CSS của theme. Vì vậy hãy đặt `ThemeProvider` công khai **bên trong** cây portal và tô một phần tử con.
- `useSyncExternalStore` với snapshot phía server là `null`: server và lần hydrate không render portal và không chạm `document`; portal chỉ xuất hiện sau khi mount.
- `ThemeProvider` trong portal kế thừa locale, dir, strings và lớp token `brand-tokens` qua context, và đặt `dir`, `lang` lên phần tử scope trong portal.
- Scope portal nội bộ của Nova không phải API công khai và không import được. Prop `portalContainer` của `NovaProvider` chỉ dành cho portal do chính Nova tạo; P0 chưa có component overlay công khai.

## 9. Ghép lại

<!-- example: page -->
```tsx
export function Page({ initialResolvedTheme }: { initialResolvedTheme: 'light' | 'dark' }) {
  return (
    <AppRoot initialResolvedTheme={initialResolvedTheme}>
      <ThemeStatus />
      <Card>
        <Section title="Tài khoản" actions={<Button>Lưu</Button>}>
          Nội dung nằm trên bề mặt do ứng dụng tô theo theme gốc.
        </Section>
      </Card>
      <DarkIsland>
        <Button variant="secondary">Nút trong island tối</Button>
      </DarkIsland>
      <ThemedPortal>
        <Button>Nút trong portal</Button>
      </ThemedPortal>
    </AppRoot>
  );
}
```

## 10. CSP

- Nova không chèn `<script>`, `<style>` hay script khởi tạo theme inline.
- Hồ sơ CSP-A đã được kiểm trên fixture production (Vite CSR, và Next.js SSR với nonce theo từng request) ở Chromium, Firefox và WebKit: 0 vi phạm ở chế độ enforce.
- Giới hạn đã công bố: CSP-A cần `style-src-attr 'unsafe-inline'` vì Base UI đặt thuộc tính `style` cho input ẩn của Checkbox, Switch và RadioGroup, kể cả trong markup SSR. Ứng dụng bắt buộc `style-src-attr 'none'` chưa được hỗ trợ ở P0. Chi tiết ở [giới hạn CSP](p0-architecture.vi.md#9-csp).

## 11. Bằng chứng và giới hạn còn mở

- Kiểm tự động cục bộ: unit, SSR, trình duyệt trên ba engine, fixture production Vite và Next.js, kiểm package, CSS, cô lập bundle và provenance.
- Chưa có: năm dòng kiểm thủ công (zoom 200%, trình đọc màn hình NVDA và VoiceOver, gõ Telex/VNI thật, trạng thái mixed với trình đọc màn hình) chưa được chủ sở hữu xác nhận; CI từ xa chưa chạy; P0 này chưa được publish.
- Kiến trúc và quy ước chung: [architecture-and-conventions.vi.md](architecture-and-conventions.vi.md).
