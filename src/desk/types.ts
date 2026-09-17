export type WindowId = 'about' | 'work' | 'photos' | 'writing' | 'travel'
export type DeskItem = {
  id: string
  kind: 'image' | 'polaroid' | 'folder' | 'calendar' | 'name'
  src?: string; photo?: string; caption?: string
  x: number; y: number; r: number; w: number
  opens?: WindowId; label?: string
}
