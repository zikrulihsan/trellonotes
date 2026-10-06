import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useUI } from '@/hooks/useUI';
import { setScreenWidth } from '@/test/match-media';
import { UIProvider } from './UIProvider';

function Probe() {
  const { sidebarVisible, narrowScreen, toggleSidebar, showSidebar, hideSidebar } = useUI(),
    navigate = useNavigate();
  return (
    <>
      <span data-testid="state">
        {narrowScreen ? 'drawer' : 'docked'} {sidebarVisible ? 'shown' : 'hidden'}
      </span>
      <button onClick={toggleSidebar}>toggle</button>
      <button onClick={showSidebar}>show</button>
      <button onClick={hideSidebar}>hide</button>
      <button onClick={() => navigate('/pages')}>pages</button>
    </>
  );
}
const renderUI = () =>
  render(
    <MemoryRouter>
      <UIProvider>
        <Probe />
      </UIProvider>
    </MemoryRouter>,
  );
const state = () => screen.getByTestId('state').textContent;
const click = (name: string) => act(() => fireEvent.click(screen.getByText(name)));

describe('sidebar visibility', () => {
  it('docks on wide screens and remembers being hidden', () => {
    const { unmount } = renderUI();
    expect(state()).toBe('docked shown');
    click('toggle');
    expect(state()).toBe('docked hidden');
    click('pages');
    expect(state()).toBe('docked hidden');
    unmount();
    renderUI();
    expect(state()).toBe('docked hidden');
    click('show');
    expect(state()).toBe('docked shown');
  });

  it('toggles with Ctrl+\\', () => {
    renderUI();
    act(() => fireEvent.keyDown(window, { key: '\\', ctrlKey: true }));
    expect(state()).toBe('docked hidden');
    act(() => fireEvent.keyDown(window, { key: '\\', metaKey: true }));
    expect(state()).toBe('docked shown');
  });

  it('uses a closed drawer on phones, closed again by Escape, navigation or widening', () => {
    setScreenWidth(390);
    renderUI();
    expect(state()).toBe('drawer hidden');
    click('toggle');
    expect(state()).toBe('drawer shown');
    act(() => fireEvent.keyDown(window, { key: 'Escape' }));
    expect(state()).toBe('drawer hidden');
    click('show');
    click('pages');
    expect(state()).toBe('drawer hidden');
    click('show');
    act(() => setScreenWidth(1280));
    expect(state()).toBe('docked shown');
    act(() => setScreenWidth(390));
    expect(state()).toBe('drawer hidden');
  });

  it('keeps the docked choice separate from the phone drawer', () => {
    renderUI();
    click('hide');
    act(() => setScreenWidth(390));
    click('show');
    expect(state()).toBe('drawer shown');
    act(() => setScreenWidth(1280));
    expect(state()).toBe('docked hidden');
  });
});
