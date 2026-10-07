/** A portrait placeholder (4:5) drawn in place: a story and a test never ask the network for a picture. */
export const popupPicture =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="oklch(0.85 0.08 60)"/><stop offset="1" stop-color="oklch(0.6 0.12 30)"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><circle cx="400" cy="420" r="180" fill="oklch(1 0 0 / 0.35)"/></svg>',
  )
