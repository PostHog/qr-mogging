'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ImagePlus, Link2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  type QrResult,
} from '@/lib/qr-code';

type LogoChoice = { src: string; name: string; isDefault: boolean };
type RenderState = {
  url: string;
  logoSource: string;
  logoSize: number;
  result: QrResult | null;
  error?: QrError;
};
type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};
const defaultLogo: LogoChoice = {
  src: '/posthog-logomark.png',
  name: 'PostHog logomark',
  isDefault: true,
};

export default function Home() {
  const [inputUrl, setInputUrl] = useState('posthog.com');
  const [logo, setLogo] = useState<LogoChoice>(defaultLogo);
  const [logoSize, setLogoSize] = useState(DEFAULT_LOGO_SIZE);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [renderState, setRenderState] = useState<RenderState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadVersion = useRef(0);
  const normalized = useMemo(() => normalizeUrl(inputUrl), [inputUrl]);
  const result = readyQr(
    renderState?.result ?? null,
    normalized.url,
    logo.src,
    logoSize,
  );
  const renderError =
    renderState?.url === normalized.url &&
    renderState.logoSource === logo.src &&
    renderState.logoSize === logoSize
      ? renderState.error
      : undefined;
  const urlError =
    normalized.error ||
    (renderError?.kind === 'capacity' ? renderError.message : '');
  const previewError =
    renderError?.kind !== 'capacity' ? renderError?.message : '';
  const isReady = Boolean(result) && !isUploading;
  const status = urlError
    ? 'Check URL'
    : previewError
      ? 'Check image'
      : isUploading
        ? 'Checking image…'
        : isReady
          ? 'Ready'
          : 'Updating…';

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'prepare_qr_code',
          title: 'Prepare QR code',
          description:
            'Set a web URL in the QR maker and prepare its live QR code preview.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The http or https URL to encode.',
              },
            },
            required: ['url'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            const value = (input as { url?: unknown })?.url;
            if (typeof value !== 'string')
              throw new Error('url must be a string');
            const prepared = normalizeUrl(value);
            if (!prepared.url) throw new Error(prepared.error);
            setInputUrl(prepared.url);
            return { status: 'updating', url: prepared.url };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  useEffect(() => {
    if (!normalized.url) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void renderQrCode(normalized.url, logo.src, logoSize)
        .then((completed) => {
          if (active)
            setRenderState({
              url: normalized.url,
              logoSource: logo.src,
              logoSize,
              result: completed,
            });
        })
        .catch((error: unknown) => {
          if (active)
            setRenderState({
              url: normalized.url,
              logoSource: logo.src,
              logoSize,
              result: null,
              error:
                error instanceof QrError
                  ? error
                  : new QrError(
                      'render',
                      'The QR code could not be generated. Try again.',
                    ),
            });
        });
    }, 100);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [logo.src, normalized.url, logoSize]);

  const chooseFile = async (file?: File) => {
    if (!file) return;
    const version = ++uploadVersion.current;
    setIsUploading(true);
    setUploadError('');
    try {
      const source = await readImageFile(file);
      await loadImage(source);
      if (version === uploadVersion.current) {
        setLogo({ src: source, name: file.name, isDefault: false });
      }
    } catch (error) {
      if (version === uploadVersion.current) {
        setUploadError(
          `${error instanceof Error ? error.message : 'This image could not be opened.'} Your previous image is still selected.`,
        );
      }
    } finally {
      if (version === uploadVersion.current) setIsUploading(false);
    }
  };

  const resetLogo = () => {
    uploadVersion.current += 1;
    setLogo(defaultLogo);
    setIsUploading(false);
    setUploadError('');
  };

  const downloadQr = () => {
    if (!result || !isReady) return;
    const hostname = new URL(result.url).hostname
      .replace(/^www\./, '')
      .replace(/[^a-z0-9.-]/gi, '-');
    const link = document.createElement('a');
    link.href = result.dataUrl;
    link.download = `qr-${hostname || 'code'}.png`;
    link.click();
  };

  return (
    <div className="app-shell">
      <header className="app-bar">
        <div className="app-bar-inner">
          <a
            className="posthog-brand"
            href="#top"
            aria-label="PostHog internal tools"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/posthog-logo.svg"
              alt="PostHog"
              width="112"
              height="24"
            />
          </a>
          <span className="internal-tools-label">Internal tools</span>
        </div>
      </header>
      <main className="workspace" id="top">
        <div className="page-heading">
          <h1>QR Mogging</h1>
          <p>Make prettier QR codes fastererer</p>
        </div>
        <section className="maker-grid" aria-label="QR Mogging">
          <div className="control-panel">
            <div className="url-section">
              <label className="field-label" htmlFor="destination-url">
                URL
              </label>
              <div className="url-field-wrap">
                <Link2 size={18} aria-hidden="true" />
                <Input
                  id="destination-url"
                  className="url-field"
                  value={inputUrl}
                  onChange={(event) => setInputUrl(event.target.value)}
                  placeholder="posthog.com"
                  inputMode="url"
                  autoComplete="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={Boolean(urlError)}
                  aria-describedby="url-help"
                />
              </div>
              <p
                className={`field-message${urlError ? ' error' : ''}`}
                id="url-help"
                role={urlError ? 'alert' : undefined}
              >
                {urlError || 'https:// is added when needed.'}
              </p>
            </div>
            <section className="image-section" aria-labelledby="image-heading">
              <div className="image-heading">
                <h2 id="image-heading" className="field-label">
                  Center image
                </h2>
                {!logo.isDefault && (
                  <button
                    type="button"
                    className="reset-button"
                    onClick={resetLogo}
                    aria-label="Reset to PostHog logomark"
                  >
                    <RotateCcw size={14} aria-hidden="true" /> Reset
                  </button>
                )}
              </div>
              <div
                className="upload-card"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void chooseFile(event.dataTransfer.files[0]);
                }}
              >
                <div className="logo-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo.src} alt="" />
                </div>
                <div className="upload-copy">
                  <strong title={logo.name}>
                    {logo.isDefault ? 'PostHog' : logo.name}
                  </strong>
                  <span>
                    {logo.isDefault ? 'Default logo' : 'Custom image'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="upload-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus aria-hidden="true" /> Choose image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={(event) => {
                    void chooseFile(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                  aria-label="Choose a custom center image"
                />
              </div>
              <p className="field-message">
                PNG, JPG, WebP, GIF or SVG · Up to 5 MB
              </p>
              {uploadError && (
                <p className="field-message error" role="alert">
                  {uploadError}
                </p>
              )}
              <div className="image-size-control">
                <label htmlFor="image-size">Image size</label>
                <input
                  id="image-size"
                  type="range"
                  min={MIN_LOGO_SIZE}
                  max={MAX_LOGO_SIZE}
                  step={1}
                  value={logoSize}
                  onChange={(event) => setLogoSize(Number(event.target.value))}
                  aria-valuetext={`${logoSize} percent of the QR width`}
                  aria-describedby="image-size-help"
                />
                <output htmlFor="image-size">{logoSize}%</output>
              </div>
              <p className="field-message" id="image-size-help">
                {logoSize > 25
                  ? 'Larger images can be harder to scan. Test before printing.'
                  : '22% recommended. Scan-test before printing.'}
              </p>
            </section>
          </div>
          <aside className="preview-panel" aria-label="QR code preview">
            <div className="preview-titlebar">
              <h2>Preview</h2>
              <output
                className={`ready-pill${isReady ? ' ready' : ''}`}
                aria-live="polite"
              >
                <span aria-hidden="true" />
                {status}
              </output>
            </div>
            <div className="preview-body">
              <div
                className="qr-stage"
                aria-busy={!isReady && !urlError && !previewError}
              >
                {result ? (
                  // eslint-disable-next-line @next/next/no-img-element -- The preview is the exact generated PNG used for download.
                  <img
                    className="qr-image"
                    src={result.dataUrl}
                    width="1080"
                    height="1080"
                    alt={`QR code for ${result.url}`}
                  />
                ) : (
                  <p className="preview-placeholder">
                    {urlError
                      ? 'Add a valid web URL to see your code.'
                      : previewError || 'Making your QR code…'}
                  </p>
                )}
              </div>
              {previewError && (
                <p className="field-message error" role="alert">
                  {previewError}
                </p>
              )}
              <p className="encoded-url" title={result?.url}>
                <Link2 size={14} aria-hidden="true" />
                <span>
                  {result?.url ||
                    (urlError
                      ? 'Waiting for a valid URL'
                      : 'Updating preview…')}
                </span>
              </p>
              <Button
                type="button"
                className="download-button"
                onClick={downloadQr}
                disabled={!isReady}
              >
                <ArrowDownToLine aria-hidden="true" /> Download PNG
              </Button>
              <p className="quality-note">
                1080 × 1080 px · High error correction
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
