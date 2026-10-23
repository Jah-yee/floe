// @vitest-environment jsdom
/**
 * The share panel's copy marks. Each copy shows its check for 1.5 s from that
 * copy, the way the Request link's Copy link does: a second copy inside the
 * window keeps its check for its own 1.5 s, and the panel, which unmounts when
 * the receiver joins, leaves no timer behind. It also covers the QR button's
 * accessible name and its expanded state.
 */
import {act} from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import SharePanel from './SharePanel';

const LINK = 'http://localhost:3000/#room=x';
// The copy handler awaits the clipboard; two microtask turns let it finish.
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const check = (name: string) => screen.getByRole('button', {name}).querySelector('svg.lucide-check');

describe('the copy marks', () => {
    beforeEach(() => { vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']}); });
    afterEach(() => { vi.useRealTimers(); });

    it('a second copy keeps its check for 1.5 s from that copy', async () => {
        render(<SharePanel code="amber-otter-cloud" link={LINK}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Copy code'}));
        await flush();
        expect(check('Copy code')).not.toBeNull();
        act(() => { vi.advanceTimersByTime(1000); });
        fireEvent.click(screen.getByRole('button', {name: 'Copy link'}));
        await flush();
        expect(check('Copy link')).not.toBeNull();
        act(() => { vi.advanceTimersByTime(600); });
        expect(check('Copy link')).not.toBeNull();
        act(() => { vi.advanceTimersByTime(900); });
        expect(check('Copy link')).toBeNull();
    });

    it('an unmounted panel leaves no timer behind', async () => {
        const {unmount} = render(<SharePanel code="amber-otter-cloud" link={LINK}/>);
        fireEvent.click(screen.getByRole('button', {name: 'Copy link'}));
        await flush();
        expect(vi.getTimerCount()).toBe(1);
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });
});

describe('the QR button', () => {
    it('is named by its words and says whether the QR is open', async () => {
        const user = userEvent.setup();
        render(<SharePanel code="amber-otter-cloud" link={LINK}/>);

        const show = screen.getByRole('button', {name: 'Show QR'});
        expect(show.getAttribute('aria-expanded')).toBe('false');
        expect(show.hasAttribute('aria-controls')).toBe(false);
        expect(show.hasAttribute('aria-pressed')).toBe(false);
        expect(screen.queryByText('Scan to receive files')).toBeNull();

        await user.click(show);
        const hide = screen.getByRole('button', {name: 'Hide QR'});
        expect(hide.getAttribute('aria-expanded')).toBe('true');
        const panel = document.getElementById(hide.getAttribute('aria-controls')!);
        expect(panel?.textContent).toContain('Scan to receive files');

        await user.click(hide);
        expect(screen.getByRole('button', {name: 'Show QR'}).getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByText('Scan to receive files')).toBeNull();
    });
});
