import { CAM_LERP, CAM_LEAD_X, CAM_Y_OFFSET, WORLD_W, WORLD_H } from './constants';

export class Camera {
  x = 0;
  y = 0;

  update(
    playerX: number,
    playerY: number,
    playerW: number,
    playerH: number,
    viewW: number,
    viewH: number,
    facingLeft: boolean
  ) {
    const lead = facingLeft ? -CAM_LEAD_X : CAM_LEAD_X;
    const targetX = playerX + playerW / 2 - viewW / 2 + lead;
    const targetY = playerY + playerH / 2 - viewH * CAM_Y_OFFSET;

    this.x += (targetX - this.x) * CAM_LERP;
    this.y += (targetY - this.y) * CAM_LERP;

    // Clamp to world bounds
    this.x = Math.max(0, Math.min(this.x, WORLD_W - viewW));
    this.y = Math.max(0, Math.min(this.y, WORLD_H - viewH));
  }

  snap(
    playerX: number,
    playerY: number,
    playerW: number,
    playerH: number,
    viewW: number,
    viewH: number
  ) {
    this.x = Math.max(0, Math.min(playerX + playerW / 2 - viewW / 2, WORLD_W - viewW));
    this.y = Math.max(0, Math.min(playerY + playerH / 2 - viewH * CAM_Y_OFFSET, WORLD_H - viewH));
  }
}
