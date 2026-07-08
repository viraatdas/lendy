// Twitter card shares the exact same visual as the Open Graph image.
// Config must be declared locally (Turbopack can't statically parse re-exported
// route-segment config), but the renderer itself is reused.
import Image from './opengraph-image';

export const runtime = 'edge';
export const alt = 'Lendy — Your cozy book lending library';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default Image;
