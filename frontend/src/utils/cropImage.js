/* Crops the area defined by react-easy-crop's `croppedAreaPixels`
   out of `imageSrc` (object URL or data URL) and resolves with a
   square Blob plus a fresh object URL for previewing. */

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    /* No crossOrigin: blob: / data: URLs are same-origin. Setting
       crossOrigin="anonymous" on a blob URL has caused load failures
       in some browsers, which then drew an empty (black) canvas. */
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });

export async function getCroppedImage(imageSrc, croppedAreaPixels, mimeType = "image/png") {
  const image = await loadImage(imageSrc);
  /* `decode()` guarantees the bitmap is ready before we draw —
     `onload` alone is not always enough on some browsers. */
  if (typeof image.decode === "function") {
    try { await image.decode(); } catch { /* ignore — fallback to onload */ }
  }

  const width = Math.max(1, Math.round(croppedAreaPixels.width));
  const height = Math.max(1, Math.round(croppedAreaPixels.height));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  /* Fill white first so any transparent pixels (or a JPEG export)
     don't render as solid black. */
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    width,
    height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve({ blob, previewUrl: URL.createObjectURL(blob) });
      },
      mimeType,
      0.92
    );
  });
}

export default getCroppedImage;
