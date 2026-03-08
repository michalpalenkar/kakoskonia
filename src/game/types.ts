export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface SpriteSheet {
  canvas: HTMLCanvasElement;
  frames: number;
  frameW: number;
  frameH: number;
  fps: number;
}

export type AnimState = 'idle' | 'run' | 'jump' | 'fall' | 'land' | 'ledge';

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpJustPressed: boolean;
  dash: boolean;
  dashJustPressed: boolean;
  down: boolean;
}
