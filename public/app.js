import {
  DEFAULT_LOGO_SIZE,
  MIN_LOGO_SIZE,
  MAX_LOGO_SIZE,
  loadImage,
  normalizeUrl,
  QrError,
  readyQr,
  readImageFile,
  renderQrCode,
} from "./qr-code.js";

const element = (id) => document.getElementById(id);
const urlInput = element("destination-url");
const sizeInput = element("image-size");
const fileInput = element("image-file");
const defaultLogo = { src: "posthog-logomark.png", name: "PostHog logomark", isDefault: true };
let logo = defaultLogo;
let result = null;
let renderError = null;
let isUploading = false;
let uploadVersion = 0;
let renderVersion = 0;
let renderTimer;

sizeInput.min = MIN_LOGO_SIZE;
sizeInput.max = MAX_LOGO_SIZE;
sizeInput.value = DEFAULT_LOGO_SIZE;

function currentResult() {
  return readyQr(result, normalizeUrl(urlInput.value).url, logo.src, Number(sizeInput.value));
}

function showError(id, message) {
  const target = element(id);
  target.textContent = message || "";
  target.hidden = !message;
}

function updateView() {
  const normalized = normalizeUrl(urlInput.value);
  const completed = currentResult();
  const isReady = Boolean(completed) && !isUploading;
  const urlError =
    normalized.error || (renderError?.kind === "capacity" ? renderError.message : "");
  const previewError = renderError?.kind !== "capacity" ? renderError?.message : "";
  const size = Number(sizeInput.value);
  const caution = size > 25;

  urlInput.setAttribute("aria-invalid", Boolean(urlError));
  element("url-help").textContent = urlError || "https:// is added when needed.";
  element("url-help").classList.toggle("error", Boolean(urlError));
  if (urlError) element("url-help").setAttribute("role", "alert");
  else element("url-help").removeAttribute("role");

  element("logo-preview").src = logo.src;
  element("logo-name").textContent = logo.isDefault ? "PostHog" : logo.name;
  element("logo-name").title = logo.name;
  element("logo-kind").textContent = logo.isDefault ? "Default logo" : "Custom image";
  element("reset-logo").hidden = logo.isDefault;
  element("image-size-value").textContent = `${size}%`;
  sizeInput.setAttribute("aria-valuetext", `${size} percent of the QR width`);
  element("image-size-help").classList.toggle("caution", caution);
  element("image-size-help").textContent = caution
    ? "Larger images can be harder to scan. Test before printing."
    : "22% recommended. Scan-test before printing.";

  element("qr-stage").setAttribute("aria-busy", !isReady && !urlError && !previewError);
  const preview = element("qr-preview");
  preview.hidden = !isReady;
  if (isReady) {
    preview.src = completed.dataUrl;
    preview.alt = `QR code for ${completed.url}`;
  } else {
    preview.removeAttribute("src");
  }
  element("preview-placeholder").hidden = isReady;
  element("preview-placeholder").textContent = urlError
    ? "Add a valid web URL to see your code."
    : previewError || (isUploading ? "Checking image…" : "Making your QR code…");
  showError("preview-error", previewError);
  element("encoded-url").title = normalized.url;
  element("encoded-url-text").textContent =
    normalized.url || "Waiting for a valid URL";
  element("download-qr").disabled = !isReady;
}

function scheduleRender() {
  const version = ++renderVersion;
  clearTimeout(renderTimer);
  renderError = null;
  updateView();
  const { url } = normalizeUrl(urlInput.value);
  if (!url) return;
  const source = logo.src;
  const size = Number(sizeInput.value);
  renderTimer = setTimeout(async () => {
    try {
      const completed = await renderQrCode(url, source, size);
      if (version !== renderVersion) return;
      result = completed;
    } catch (error) {
      if (version !== renderVersion) return;
      result = null;
      renderError =
        error instanceof QrError
          ? error
          : new QrError("render", "The QR code could not be generated. Try again.");
    }
    updateView();
  }, 100);
}

async function chooseFile(file) {
  if (!file) return;
  const version = ++uploadVersion;
  isUploading = true;
  showError("upload-error", "");
  updateView();
  try {
    const source = await readImageFile(file);
    await loadImage(source);
    if (version !== uploadVersion) return;
    logo = { src: source, name: file.name, isDefault: false };
    scheduleRender();
  } catch (error) {
    if (version === uploadVersion) {
      showError(
        "upload-error",
        `${error instanceof Error ? error.message : "This image could not be opened."} Your previous image is still selected.`,
      );
    }
  } finally {
    if (version === uploadVersion) {
      isUploading = false;
      updateView();
    }
  }
}

urlInput.addEventListener("input", scheduleRender);
sizeInput.addEventListener("input", scheduleRender);
element("choose-image").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  void chooseFile(fileInput.files[0]);
  fileInput.value = "";
});
element("upload-card").addEventListener("dragover", (event) => event.preventDefault());
element("upload-card").addEventListener("drop", (event) => {
  event.preventDefault();
  void chooseFile(event.dataTransfer.files[0]);
});
element("reset-logo").addEventListener("click", () => {
  uploadVersion += 1;
  logo = defaultLogo;
  isUploading = false;
  showError("upload-error", "");
  scheduleRender();
});
element("download-qr").addEventListener("click", () => {
  const completed = currentResult();
  if (!completed || isUploading) return;
  const hostname = new URL(completed.url).hostname
    .replace(/^www\./, "")
    .replace(/[^a-z0-9.-]/gi, "-");
  const link = document.createElement("a");
  link.href = completed.dataUrl;
  link.download = `qr-${hostname || "code"}.png`;
  link.click();
});

const context = document.modelContext;
if (context?.registerTool) {
  try {
    void Promise.resolve(
      context.registerTool({
        name: "prepare_qr_code",
        title: "Prepare QR code",
        description: "Set a web URL in the QR maker and prepare its live QR code preview.",
        inputSchema: {
          type: "object",
          properties: { url: { type: "string", description: "The http or https URL to encode." } },
          required: ["url"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (typeof input?.url !== "string") throw new Error("url must be a string");
          const prepared = normalizeUrl(input.url);
          if (!prepared.url) throw new Error(prepared.error);
          urlInput.value = prepared.url;
          scheduleRender();
          return { status: "updating", url: prepared.url };
        },
      }),
    ).catch(() => undefined);
  } catch {}
}

scheduleRender();
