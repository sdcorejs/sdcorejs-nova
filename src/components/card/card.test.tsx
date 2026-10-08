import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { Empty } from '../data-state/empty.js';
import { Skeleton } from '../data-state/skeleton.js';
import { Card, CardGroup, Section, SectionItem } from './index.js';

afterEach(cleanup);

describe('Section (C05-AC01)', () => {
  it.each([2, 3, 4] as const)('headingLevel %i renders a semantic heading', (level) => {
    render(<Section title="Thông tin" headingLevel={level}><p>body</p></Section>);
    const heading = screen.getByRole('heading', { name: 'Thông tin' });
    expect(heading.tagName).toBe(`H${level}`);
  });

  it('defaults to h2 and renders description, actions and body in order', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Section ref={ref} title="Hồ sơ" description="Mô tả" actions={<button type="button">Sửa</button>}>
        <SectionItem>Nội dung</SectionItem>
      </Section>,
    );
    expect(screen.getByRole('heading', { name: 'Hồ sơ' }).tagName).toBe('H2');
    expect(ref.current?.tagName).toBe('SECTION');
    const text = ref.current?.textContent ?? '';
    expect(text.indexOf('Hồ sơ')).toBeLessThan(text.indexOf('Mô tả'));
    expect(text.indexOf('Sửa')).toBeLessThan(text.indexOf('Nội dung'));
  });

  it('no collapse controls (C17 is separate)', () => {
    render(<Section title="T"><p>b</p></Section>);
    expect(screen.queryByRole('button')).toBeNull();
    expect(document.querySelector('[aria-expanded]')).toBeNull();
  });
});

describe('Card (C05-AC03)', () => {
  it('is a plain container: no role, no tabindex, no click handler semantics', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref} data-testid="card"><a href="/x">Chi tiết</a></Card>);
    const card = screen.getByTestId('card');
    expect(ref.current).toBe(card);
    expect(card.getAttribute('role')).toBeNull();
    expect(card.getAttribute('tabindex')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('CardGroup applies the gap token class', () => {
    render(<CardGroup gap="lg" data-testid="g"><Card>a</Card><Card>b</Card></CardGroup>);
    expect(screen.getByTestId('g').className).toContain('nova-card-group--gap-lg');
    expect(screen.getByTestId('g').children).toHaveLength(2);
  });
});

describe('Empty and Skeleton (C10 display parts)', () => {
  it('Empty renders title, description, actions and a decorative icon', () => {
    render(<Empty title="Không có tệp" description="Tải lên tệp đầu tiên" actions={<button type="button">Tải lên</button>} icon={<svg data-testid="i" />} />);
    expect(screen.getByText('Không có tệp')).toBeTruthy();
    expect(screen.getByText('Tải lên tệp đầu tiên')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tải lên' })).toBeTruthy();
    expect(screen.getByTestId('i').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('Skeleton is aria-hidden and never focusable', () => {
    const { container } = render(<><Skeleton /><Skeleton shape="circle" /></>);
    const skeletons = [...container.children];
    expect(skeletons).toHaveLength(2);
    for (const skeleton of skeletons) {
      expect(skeleton.getAttribute('aria-hidden')).toBe('true');
      expect(skeleton.getAttribute('tabindex')).toBeNull();
    }
    expect(skeletons[1]!.className).toContain('nova-skeleton--circle');
  });
});
