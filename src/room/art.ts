/**
 * Every image slot in the room, by the names in docs/ART-BRIEF.md. When a file exists at
 * public/art/<path> it is used; otherwise the blockout draws a grey placeholder.
 * Swap art in by dropping files with these names; no code changes.
 */
export const ART = {
  wall: '/art/room/wall.png', floor: '/art/room/floor.png', entrance: '/art/room/entrance.png',
  skyDay: '/art/sky/day.png', skyNight: '/art/sky/night.png',
  fridgeClosed: '/art/objects/fridge-closed.png',
  table: '/art/objects/table.png', camera: '/art/objects/camera.png', vase: '/art/objects/vase-empty.png', candle: '/art/objects/candle.png',
  notebook: '/art/objects/notebook.png',
  foxAsleep: '/art/objects/fox-asleep.png', foxSitting: '/art/objects/fox-sitting.png', foxWalk1: '/art/objects/fox-walking-1.png', foxWalk2: '/art/objects/fox-walking-2.png',
  flower: (n: number) => `/art/objects/flowers/${n}.png`,
  magnet: (slug: string) => `/art/places/${slug}/magnet.png`,
  postcardFront: (slug: string) => `/art/places/${slug}/postcard-front.png`,
  piece: (slug: string, n: number) => `/art/places/${slug}/pieces/${n}.png`,
  sticker: (n: number) => `/art/stickers/${n}.png`,
}
