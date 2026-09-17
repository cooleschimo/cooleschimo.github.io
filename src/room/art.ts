/**
 * Every image slot in the room, by the names in docs/ART-BRIEF.md. When a file exists at
 * public/art/<path> it is used; otherwise the blockout draws a grey placeholder.
 * Swap art in by dropping files with these names; no code changes.
 */
/** Public art, resolved against the build base so the site works from a subfolder (previews, GitHub Pages). */
const B = import.meta.env.BASE_URL.replace(/\/$/, '')
export const ART = {
  wall: `${B}/art/room/wall.webp`, floor: `${B}/art/room/floor.webp`, entrance: `${B}/art/room/entrance.webp`,
  skyDay: `${B}/art/sky/day.webp`, skyEvening: `${B}/art/sky/evening.webp`, skyNight: `${B}/art/sky/night.webp`,
  fridgeClosed: `${B}/art/objects/fridge-closed.webp`,
  table: `${B}/art/objects/table.webp`, camera: `${B}/art/objects/camera.webp`, vase: `${B}/art/objects/vase-empty.webp`, candle: `${B}/art/objects/candle.webp`,
  notebook: `${B}/art/objects/notebook.webp`,
  foxAsleep: `${B}/art/objects/fox-asleep.webp`, foxSitting: `${B}/art/objects/fox-sitting.webp`, foxWalk1: `${B}/art/objects/fox-walking-1.webp`, foxWalk2: `${B}/art/objects/fox-walking-2.webp`,
  flower: (n: number) => `${B}/art/objects/flowers/${n}.webp`,
  magnet: (slug: string) => `${B}/art/places/${slug}/magnet.webp`,
  postcardFront: (slug: string) => `${B}/art/places/${slug}/postcard-front.webp`,
  piece: (slug: string, n: number) => `${B}/art/places/${slug}/pieces/${n}.webp`,
  sticker: (n: number) => `${B}/art/stickers/${n}.webp`,
}
