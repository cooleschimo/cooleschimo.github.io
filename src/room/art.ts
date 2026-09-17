/**
 * Every image slot in the room, by the names in docs/ART-BRIEF.md. When a file exists at
 * public/art/<path> it is used; otherwise the blockout draws a grey placeholder.
 * Swap art in by dropping files with these names; no code changes.
 */
export const ART = {
  wall: '/art/room/wall.webp', floor: '/art/room/floor.webp', entrance: '/art/room/entrance.webp',
  skyDay: '/art/sky/day.webp', skyNight: '/art/sky/night.webp',
  fridgeClosed: '/art/objects/fridge-closed.webp',
  table: '/art/objects/table.webp', camera: '/art/objects/camera.webp', vase: '/art/objects/vase-empty.webp', candle: '/art/objects/candle.webp',
  notebook: '/art/objects/notebook.webp',
  foxAsleep: '/art/objects/fox-asleep.webp', foxSitting: '/art/objects/fox-sitting.webp', foxWalk1: '/art/objects/fox-walking-1.webp', foxWalk2: '/art/objects/fox-walking-2.webp',
  flower: (n: number) => `/art/objects/flowers/${n}.webp`,
  magnet: (slug: string) => `/art/places/${slug}/magnet.webp`,
  postcardFront: (slug: string) => `/art/places/${slug}/postcard-front.webp`,
  piece: (slug: string, n: number) => `/art/places/${slug}/pieces/${n}.webp`,
  sticker: (n: number) => `/art/stickers/${n}.webp`,
}
