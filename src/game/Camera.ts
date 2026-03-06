import { CAM_LERP, CAM_LEAD_X, CAM_Y_OFFSET } from './constants';

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
    facingLeft: boolean,
    worldW: number,
    worldH: number,
  ) {
    const lead = facingLeft ? -CAM_LEAD_X : CAM_LEAD_X;
    const targetX = playerX + playerW / 2 - viewW / 2 + lead;
    const targetY = playerY + playerH / 2 - viewH * CAM_Y_OFFSET;

    this.x += (targetX - this.x) * CAM_LERP;
    this.y += (targetY - this.y) * CAM_LERP;

    // Clamp to world bounds
    this.x = Math.max(0, Math.min(this.x, worldW - viewW));
    this.y = Math.max(0, Math.min(this.y, worldH - viewH));
  }

  snap(
    playerX: number,
    playerY: number,
    playerW: number,
    playerH: number,
    viewW: number,
    viewH: number,
    worldW: number,
    worldH: number,
  ) {
    this.x = Math.max(0, Math.min(playerX + playerW / 2 - viewW / 2, worldW - viewW));
    this.y = Math.max(0, Math.min(playerY + playerH / 2 - viewH * CAM_Y_OFFSET, worldH - viewH));
  }
}
