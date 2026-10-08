import { act, cleanup, render, screen } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '../../i18n/en.js';
import { vi as viCatalog } from '../../i18n/vi.js';
import { NovaProvider } from '../../providers/nova/index.js';
import { Avatar, AvatarGroup } from './index.js';

/** Controllable stand-in for the image probe Base UI creates with `new window.Image()`. */
class FakeImage {
  static instances: FakeImage[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  complete = false;
  naturalWidth = 0;
  src = '';
  crossOrigin: string | null = null;
  constructor() {
    FakeImage.instances.push(this);
  }
}

const probe = (src: string) => FakeImage.instances.filter((image) => image.src.endsWith(src)).at(-1)!;

beforeEach(() => {
  FakeImage.instances = [];
  vi.stubGlobal('Image', FakeImage);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Avatar (C03-AC01)', () => {
  it('image error shows NA and keeps size', () => {
    const { container } = render(<Avatar name="Nguyễn An" src="/a.png" size="lg" />);
    const root = container.firstElementChild!;
    act(() => probe('/a.png').onerror!());
    expect(root.textContent).toBe('NA');
    expect(root.querySelector('img')).toBeNull();
    expect(root.className).toContain('nova-avatar--lg');
  });

  it('loaded image replaces initials without announcing them twice', () => {
    render(<Avatar name="Nguyễn An" src="/ok.png" />);
    act(() => probe('/ok.png').onload!());
    const avatar = screen.getByRole('img', { name: 'Nguyễn An' });
    const image = avatar.querySelector('img');
    expect(image?.getAttribute('alt')).toBe('');
    expect(avatar.textContent).toBe('');
  });

  it('src change resets failure', () => {
    const view = render(<Avatar name="An" src="/broken.png" />);
    act(() => probe('/broken.png').onerror!());
    expect(view.container.querySelector('img')).toBeNull();
    view.rerender(<Avatar name="An" src="/fixed.png" />);
    act(() => probe('/fixed.png').onload!());
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/fixed.png');
  });

  it('alt overrides the accessible name', () => {
    render(<Avatar name="Nguyễn An" alt="Ảnh đại diện của An" />);
    expect(screen.getByRole('img', { name: 'Ảnh đại diện của An' })).toBeTruthy();
  });

  it('forwards ref to the root span', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Avatar ref={ref} name="An" />);
    expect(ref.current?.tagName).toBe('SPAN');
  });
});

describe('initials (C03-AC02)', () => {
  it('grapheme initials: ZWJ emoji and Vietnamese marks are never split', () => {
    const family = '👨‍👩‍👧';
    const view = render(<Avatar name={`${family} Gia`} />);
    expect(view.container.textContent).toBe(`${family}G`);
    view.rerender(<Avatar name="đặng ánh" />);
    expect(view.container.textContent).toBe('ĐÁ');
  });

  it('empty name shows icon with localized label', () => {
    const view = render(<Avatar name="   " />);
    const avatar = screen.getByRole('img', { name: viCatalog.common.avatarUnknown });
    expect(avatar.querySelector('svg')).not.toBeNull();
    expect(avatar.textContent).toBe('');
    view.rerender(<NovaProvider locale="en"><Avatar name="" /></NovaProvider>);
    expect(screen.getByRole('img', { name: en.common.avatarUnknown })).toBeTruthy();
  });
});

describe('decorative and SSR (C03-AC03)', () => {
  it('decorative is aria-hidden and has no image role', () => {
    const { container } = render(<Avatar name="Nguyễn An" decorative />);
    const root = container.firstElementChild!;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.getAttribute('role')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('server and client initials match; hydration has 0 recoverable errors', () => {
    const tree = <NovaProvider><Avatar name="Élise Ánh" src="/x.png" /><Avatar name="" /></NovaProvider>;
    const container = document.createElement('div');
    container.innerHTML = renderToString(tree);
    document.body.append(container);
    const serverText = container.textContent;
    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => { hydrateRoot(container, tree, { onRecoverableError }); });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(container.textContent).toBe(serverText);
    expect(serverText).toBe('ÉÁ');
    container.remove();
  });
});

describe('AvatarGroup', () => {
  const five = ['An', 'Bình', 'Chi', 'Dũng', 'Em'].map((name) => <Avatar key={name} name={name} />);

  it('max=2 of 5 shows 2 and +3 with plural accessible text', () => {
    render(<NovaProvider locale="en"><AvatarGroup label="Thành viên" max={2}>{five}</AvatarGroup></NovaProvider>);
    const group = screen.getByRole('group', { name: 'Thành viên' });
    expect(group.querySelectorAll('.nova-avatar:not(.nova-avatar--overflow)')).toHaveLength(2);
    const overflow = screen.getByRole('img', { name: 'and 3 more people' });
    expect(overflow.textContent).toBe('+3');
  });

  it('singular overflow uses the one form', () => {
    render(<NovaProvider locale="en"><AvatarGroup label="g" max={4}>{five}</AvatarGroup></NovaProvider>);
    expect(screen.getByRole('img', { name: 'and 1 more person' })).toBeTruthy();
  });

  it('max is floored and max ≥ count shows everything without overflow', () => {
    const view = render(<AvatarGroup label="g" max={2.9}>{five}</AvatarGroup>);
    expect(screen.getByText('+3')).toBeTruthy();
    view.rerender(<AvatarGroup label="g" max={5}>{five}</AvatarGroup>);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it.each([0, 0.5, -1, Number.NaN, Number.POSITIVE_INFINITY])('non-finite or < 1 max %s shows all with diagnostic', (max) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<AvatarGroup label="g" max={max}>{five}</AvatarGroup>);
    expect(screen.queryByText(/^\+/)).toBeNull();
    expect(screen.getAllByRole('img')).toHaveLength(5);
    expect(warn.mock.calls.some(([message]) => String(message).includes('NOVA_AVATAR_INVALID_MAX'))).toBe(true);
  });
});

// transparent Fragments in AvatarGroup.
describe('AvatarGroup flattens Fragments before counting', () => {
  const names = ['An', 'Bình', 'Chi', 'Dũng', 'Em'];

  it('five avatars inside a Fragment with max=2 show 2 and +3', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<AvatarGroup label="g" max={2}><>{names.map((name) => <Avatar key={name} name={name} />)}</></AvatarGroup>);
    expect(screen.getAllByRole('img').filter((element) => !element.textContent?.startsWith('+'))).toHaveLength(2);
    expect(screen.getByText('+3')).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('nested Fragments and arrays are flattened with stable keys', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const view = render(
      <AvatarGroup label="g" max={3}>
        <><Avatar name="An" /><>{[<Avatar key="b" name="Bình" />, <Avatar key="c" name="Chi" />]}</></>
        <Avatar name="Dũng" />
      </AvatarGroup>,
    );
    expect(screen.getByText('+1')).toBeTruthy();
    view.rerender(
      <AvatarGroup label="g" max={3}>
        <><Avatar name="An" /><>{[<Avatar key="b" name="Bình" />, <Avatar key="c" name="Chi" />]}</></>
        <Avatar name="Dũng" />
      </AvatarGroup>,
    );
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('a non-Fragment wrapper stays one item (no DOM recursion)', () => {
    render(<AvatarGroup label="g" max={1}><span data-testid="wrapper"><Avatar name="An" /><Avatar name="Bình" /></span><Avatar name="Chi" /></AvatarGroup>);
    expect(screen.getByTestId('wrapper').querySelectorAll('[role="img"]')).toHaveLength(2);
    expect(screen.getByText('+1')).toBeTruthy();
  });
});

// item identity across Fragment wrapping
// and collision-free key paths, asserted on DOM nodes and local state.
describe('AvatarGroup item identity (round 2 R20)', () => {
  function Counter({ id }: { id: string }) {
    const [count, setCount] = useState(0);
    return <button type="button" data-testid={id} onClick={() => setCount((value) => value + 1)}>{`${id}:${count}`}</button>;
  }

  it('an unkeyed one-level Fragment wrap keeps the DOM node and local state (React semantics)', () => {
    const view = render(<AvatarGroup label="g"><Counter key="a" id="a" /></AvatarGroup>);
    const node = screen.getByTestId('a');
    act(() => node.click());
    view.rerender(<AvatarGroup label="g"><><Counter key="a" id="a" /></></AvatarGroup>);
    expect(screen.getByTestId('a')).toBe(node);
    expect(node.textContent).toBe('a:1');
    view.rerender(<AvatarGroup label="g"><Counter key="a" id="a" /></AvatarGroup>);
    expect(screen.getByTestId('a')).toBe(node);
    expect(node.textContent).toBe('a:1');
  });

  it('distinct Fragment/child key paths never share a key', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AvatarGroup label="g">
        {[
          <Fragment key="a"><Counter key="b/.$c" id="one" /></Fragment>,
          <Fragment key="a/.$b"><Counter key="c" id="two" /></Fragment>,
          <Fragment key="a/"><Fragment key="b"><Counter key="c" id="three" /></Fragment></Fragment>,
        ]}
      </AvatarGroup>,
    );
    expect(consoleError.mock.calls.filter(([message]) => String(message).includes('same key'))).toEqual([]);
    expect(['one', 'two', 'three'].map((id) => screen.getAllByTestId(id).length)).toEqual([1, 1, 1]);
  });

  it('each key path keeps its own state when siblings are reordered', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const items = (order: string[]) => order.map((key) => (key === 'x'
      ? <Fragment key="a"><Counter key="b/.$c" id="x" /></Fragment>
      : <Fragment key="a/.$b"><Counter key="c" id="y" /></Fragment>));
    const view = render(<AvatarGroup label="g">{items(['x', 'y'])}</AvatarGroup>);
    act(() => screen.getByTestId('x').click());
    view.rerender(<AvatarGroup label="g">{items(['y', 'x'])}</AvatarGroup>);
    expect(screen.getByTestId('x').textContent).toBe('x:1');
    expect(screen.getByTestId('y').textContent).toBe('y:0');
  });
});

import { Fragment, useState } from 'react';
