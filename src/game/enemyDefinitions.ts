export type EnemyTypeId =
  | "acid_slime"
  | "stone_beetle"
  | "magma_golem"
  | "void_titan"
  | "lisaj"
  | "husenica";

export interface EnemyDefinition {
  id: EnemyTypeId;
  name: string;
  collisionDamage: number;
  movingByDefault: boolean;
  tilesW: number;
  tilesH: number;
  spriteUrl: string;
}

const acidSlimeUrl = new URL(
  "../assets/enemies/acid_slime.png",
  import.meta.url,
).href;
const stoneBeetleUrl = new URL(
  "../assets/enemies/stone_beetle.png",
  import.meta.url,
).href;
const magmaGolemUrl = new URL(
  "../assets/enemies/magma_golem.png",
  import.meta.url,
).href;
const voidTitanUrl = new URL(
  "../assets/enemies/void_titan.png",
  import.meta.url,
).href;
const lisajUrl = new URL("../assets/enemies/lisaj/Lisaj_1.png", import.meta.url)
  .href;
const husenicaUrl = new URL(
  "../assets/enemies/husenica/husenica_1.png",
  import.meta.url,
).href;

export const ENEMY_DEFINITIONS: EnemyDefinition[] = [
  {
    id: "acid_slime",
    name: "Acid Slime",
    collisionDamage: 1,
    movingByDefault: false,
    tilesW: 1,
    tilesH: 1,
    spriteUrl: acidSlimeUrl,
  },
  {
    id: "stone_beetle",
    name: "Stone Beetle",
    collisionDamage: 2,
    movingByDefault: false,
    tilesW: 2,
    tilesH: 1,
    spriteUrl: stoneBeetleUrl,
  },
  {
    id: "magma_golem",
    name: "Magma Golem",
    collisionDamage: 3,
    movingByDefault: false,
    tilesW: 2,
    tilesH: 2,
    spriteUrl: magmaGolemUrl,
  },
  {
    id: "void_titan",
    name: "Void Titan",
    collisionDamage: 4,
    movingByDefault: false,
    tilesW: 4,
    tilesH: 4,
    spriteUrl: voidTitanUrl,
  },
  {
    id: "lisaj",
    name: "Lisaj",
    collisionDamage: 1,
    movingByDefault: true,
    tilesW: 2,
    tilesH: 1,
    spriteUrl: lisajUrl,
  },
  {
    id: "husenica",
    name: "Husenica",
    collisionDamage: 2,
    movingByDefault: true,
    tilesW: 2,
    tilesH: 1,
    spriteUrl: husenicaUrl,
  },
];

export const ENEMY_BY_ID: Record<EnemyTypeId, EnemyDefinition> =
  ENEMY_DEFINITIONS.reduce(
    (acc, enemy) => {
      acc[enemy.id] = enemy;
      return acc;
    },
    {} as Record<EnemyTypeId, EnemyDefinition>,
  );
