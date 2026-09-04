import qrcode from "./vendor/qrcode.js";

export const CANVAS_SIZE = 1080;
export const DEFAULT_LOGO_SIZE = 22;
export const MIN_LOGO_SIZE = 10;
export const MAX_LOGO_SIZE = 30;
const QUIET_ZONE = 4;

export class QrError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

export function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return { url: "", error: "Add a URL to make your QR code." };

  const scheme = trimmed.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  const hostWithPort = /^[^/?#:@]+:\d+(?:[/?#]|$)/.test(trimmed);
  if (scheme && !hostWithPort && !["http", "https"].includes(scheme)) {
    return { url: "", error: "Use an http or https URL." };
  }
  if (scheme && ["http", "https"].includes(scheme) && !/^https?:\/\//i.test(trimmed)) {
    return { url: "", error: "Add // after http: or https:." };
  }

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/\//, "")}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.username || parsed.password) {
      return {
        url: "",
        error: "Use a web URL without a username or password.",
      };
    }
    return { url: parsed.toString(), error: "" };
  } catch {
    return { url: "", error: "That URL does not look quite right." };
  }
}

export function readyQr(result, url, logoSource, logoSize = DEFAULT_LOGO_SIZE) {
  return result?.url === url && result.logoSource === logoSource && result.logoSize === logoSize
    ? result
    : null;
}

export function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new QrError("image", "This image has no visible size. Choose another image."));
      } else {
        resolve(image);
      }
    };
    image.onerror = () =>
      reject(new QrError("image", "This image could not be opened. Choose another image."));
    image.src = source;
  });
}

export function readImageFile(file) {
  const types = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
  if (!types.includes(file.type)) {
    return Promise.reject(new QrError("image", "Choose a PNG, JPG, WebP, GIF, or SVG image."));
  }
  if (file.size > 5 * 1024 * 1024) {
    return Promise.reject(new QrError("image", "Choose an image smaller than 5 MB."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new QrError("image", "This image could not be read. Try another file."));
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new QrError("image", "This image could not be read. Try another file."));
    };
    reader.readAsDataURL(file);
  });
}

export async function renderQrCode(url, logoSource, logoSize = DEFAULT_LOGO_SIZE) {
  if (!Number.isFinite(logoSize) || logoSize < MIN_LOGO_SIZE || logoSize > MAX_LOGO_SIZE) {
    throw new QrError(
      "render",
      `Choose an image size between ${MIN_LOGO_SIZE}% and ${MAX_LOGO_SIZE}%.`,
    );
  }
  const code = qrcode(0, "H");
  try {
    code.addData(url);
    code.make();
  } catch {
    throw new QrError("capacity", "This URL is too long for a QR code. Try a shorter link.");
  }
  const image = await loadImage(logoSource);
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new QrError("render", "The QR preview could not be drawn. Try reloading.");

  const modules = code.getModuleCount();
  const cells = modules + QUIET_ZONE * 2;
  const moduleSize = Math.floor(CANVAS_SIZE / cells);
  const offset = Math.floor((CANVAS_SIZE - moduleSize * cells) / 2);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  context.fillStyle = "#171615";
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (code.isDark(row, column)) {
        context.fillRect(
          offset + (column + QUIET_ZONE) * moduleSize,
          offset + (row + QUIET_ZONE) * moduleSize,
          moduleSize,
          moduleSize,
        );
      }
    }
  }

  const codeArea = modules * moduleSize;
  const badgeSize = Math.round((codeArea * logoSize) / 100);
  const plateSize = Math.round((codeArea * (logoSize + 4.5)) / 100);
  context.fillStyle = "#fff";
  context.beginPath();
  context.roundRect(
    (CANVAS_SIZE - plateSize) / 2,
    (CANVAS_SIZE - plateSize) / 2,
    plateSize,
    plateSize,
    plateSize * 0.2,
  );
  context.fill();
  const scale = badgeSize / Math.max(image.naturalWidth, image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (CANVAS_SIZE - width) / 2, (CANVAS_SIZE - height) / 2, width, height);
  return { url, logoSource, logoSize, dataUrl: canvas.toDataURL("image/png") };
}
