import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import SignatureInput from '../src/components/SignatureInput';

const state = vi.hoisted(() => ({instances: [] as Array<{
  clear: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn>;
  toDataURL: ReturnType<typeof vi.fn>; listeners: Map<string, () => void>;
}>}));
vi.mock('signature_pad', () => ({default: class {
  clear = vi.fn(); off = vi.fn(); toDataURL = vi.fn(() => 'data:image/png;base64,stroke');
  listeners = new Map<string, () => void>();
  addEventListener = vi.fn((name: string, listener: () => void) => this.listeners.set(name, listener));
  removeEventListener = vi.fn((name: string) => this.listeners.delete(name));
  constructor() { state.instances.push(this); }
}}));
let width = 320;
let height = 170;
let drawImage: ReturnType<typeof vi.fn>;
let images: Array<{width: number; height: number; src: string; onload?: () => void}>;
beforeEach(() => {
  state.instances.length = 0; width = 320; height = 170; images = [];
  drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({scale: vi.fn(), drawImage} as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'offsetWidth', 'get').mockImplementation(() => width);
  vi.spyOn(HTMLCanvasElement.prototype, 'offsetHeight', 'get').mockImplementation(() => height);
  vi.stubGlobal('Image', class {width = 640; height = 340; src = ''; onload?: () => void; constructor() {images.push(this);}});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('assinaturas sem acúmulo de eventos', () => {
  it('mantém uma instância e usa callback atual em vários traços/rerenders', () => {
    const saved = vi.fn(); const nextSave = vi.fn();
    const {rerender} = render(<SignatureInput onSave={saved}/>);
    const pad = state.instances[0];
    for (let i = 0; i < 5; i++) {
      pad.toDataURL.mockReturnValue(`data:image/png;base64,stroke${i}`);
      act(() => pad.listeners.get('endStroke')!());
      rerender(<SignatureInput onSave={saved} initialValue={`data:image/png;base64,stroke${i}`}/>);
    }
    expect(saved).toHaveBeenCalledTimes(5);
    expect(state.instances).toHaveLength(1);
    expect(pad.addEventListener).toHaveBeenCalledTimes(1);
    rerender(<SignatureInput onSave={nextSave} initialValue="data:image/png;base64,stroke4"/>);
    act(() => pad.listeners.get('endStroke')!());
    expect(nextSave).toHaveBeenCalledTimes(1);
    expect(images).toHaveLength(0); // emitted strokes are not asynchronously reloaded
  });
  it('remove endStroke, resize e desativa pad ao desmontar', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const {unmount} = render(<SignatureInput onSave={vi.fn()}/>);
    const pad = state.instances[0]; const listener = pad.listeners.get('endStroke');
    unmount();
    expect(pad.removeEventListener).toHaveBeenCalledWith('endStroke', listener);
    expect(pad.off).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(pad.listeners.size).toBe(0);
  });
  it('limpa assinatura e impede carga atrasada de restaurar assinatura apagada', () => {
    const saved = vi.fn();
    render(<SignatureInput onSave={saved} initialValue="data:image/png;base64,old"/>);
    expect(images).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', {name: 'Limpar'}));
    drawImage.mockClear(); act(() => images[0].onload?.());
    expect(drawImage).not.toHaveBeenCalled();
    expect(saved).toHaveBeenLastCalledWith('');
    expect(state.instances[0].clear).toHaveBeenCalled();
  });
  it('preserva a imagem original do histórico em rotações repetidas', () => {
    render(<SignatureInput onSave={vi.fn()} initialValue="data:image/png;base64,history"/>);
    act(() => images[0].onload?.());
    expect(drawImage).toHaveBeenLastCalledWith(images[0], 0, 0, 320, 170);
    width = 640; height = 170; fireEvent(window, new Event('resize'));
    width = 320; height = 170; fireEvent(window, new Event('resize'));
    expect(drawImage).toHaveBeenLastCalledWith(images[0], 0, 0, 320, 170);
    expect(state.instances).toHaveLength(1);
  });
  it('preserva bitmap do último traço na rotação', () => {
    render(<SignatureInput onSave={vi.fn()}/>);
    act(() => state.instances[0].listeners.get('endStroke')!());
    drawImage.mockClear(); width = 640; fireEvent(window, new Event('resize'));
    const source = drawImage.mock.calls[0][0];
    expect(source).toBeInstanceOf(HTMLCanvasElement);
    width = 320; fireEvent(window, new Event('resize'));
    expect(drawImage).toHaveBeenLastCalledWith(source, 0, 0, 320, 170);
  });
});
