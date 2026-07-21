// A muted, desaturated palette (not neon) so many overlapping course blocks stay
// legible on a calendar grid. Cycled in order as courses are added to a schedule.
export const COURSE_PALETTE = [
  '#3D6E8C', // denim blue
  '#B4633B', // clay/rust
  '#4C7A5E', // sage green
  '#8A5A8C', // plum
  '#A98B2E', // mustard/ochre
  '#5C6B8A', // slate blue
  '#9C4B4B', // brick red
  '#3E8A82', // teal
  '#8C5B3D', // umber
  '#6B7A3D', // olive
  '#A15C7A', // dusty rose
  '#4A5A6B', // steel
];

export function colorForIndex(i) {
  return COURSE_PALETTE[i % COURSE_PALETTE.length];
}
