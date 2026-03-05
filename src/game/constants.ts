// World
export const TILE = 64;
export const WORLD_W = 6400;
export const WORLD_H = 1472;

// Hollow Knight-style physics
export const MOVE_SPEED = 7;
export const JUMP_VEL = -14.5;
export const JUMP_CUT_VY = -5;      // min upward vy when jump key released
export const GRAVITY_UP = 0.55;     // lighter gravity going up
export const GRAVITY_DOWN = 0.9;    // heavier gravity falling
export const MAX_FALL = 20;

// Input buffering
export const COYOTE_FRAMES = 6;
export const JUMP_BUFFER_FRAMES = 8;

// Double jump
export const DOUBLE_JUMP_VEL = -12.5;  // slightly weaker than first jump

// Player hitbox
export const PLAYER_W = 52;
export const PLAYER_H = 80;

// Camera
export const CAM_LERP = 0.1;
export const CAM_LEAD_X = 90;      // pixels ahead in facing direction
export const CAM_Y_OFFSET = 0.42;  // how far down in viewport the player sits
