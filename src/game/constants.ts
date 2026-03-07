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

// Dash
export const DASH_SPEED = 15;
export const DASH_FRAMES = 10;
export const DASH_COOLDOWN_FRAMES = 24;

// Ledge assist (forgiving corner climb)
export const LEDGE_ASSIST_UP_PX = 28;   // how far below top we still snap up
export const LEDGE_ASSIST_DOWN_PX = 10; // how far above top we can still grab

// Player hitbox
export const PLAYER_W = 52;
export const PLAYER_H = 62;       // collision height (fits 1-tile = 64px gaps)
export const PLAYER_DRAW_H = 80;  // visual height (sprite size)

// Camera
export const CAM_LERP = 0.1;
export const CAM_LEAD_X = 90;      // pixels ahead in facing direction
export const CAM_Y_OFFSET = 0.42;  // how far down in viewport the player sits
