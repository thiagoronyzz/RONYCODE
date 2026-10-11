const $ = (id) => document.getElementById(id);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const MAX_IMAGE_SIDE = 8192;
const MAX_IMAGE_PIXELS = 16_000_000;
const HISTORY_LIMIT = 45;

const ui = {
  modeButtons: [...document.querySelectorAll('.mode-button')],
  imageCanvas: $('imageCanvas'),
  videoCanvas: $('videoCanvas'),
  videoSource: $('videoSource'),
  musicSource: $('musicSource'),
  canvasStage: $('canvasStage'),
  emptyState: $('emptyState'),
  cropOverlay: $('cropOverlay'),
  cropSelection: $('cropSelection'),
  inspectorTabs: $('inspectorTabs'),
  inspectorTitle: $('inspectorTitle'),
  inspectorPanels: [...document.querySelectorAll('.tool-panel')],
  imageInput: $('imageFileInput'),
  videoInput: $('videoFileInput'),
  musicInput: $('musicFileInput'),
  srtInput: $('srtFileInput'),
  toast: $('toast'),
  toastMessage: $('toastMessage'),
};

const imageDefaults = () => ({
  brightness: 0,
  exposure: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  hue: 0,
  blur: 0,
  vignette: 0,
  filter: 'original',
  filterIntensity: 100,
  rotation: 0,
  flipH: false,
  flipV: false,
  crop: null,
  text: '',
  textColor: '#ffffff',
  textSize: 48,
  textBackground: true,
  textPosition: 0.84,
  outputWidth: 0,
  outputHeight: 0,
  outputCustom: false,
  outputFormat: 'image/png',
  outputQuality: 0.92,
});

const videoLookDefaults = () => ({
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  filter: 'original',
  fadeDuration: 0.4,
  chromaEnabled: false,
  chromaColor: '#22c55e',
  chromaBackground: '#151821',
  chromaTolerance: 38,
  title: '',
  titleColor: '#ffffff',
  titleSize: 52,
  sticker: '',
});

const state = {
  mode: 'image',
  activePanel: 'adjust',
  imageSource: null,
  imageFileName: '',
  imageObjectUrl: '',
  image: imageDefaults(),
  clips: [],
  activeClipId: '',
  captions: [],
  captionPosition: 'bottom',
  videoLook: videoLookDefaults(),
  videoAspect: '16:9',
  videoResolution: '1080',
  videoFrameRate: 30,
  videoBitrate: 5000000,
  videoVolume: 1,
  musicVolume: 0.35,
  musicUrl: '',
  musicName: '',
  musicDuration: 0,
};

const imageFilters = [
  { id: 'original', name: 'Original', gradient: 'linear-gradient(135deg,#656b77,#252b38)', image: {} , video: {} },
  { id: 'film', name: 'Cinema', gradient: 'linear-gradient(135deg,#c07e65,#253849)', image: { contrast: 15, saturation: -12, warmth: 8, vignette: 20 }, video: { contrast: 12, saturation: -10, warmth: 8 } },
  { id: 'golden', name: 'Dourado', gradient: 'linear-gradient(135deg,#f1b45b,#634041)', image: { brightness: 5, contrast: 8, saturation: 16, warmth: 36 }, video: { brightness: 5, contrast: 8, saturation: 14, warmth: 34 } },
  { id: 'mono', name: 'P&B', gradient: 'linear-gradient(135deg,#d5d4cd,#373b42)', image: { contrast: 18, saturation: -100 }, video: { contrast: 18, saturation: -100 } },
  { id: 'vivid', name: 'Vibrante', gradient: 'linear-gradient(135deg,#42a2b2,#e17872)', image: { contrast: 13, saturation: 36 }, video: { contrast: 12, saturation: 32 } },
  { id: 'soft', name: 'Suave', gradient: 'linear-gradient(135deg,#e8c9b8,#8598a0)', image: { brightness: 8, contrast: -12, saturation: -12, warmth: 8 }, video: { brightness: 8, contrast: -10, saturation: -10, warmth: 6 } },
  { id: 'arctic', name: 'Ártico', gradient: 'linear-gradient(135deg,#a4d2e9,#3c5982)', image: { brightness: 4, contrast: 10, saturation: -12, warmth: -35 }, video: { brightness: 4, contrast: 10, saturation: -12, warmth: -32 } },
  { id: 'retro', name: 'Retrô', gradient: 'linear-gradient(135deg,#bc9261,#4f4548)', image: { contrast: 5, saturation: -25, warmth: 25, vignette: 32 }, video: { contrast: 5, saturation: -22, warmth: 25 } },
];

const panelDefinitions = {
  image: [
    { id: 'adjust', label: 'Ajustes', title: 'Ajustes' },
    { id: 'filters', label: 'Filtros', title: 'Filtros' },
    { id: 'crop', label: 'Recortar', title: 'Recortar' },
    { id: 'text', label: 'Texto', title: 'Texto' },
    { id: 'image-export', label: 'Exportar', title: 'Exportar imagem' },
  ],
  video: [
    { id: 'clips', label: 'Montagem', title: 'Montagem' },
    { id: 'video-look', label: 'Visual', title: 'Visual do vídeo' },
    { id: 'captions', label: 'Legendas', title: 'Legendas' },
    { id: 'audio', label: 'Áudio', title: 'Áudio' },
    { id: 'video-export', label: 'Exportar', title: 'Exportar vídeo' },
  ],
};

let imageWorkCanvas = document.createElement('canvas');
let chromaWorkCanvas = document.createElement('canvas');
let imageRenderFrame = 0;
let toastTimer = 0;
let comparePressed = false;
let crop = { active: false, ratio: null, rect: null, previousCrop: null, pointerId: null, action: '', startX: 0, startY: 0, origin: null, handle: '' };
let objectUrls = new Set();
let clipSequence = 1;
let currentLoadedClipId = '';
let sequencePlaying = false;
let clipTransitioning = false;
let videoAnimationFrame = 0;
let seekTimer = 0;
let isScrubbing = false;
let audioContext = null;
let audioDestination = null;
let videoSourceNode = null;
let videoGainNode = null;
let musicSourceNode = null;
let musicGainNode = null;
let audioGraphError = false;
let recorder = null;
let recorderChunks = [];
let exportAnimationFrame = 0;
let isExporting = false;
let cancelExportRequested = false;
let exportAspectRatio = null;
let exportOutputSize = null;
let history = [];
let historyIndex = -1;

function makeId(prefix = 'item') {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function notify(message, kind = 'success') {
  ui.toastMessage.textContent = message;
  ui.toast.classList.toggle('is-error', kind === 'error');
  ui.toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => ui.toast.classList.remove('is-visible'), 3100);
}

function formatTime(seconds, milliseconds = false) {
  const safe = Math.max(0, Number.isFinite(Number(seconds)) ? Number(seconds) : 0);
  const whole = Math.floor(safe);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const base = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return milliseconds ? `${base}.${String(Math.floor((safe % 1) * 100)).padStart(2, '0')}` : base;
}

function cleanFilename(name) {
  const base = String(name || 'editzz').replace(/\.[^.]+$/, '');
  const normalized = base.normalize ? base.normalize('NFKD') : base;
  return normalized.replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'editzz';
}

function downloadBlob(blob, fileName) {
  if (!blob || blob.size === 0) {
    notify('Não foi possível gerar o arquivo. Tente novamente.', 'error');
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function constrainImageSize(width, height) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(safeWidth, safeHeight), Math.sqrt(MAX_IMAGE_PIXELS / (safeWidth * safeHeight)));
  return { width: Math.max(1, Math.round(safeWidth * scale)), height: Math.max(1, Math.round(safeHeight * scale)) };
}

function getImageSourceSize() {
  if (!state.imageSource) return { width: 0, height: 0 };
  const originalWidth = state.imageSource.naturalWidth || state.imageSource.width;
  const originalHeight = state.imageSource.naturalHeight || state.imageSource.height;
  if (!originalWidth || !originalHeight) return { width: 0, height: 0 };
  return constrainImageSize(originalWidth, originalHeight);
}

function getFilter(id) {
  return imageFilters.find((filter) => filter.id === id) || imageFilters[0];
}

function getImageAdjustments(compare = false) {
  if (compare) return { brightness: 100, contrast: 100, saturation: 100, warmth: 0, hue: 0, blur: 0, vignette: 0 };
  const image = state.image;
  const preset = getFilter(image.filter).image;
  const strength = image.filterIntensity / 100;
  return {
    brightness: clamp(100 + image.brightness + image.exposure * 0.8 + (preset.brightness || 0) * strength, 5, 260),
    contrast: clamp(100 + image.contrast + (preset.contrast || 0) * strength, 0, 300),
    saturation: clamp(100 + image.saturation + (preset.saturation || 0) * strength, 0, 300),
    warmth: clamp(image.warmth + (preset.warmth || 0) * strength, -100, 100),
    hue: image.hue,
    blur: image.blur,
    vignette: clamp(image.vignette + (preset.vignette || 0) * strength, 0, 100),
  };
}

function canvasFilterString(adjustments) {
  return `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) hue-rotate(${adjustments.hue}deg) blur(${adjustments.blur}px)`;
}

function drawWarmth(ctx, width, height, warmth) {
  if (Math.abs(warmth) < 1) return;
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const alpha = Math.abs(warmth) / 420;
  ctx.fillStyle = warmth > 0 ? `rgba(255, 142, 67, ${alpha})` : `rgba(73, 142, 255, ${alpha})`;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawVignette(ctx, width, height, strength) {
  if (strength < 1) return;
  const radius = Math.max(width, height) * 0.78;
  const gradient = ctx.createRadialGradient(width * 0.5, height * 0.48, Math.min(width, height) * 0.12, width * 0.5, height * 0.5, radius);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.55, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${strength / 150})`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
}

function wrapCanvasText(ctx, text, maxWidth) {
  const lines = [];
  String(text).split('\n').forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      return;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  });
  return lines;
}

function drawTextBlock(ctx, text, options) {
  if (!text) return;
  const { width, height, y, size, color = '#fff', background = true, align = 'center', maxWidth = width * 0.86 } = options;
  const scaledSize = clamp(size, 10, Math.max(10, Math.min(width, height) * 0.18));
  ctx.save();
  ctx.font = `700 ${scaledSize}px "DM Sans", Inter, system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,.42)';
  ctx.shadowBlur = scaledSize * 0.18;
  const lines = wrapCanvasText(ctx, text, maxWidth);
  const lineHeight = scaledSize * 1.18;
  const maxLineWidth = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
  const blockHeight = lineHeight * lines.length;
  const centerY = clamp(y, blockHeight / 2 + 8, height - blockHeight / 2 - 8);
  if (background) {
    const padX = scaledSize * 0.28;
    const padY = scaledSize * 0.17;
    const bgX = align === 'center' ? width / 2 - maxLineWidth / 2 - padX : 12;
    const bgWidth = Math.min(width - 24, maxLineWidth + padX * 2);
    const bgY = centerY - blockHeight / 2 - padY;
    ctx.shadowBlur = 0;
    roundedRect(ctx, bgX, bgY, bgWidth, blockHeight + padY * 2, Math.max(5, scaledSize * 0.12));
    ctx.fillStyle = 'rgba(5, 7, 11, .66)';
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,.7)';
  ctx.shadowBlur = scaledSize * 0.12;
  lines.forEach((line, index) => ctx.fillText(line, align === 'center' ? width / 2 : 18, centerY + (index - (lines.length - 1) / 2) * lineHeight, maxWidth));
  ctx.restore();
}

function drawImageText(ctx, width, height) {
  const image = state.image;
  if (!image.text.trim()) return;
  const sizeScale = clamp(width / 1200, 0.75, 3.2);
  drawTextBlock(ctx, image.text, {
    width,
    height,
    y: height * image.textPosition,
    size: image.textSize * sizeScale,
    color: image.textColor,
    background: image.textBackground,
  });
}

function renderImage(compare = false) {
  if (!state.imageSource) return;
  const isOriginal = compare || comparePressed;
  const sourceSize = getImageSourceSize();
  if (!sourceSize.width || !sourceSize.height) return;
  const settings = state.image;
  const angle = isOriginal ? 0 : (settings.rotation * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(angle));
  const sine = Math.abs(Math.sin(angle));
  const orientedWidth = Math.max(1, Math.ceil(sourceSize.width * cosine + sourceSize.height * sine));
  const orientedHeight = Math.max(1, Math.ceil(sourceSize.width * sine + sourceSize.height * cosine));
  const adjustments = getImageAdjustments(isOriginal);
  const work = imageWorkCanvas;
  work.width = orientedWidth;
  work.height = orientedHeight;
  const workContext = work.getContext('2d', { willReadFrequently: false });
  if (!workContext) return;
  workContext.clearRect(0, 0, orientedWidth, orientedHeight);
  workContext.save();
  workContext.translate(orientedWidth / 2, orientedHeight / 2);
  workContext.rotate(angle);
  if (!isOriginal) workContext.scale(settings.flipH ? -1 : 1, settings.flipV ? -1 : 1);
  workContext.filter = canvasFilterString(adjustments);
  workContext.imageSmoothingEnabled = true;
  workContext.imageSmoothingQuality = 'high';
  workContext.drawImage(state.imageSource, -sourceSize.width / 2, -sourceSize.height / 2, sourceSize.width, sourceSize.height);
  workContext.restore();
  workContext.filter = 'none';
  drawWarmth(workContext, orientedWidth, orientedHeight, adjustments.warmth);
  drawVignette(workContext, orientedWidth, orientedHeight, adjustments.vignette);

  let sx = 0;
  let sy = 0;
  let sw = orientedWidth;
  let sh = orientedHeight;
  if (!isOriginal && settings.crop) {
    sx = clamp(Math.round(settings.crop.x), 0, orientedWidth - 1);
    sy = clamp(Math.round(settings.crop.y), 0, orientedHeight - 1);
    sw = clamp(Math.round(settings.crop.width), 1, orientedWidth - sx);
    sh = clamp(Math.round(settings.crop.height), 1, orientedHeight - sy);
  }
  const canvas = ui.imageCanvas;
  canvas.width = sw;
  canvas.height = sh;
  const context = canvas.getContext('2d', { willReadFrequently: false });
  if (!context) return;
  context.clearRect(0, 0, sw, sh);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(work, sx, sy, sw, sh, 0, 0, sw, sh);
  if (!isOriginal) drawImageText(context, sw, sh);
  if (!settings.outputCustom && !isOriginal) {
    settings.outputWidth = sw;
    settings.outputHeight = sh;
    syncImageOutputFields();
  }
  updateStageDetails();
  if (crop.active && !isOriginal) requestAnimationFrame(positionCropOverlay);
}

function scheduleImageRender() {
  cancelAnimationFrame(imageRenderFrame);
  imageRenderFrame = requestAnimationFrame(() => renderImage());
}

function renderImageFilters() {
  const grid = $('imageFilterGrid');
  const videoGrid = $('videoFilterGrid');
  grid.replaceChildren();
  videoGrid.replaceChildren();
  imageFilters.forEach((filter) => {
    const imageCard = document.createElement('button');
    imageCard.type = 'button';
    imageCard.className = `filter-card${state.image.filter === filter.id ? ' is-active' : ''}`;
    imageCard.dataset.filter = filter.id;
    imageCard.style.setProperty('--filter-gradient', filter.gradient);
    imageCard.setAttribute('aria-pressed', String(state.image.filter === filter.id));
    const name = document.createElement('span');
    name.textContent = filter.name;
    imageCard.append(name);
    imageCard.addEventListener('click', () => {
      state.image.filter = filter.id;
      renderImageFilters();
      renderImage();
      commitHistory();
    });
    grid.append(imageCard);

    const videoCard = document.createElement('button');
    videoCard.type = 'button';
    videoCard.className = `filter-card${state.videoLook.filter === filter.id ? ' is-active' : ''}`;
    videoCard.dataset.filter = filter.id;
    videoCard.style.setProperty('--filter-gradient', filter.gradient);
    videoCard.setAttribute('aria-pressed', String(state.videoLook.filter === filter.id));
    const videoName = document.createElement('span');
    videoName.textContent = filter.name;
    videoCard.append(videoName);
    videoCard.addEventListener('click', () => {
      state.videoLook.filter = filter.id;
      renderImageFilters();
      renderVideoFrame();
      commitHistory();
    });
    videoGrid.append(videoCard);
  });
}

function updateRangeOutput(input, value, unit = '') {
  const output = $(`${input.id}Value`);
  if (output) output.textContent = `${value}${unit}`;
}

function syncImageControls() {
  document.querySelectorAll('[data-image-param]').forEach((input) => {
    const key = input.dataset.imageParam;
    if (state.image[key] !== undefined) input.value = String(state.image[key]);
    const unit = key === 'hue' ? '°' : key === 'filterIntensity' ? '%' : '';
    updateRangeOutput(input, input.value, unit);
  });
  $('imageOverlayText').value = state.image.text;
  $('imageTextColor').value = state.image.textColor;
  $('imageTextColorValue').textContent = state.image.textColor.toUpperCase();
  $('imageTextSize').value = String(state.image.textSize);
  $('imageTextBackground').checked = state.image.textBackground;
  $('imageTextPosition').value = String(state.image.textPosition);
  $('imageOutputFormat').value = state.image.outputFormat;
  $('imageQuality').value = String(Math.round(state.image.outputQuality * 100));
  $('imageQualityValue').textContent = `${Math.round(state.image.outputQuality * 100)}%`;
  updateImageQualityVisibility();
  syncImageOutputFields();
  renderImageFilters();
}

function syncImageOutputFields() {
  if (state.imageSource && (!state.image.outputWidth || !state.image.outputHeight)) {
    const { width, height } = getImageSourceSize();
    state.image.outputWidth = width;
    state.image.outputHeight = height;
  }
  $('imageOutputWidth').value = state.image.outputWidth ? String(Math.round(state.image.outputWidth)) : '0';
  $('imageOutputHeight').value = state.image.outputHeight ? String(Math.round(state.image.outputHeight)) : '0';
}

function updateImageQualityVisibility() {
  const isPng = state.image.outputFormat === 'image/png';
  $('imageQualityControl').hidden = isPng;
}

function syncVideoLookControls() {
  document.querySelectorAll('[data-video-param]').forEach((input) => {
    const key = input.dataset.videoParam;
    input.value = String(state.videoLook[key]);
    if (key === 'fadeDuration') $('vidFadeValue').textContent = `${Number(input.value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
    else updateRangeOutput(input, input.value);
  });
  $('videoChromaEnabled').checked = state.videoLook.chromaEnabled;
  $('videoChromaColor').value = state.videoLook.chromaColor;
  $('videoChromaColorValue').textContent = state.videoLook.chromaColor.toUpperCase();
  $('videoChromaBackground').value = state.videoLook.chromaBackground;
  $('videoChromaBackgroundValue').textContent = state.videoLook.chromaBackground.toUpperCase();
  $('videoChromaTolerance').value = String(state.videoLook.chromaTolerance);
  $('videoChromaToleranceValue').textContent = String(state.videoLook.chromaTolerance);
  $('videoTitle').value = state.videoLook.title;
  $('videoTitleColor').value = state.videoLook.titleColor;
  $('videoTitleColorValue').textContent = state.videoLook.titleColor.toUpperCase();
  $('videoTitleSize').value = String(state.videoLook.titleSize);
  $('videoSticker').value = state.videoLook.sticker;
  renderImageFilters();
}

function showPanel(panelId) {
  const definitions = panelDefinitions[state.mode];
  if (!definitions.some((panel) => panel.id === panelId)) panelId = definitions[0].id;
  state.activePanel = panelId;
  ui.inspectorTabs.replaceChildren();
  definitions.forEach((panel) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `inspector-tab${panel.id === panelId ? ' is-active' : ''}`;
    button.textContent = panel.label;
    button.setAttribute('aria-selected', String(panel.id === panelId));
    button.setAttribute('role', 'tab');
    button.addEventListener('click', () => showPanel(panel.id));
    ui.inspectorTabs.append(button);
  });
  ui.inspectorPanels.forEach((panel) => {
    const active = panel.dataset.panel === panelId && panel.dataset.mode === state.mode;
    panel.hidden = !active;
  });
  const selected = definitions.find((panel) => panel.id === panelId);
  ui.inspectorTitle.textContent = selected ? selected.title : 'Ferramentas';
  if (panelId === 'clips') renderClipList();
  if (panelId === 'crop' && state.mode === 'image' && state.imageSource && !crop.active) startCrop();
}

function setMode(mode, loadVideo = true) {
  if (mode !== 'image' && mode !== 'video') return;
  if (mode === 'image' && sequencePlaying) pausePreview();
  state.mode = mode;
  ui.modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('projectKicker').textContent = `ESPAÇO DE TRABALHO · ${mode === 'image' ? 'IMAGEM' : 'VÍDEO'}`;
  showPanel(mode === 'image' ? 'adjust' : 'clips');
  updateStage();
  if (mode === 'image' && state.imageSource) renderImage();
  if (mode === 'video' && state.clips.length) {
    const index = Math.max(0, state.clips.findIndex((clip) => clip.id === state.activeClipId));
    if (loadVideo && state.activeClipId && currentLoadedClipId !== state.activeClipId) activateClip(index, null).catch(() => {});
    renderVideoFrame();
  }
}

function updateStage() {
  const hasImage = state.mode === 'image' && Boolean(state.imageSource);
  const hasVideo = state.mode === 'video' && state.clips.length > 0;
  const hasMedia = hasImage || hasVideo;
  ui.emptyState.hidden = hasMedia;
  ui.imageCanvas.hidden = !hasImage;
  ui.videoCanvas.hidden = !hasVideo;
  $('videoTimeline').hidden = !hasVideo;
  $('compareButton').hidden = !hasImage;
  $('stageBadge').hidden = !hasMedia;
  $('exportButton').disabled = !hasMedia || isExporting;
  $('emptyEyebrow').textContent = state.mode === 'image' ? 'SEU PRÓXIMO PROJETO COMEÇA AQUI' : 'EDIÇÃO DE VÍDEO, SEM COMPLICAÇÃO';
  $('emptyTitle').textContent = state.mode === 'image' ? 'Dê vida às suas imagens.' : 'Monte seu próximo vídeo.';
  $('emptyDescription').textContent = state.mode === 'image'
    ? 'Ajuste cores, aplique um visual, recorte e adicione texto — tudo sem sair do navegador.'
    : 'Junte clipes, ajuste o ritmo, adicione títulos, legendas e áudio em uma linha do tempo simples.';
  $('dropHint').textContent = state.mode === 'image'
    ? 'ou arraste uma imagem para esta área · JPG, PNG, WebP'
    : 'ou arraste vídeos compatíveis · MP4, WebM e outros formatos do navegador';
  $('formatHint').textContent = state.mode === 'image'
    ? 'Imagem em tela cheia · edição não destrutiva'
    : 'Clipes locais · pré-visualização e exportação no navegador';
  $('projectName').textContent = hasImage
    ? state.imageFileName
    : hasVideo
      ? `${state.clips.length} ${state.clips.length === 1 ? 'clipe' : 'clipes'} · ${state.clips[0].name}`
      : 'Projeto sem título';
  if (hasImage) {
    const size = getImageSourceSize();
    $('stageBadgeText').textContent = `${size.width} × ${size.height} px`;
  } else if (hasVideo) {
    $('stageBadgeText').textContent = `${state.clips.length} ${state.clips.length === 1 ? 'clipe' : 'clipes'} · ${formatTime(getTotalDuration())}`;
  }
  if (state.mode === 'video') {
    renderClipTimeline();
    updateTimelineUI();
  }
}

function resetHistory() {
  history = [captureSnapshot()];
  historyIndex = 0;
  updateHistoryButtons();
}

function captureSnapshot() {
  const image = { ...state.image, crop: state.image.crop ? { ...state.image.crop } : null };
  return {
    mode: state.mode,
    activePanel: state.activePanel,
    imageSource: state.imageSource,
    imageFileName: state.imageFileName,
    imageObjectUrl: state.imageObjectUrl,
    image,
    clips: state.clips.map((clip) => ({ ...clip })),
    activeClipId: state.activeClipId,
    captions: state.captions.map((caption) => ({ ...caption })),
    captionPosition: state.captionPosition,
    videoLook: { ...state.videoLook },
    videoAspect: state.videoAspect,
    videoResolution: state.videoResolution,
    videoFrameRate: state.videoFrameRate,
    videoBitrate: state.videoBitrate,
    videoVolume: state.videoVolume,
    musicVolume: state.musicVolume,
    musicUrl: state.musicUrl,
    musicName: state.musicName,
    musicDuration: state.musicDuration,
  };
}

function commitHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(captureSnapshot());
  if (history.length > HISTORY_LIMIT) history.shift();
  historyIndex = history.length - 1;
  updateHistoryButtons();
}

function updateHistoryButtons() {
  $('undoButton').disabled = historyIndex <= 0 || isExporting;
  $('redoButton').disabled = historyIndex >= history.length - 1 || isExporting;
}

async function restoreSnapshot(snapshot) {
  pausePreview();
  state.mode = snapshot.mode;
  state.activePanel = snapshot.activePanel;
  state.imageSource = snapshot.imageSource;
  state.imageFileName = snapshot.imageFileName;
  state.imageObjectUrl = snapshot.imageObjectUrl;
  state.image = { ...snapshot.image, crop: snapshot.image.crop ? { ...snapshot.image.crop } : null };
  state.clips = snapshot.clips.map((clip) => ({ ...clip }));
  state.activeClipId = snapshot.activeClipId;
  state.captions = snapshot.captions.map((caption) => ({ ...caption }));
  state.captionPosition = snapshot.captionPosition;
  state.videoLook = { ...snapshot.videoLook };
  state.videoAspect = snapshot.videoAspect;
  state.videoResolution = snapshot.videoResolution;
  state.videoFrameRate = snapshot.videoFrameRate;
  state.videoBitrate = snapshot.videoBitrate;
  state.videoVolume = snapshot.videoVolume;
  state.musicVolume = snapshot.musicVolume;
  state.musicUrl = snapshot.musicUrl;
  state.musicName = snapshot.musicName;
  state.musicDuration = snapshot.musicDuration;
  cancelCrop(false);
  setMode(state.mode, false);
  syncImageControls();
  syncVideoLookControls();
  syncVideoSettings();
  renderCaptions();
  restoreMusicSource();
  updateMusicUI();
  renderClipList();
  if (state.imageSource) renderImage();
  if (state.clips.length) {
    const index = Math.max(0, state.clips.findIndex((clip) => clip.id === state.activeClipId));
    await activateClip(index, null).catch(() => {});
  } else {
    currentLoadedClipId = '';
    ui.videoSource.pause();
    ui.videoSource.removeAttribute('src');
    ui.videoSource.load();
    updateStage();
  }
}

async function undo() {
  if (historyIndex <= 0 || isExporting) return;
  historyIndex -= 1;
  await restoreSnapshot(history[historyIndex]);
  updateHistoryButtons();
  notify('Alteração desfeita.');
}

async function redo() {
  if (historyIndex >= history.length - 1 || isExporting) return;
  historyIndex += 1;
  await restoreSnapshot(history[historyIndex]);
  updateHistoryButtons();
  notify('Alteração refeita.');
}

function loadImageFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    notify('Escolha um arquivo de imagem válido.', 'error');
    return;
  }
  const objectUrl = URL.createObjectURL(file);
  objectUrls.add(objectUrl);
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    state.imageSource = image;
    state.imageFileName = file.name || 'imagem';
    state.imageObjectUrl = objectUrl;
    state.image = imageDefaults();
    const size = getImageSourceSize();
    const downscaled = size.width < image.naturalWidth || size.height < image.naturalHeight;
    state.image.outputWidth = size.width;
    state.image.outputHeight = size.height;
    comparePressed = false;
    cancelCrop(false);
    setMode('image');
    syncImageControls();
    renderImage();
    updateStage();
    commitHistory();
    notify(downscaled
      ? `Imagem carregada e ajustada para ${size.width} × ${size.height} px para manter a edição estável.`
      : `Imagem carregada · ${size.width} × ${size.height} px`);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    objectUrls.delete(objectUrl);
    notify('Não foi possível abrir esta imagem. Tente PNG, JPG ou WebP.', 'error');
  };
  image.src = objectUrl;
}

function getClip(id = state.activeClipId) {
  return state.clips.find((clip) => clip.id === id) || null;
}

function probeVideoFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    objectUrls.add(url);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.muted = true;
    probe.playsInline = true;
    const timeout = window.setTimeout(() => finish(new Error('Tempo limite ao ler o vídeo.')), 20_000);
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      const duration = Number.isFinite(probe.duration) ? probe.duration : 0;
      const width = probe.videoWidth || 0;
      const height = probe.videoHeight || 0;
      probe.removeAttribute('src');
      probe.load();
      if (error) {
        URL.revokeObjectURL(url);
        objectUrls.delete(url);
        reject(error);
        return;
      }
      if (!duration || !width || !height) {
        URL.revokeObjectURL(url);
        objectUrls.delete(url);
        reject(new Error('O vídeo não informou duração ou dimensões válidas.'));
        return;
      }
      resolve({
        id: makeId('clip'),
        name: file.name || `Clipe ${clipSequence++}`,
        file,
        url,
        duration,
        start: 0,
        end: duration,
        speed: 1,
        muted: false,
        width,
        height,
      });
    };
    probe.addEventListener('loadedmetadata', () => finish(null), { once: true });
    probe.addEventListener('error', () => finish(new Error('Formato ou codec de vídeo não compatível com este navegador.')), { once: true });
    probe.src = url;
    probe.load();
  });
}

function isVideoFile(file) {
  return Boolean(file && (file.type.startsWith('video/') || /\.(mp4|m4v|mov|webm|ogv|ogg|3gp)$/i.test(file.name || '')));
}

async function addVideoFiles(fileList) {
  const files = [...fileList].filter(isVideoFile);
  if (!files.length) {
    notify('Escolha um vídeo compatível, como MP4, WebM ou MOV.', 'error');
    return;
  }
  if (sequencePlaying) pausePreview();
  setMode('video');
  let added = 0;
  for (const file of files) {
    try {
      notify(`Lendo metadados · ${file.name}`);
      const clip = await probeVideoFile(file);
      state.clips.push(clip);
      added += 1;
    } catch (error) {
      notify(`${file.name}: ${error.message}`, 'error');
    }
  }
  if (added > 0) {
    if (!state.activeClipId || !getClip()) state.activeClipId = state.clips[0].id;
    const activeIndex = Math.max(0, state.clips.findIndex((clip) => clip.id === state.activeClipId));
    updateStage();
    renderClipList();
    await activateClip(activeIndex, state.clips[activeIndex].start).catch((error) => notify(error.message, 'error'));
    syncVideoSettings();
    commitHistory();
    notify(`${added} ${added === 1 ? 'clipe adicionado' : 'clipes adicionados'} à montagem.`);
  }
}

function waitForMediaEvent(element, successEvent, timeoutMs = 18_000) {
  if (successEvent === 'loadedmetadata' && element.readyState >= 1) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let done = false;
    const cleanup = () => {
      window.clearTimeout(timer);
      element.removeEventListener(successEvent, onSuccess);
      element.removeEventListener('error', onError);
    };
    const onSuccess = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };
    const onError = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error('O navegador não conseguiu decodificar esta mídia.'));
    };
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      if (successEvent === 'loadedmetadata' && element.readyState >= 1) resolve();
      else reject(new Error('Tempo limite ao carregar a mídia. Verifique o formato do arquivo.'));
    }, timeoutMs);
    element.addEventListener(successEvent, onSuccess, { once: true });
    element.addEventListener('error', onError, { once: true });
  });
}

async function seekMedia(time) {
  const max = Number.isFinite(ui.videoSource.duration) ? ui.videoSource.duration : time;
  const target = clamp(time, 0, max || time);
  if (Math.abs(ui.videoSource.currentTime - target) < 0.025) return;
  const seeking = waitForMediaEvent(ui.videoSource, 'seeked', 5000).catch(() => {});
  try { ui.videoSource.currentTime = target; } catch { return; }
  await seeking;
}

async function activateClip(index, time = null, options = {}) {
  const clip = state.clips[index];
  if (!clip) return;
  if (!options.keepSequence && sequencePlaying && !isExporting) pausePreview();
  state.activeClipId = clip.id;
  const requiresLoad = currentLoadedClipId !== clip.id;
  if (requiresLoad) {
    ui.videoSource.pause();
    currentLoadedClipId = clip.id;
    ui.videoSource.src = clip.url;
    ui.videoSource.load();
    await waitForMediaEvent(ui.videoSource, 'loadedmetadata');
  }
  const localTime = time === null ? clamp(ui.videoSource.currentTime || clip.start, clip.start, clip.end) : clamp(time, clip.start, clip.end);
  ui.videoSource.playbackRate = Number(clip.speed) || 1;
  ui.videoSource.muted = false;
  await seekMedia(localTime);
  updateAudioGains();
  updateSelectedClipControls();
  updateStage();
  renderClipList();
  renderVideoFrame();
  if (options.play) {
    try {
      await ui.videoSource.play();
      if (!isExporting) sequencePlaying = true;
      startVideoLoop();
    } catch {
      if (!isExporting) sequencePlaying = false;
      throw new Error('A reprodução foi bloqueada pelo navegador. Clique em reproduzir novamente.');
    }
  }
}

function getSelectedClipIndex() {
  return state.clips.findIndex((clip) => clip.id === state.activeClipId);
}

function getClipPlayDuration(clip) {
  return Math.max(0, clip.end - clip.start) / Math.max(0.05, Number(clip.speed) || 1);
}

function getTotalDuration() {
  return state.clips.reduce((sum, clip) => sum + getClipPlayDuration(clip), 0);
}

function getTimelineOffset(index) {
  return state.clips.slice(0, Math.max(0, index)).reduce((sum, clip) => sum + getClipPlayDuration(clip), 0);
}

function getProjectTime() {
  const index = getSelectedClipIndex();
  const clip = state.clips[index];
  if (!clip) return 0;
  const current = currentLoadedClipId === clip.id && Number.isFinite(ui.videoSource.currentTime)
    ? ui.videoSource.currentTime
    : clip.start;
  const offset = (clamp(current, clip.start, clip.end) - clip.start) / Math.max(0.05, Number(clip.speed) || 1);
  return clamp(getTimelineOffset(index) + offset, 0, getTotalDuration());
}

function renderClipList() {
  const clipList = $('clipList');
  const track = $('clipTrack');
  if (!clipList || !track) return;
  clipList.replaceChildren();
  track.replaceChildren();
  $('timelineEmpty').hidden = state.clips.length >= 2;
  $('timelineEmpty').textContent = state.clips.length === 1
    ? 'Adicione outros clipes para criar uma montagem com vários vídeos.'
    : 'Importe dois ou mais clipes para montar uma sequência.';
  if (!state.clips.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-list-message';
    empty.textContent = 'Seus clipes aparecerão aqui. Adicione mais de um para montar uma sequência.';
    clipList.append(empty);
    updateSelectedClipControls();
    return;
  }
  const total = Math.max(getTotalDuration(), 0.01);
  state.clips.forEach((clip, index) => {
    const item = document.createElement('div');
    item.className = `clip-list-item${clip.id === state.activeClipId ? ' is-selected' : ''}`;
    item.dataset.clipId = clip.id;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Selecionar clipe ${clip.name}`);
    const thumb = document.createElement('span');
    thumb.className = 'clip-thumb';
    thumb.textContent = '▶';
    const copy = document.createElement('span');
    copy.className = 'clip-copy';
    const title = document.createElement('strong');
    title.textContent = clip.name;
    const meta = document.createElement('span');
    meta.textContent = `${formatTime(clip.end - clip.start)} · ${clip.speed}×${clip.muted ? ' · mudo' : ''}`;
    copy.append(title, meta);
    const order = document.createElement('span');
    order.className = 'clip-order';
    const up = document.createElement('button');
    up.type = 'button';
    up.dataset.action = 'up';
    up.title = 'Mover para cima';
    up.setAttribute('aria-label', `Mover ${clip.name} para cima`);
    up.disabled = index === 0;
    up.textContent = '↑';
    const down = document.createElement('button');
    down.type = 'button';
    down.dataset.action = 'down';
    down.title = 'Mover para baixo';
    down.setAttribute('aria-label', `Mover ${clip.name} para baixo`);
    down.disabled = index === state.clips.length - 1;
    down.textContent = '↓';
    order.append(up, down);
    item.append(thumb, copy, order);
    clipList.append(item);

    const block = document.createElement('button');
    block.type = 'button';
    block.className = `clip-block${clip.id === state.activeClipId ? ' is-selected' : ''}`;
    block.dataset.clipId = clip.id;
    block.style.flex = `${Math.max(0.1, getClipPlayDuration(clip) / total * 10)} 0 112px`;
    block.title = `${clip.name} · ${formatTime(clip.end - clip.start)}`;
    const blockTitle = document.createElement('strong');
    blockTitle.textContent = clip.name;
    const blockMeta = document.createElement('span');
    blockMeta.textContent = `${formatTime(clip.end - clip.start)}${clip.speed !== 1 ? ` · ${clip.speed}×` : ''}`;
    block.append(blockTitle, blockMeta);
    track.append(block);
  });
  updateSelectedClipControls();
}

function renderClipTimeline() {
  renderClipList();
}

function updateTimelineUI() {
  const total = getTotalDuration();
  const active = getClip();
  $('timelineSeek').max = String(Math.max(total, 0));
  $('timelineSeek').disabled = state.clips.length === 0;
  $('durationLabel').textContent = formatTime(total);
  $('currentTimeLabel').textContent = formatTime(getProjectTime());
  $('clipCountLabel').textContent = `${state.clips.length} ${state.clips.length === 1 ? 'clipe' : 'clipes'}`;
  if (!isScrubbing) $('timelineSeek').value = String(getProjectTime());
  $('playButton').classList.toggle('is-playing', sequencePlaying);
  $('playButton').setAttribute('aria-label', sequencePlaying ? 'Pausar' : 'Reproduzir');
  if (active && state.mode === 'video') {
    $('stageBadgeText').textContent = `${state.clips.length} ${state.clips.length === 1 ? 'clipe' : 'clipes'} · ${formatTime(total)}`;
  }
}

function updateSelectedClipControls() {
  const clip = getClip();
  $('selectedClipSettings').hidden = !clip;
  if (!clip) {
    $('selectedClipName').textContent = '—';
    return;
  }
  $('selectedClipName').textContent = clip.name;
  if (document.activeElement !== $('clipTrimStart')) $('clipTrimStart').value = Number(clip.start).toFixed(1);
  if (document.activeElement !== $('clipTrimEnd')) $('clipTrimEnd').value = Number(clip.end).toFixed(1);
  if (document.activeElement !== $('clipSpeed')) $('clipSpeed').value = String(clip.speed);
  $('clipMuted').checked = Boolean(clip.muted);
  $('clipTrimStart').max = String(Math.max(0, clip.end - 0.1));
  $('clipTrimEnd').max = String(clip.duration);
}

function updateVideoAspectAndResolution() {
  state.videoAspect = $('videoAspect').value;
  state.videoResolution = $('videoResolution').value;
  state.videoFrameRate = Number($('videoFrameRate').value) || 30;
  state.videoBitrate = Number($('videoBitrate').value) || 5000000;
  resizeVideoCanvas();
  renderVideoFrame();
}

function syncVideoSettings() {
  $('videoAspect').value = state.videoAspect;
  $('videoResolution').value = state.videoResolution;
  $('videoFrameRate').value = String(state.videoFrameRate);
  $('videoBitrate').value = String(state.videoBitrate);
  $('videoVolume').value = String(Math.round(state.videoVolume * 100));
  $('videoVolumeValue').textContent = `${Math.round(state.videoVolume * 100)}%`;
  $('musicVolume').value = String(Math.round(state.musicVolume * 100));
  $('musicVolumeValue').textContent = `${Math.round(state.musicVolume * 100)}%`;
  updateVideoAspectAndResolution();
}

function getVideoOutputSize(targetCanvas = ui.videoCanvas) {
  const clip = getClip();
  const sourceWidth = ui.videoSource.videoWidth || clip?.width || 1280;
  const sourceHeight = ui.videoSource.videoHeight || clip?.height || 720;
  const ratioParts = String(state.videoAspect).split(':').map(Number);
  const ratio = exportAspectRatio || (state.videoAspect === 'source' || !ratioParts[0] || !ratioParts[1]
    ? sourceWidth / Math.max(1, sourceHeight)
    : ratioParts[0] / ratioParts[1]);
  let width;
  let height;
  if (exportOutputSize) {
    width = exportOutputSize.width;
    height = exportOutputSize.height;
  } else if (state.videoResolution === 'source') {
    const scale = Math.min(1, 1920 / Math.max(sourceWidth, sourceHeight));
    width = Math.round(sourceWidth * scale);
    height = Math.round(sourceHeight * scale);
    if (Math.abs(width / height - ratio) > 0.015) {
      if (ratio >= 1) { height = Math.round(Math.min(1920, height)); width = Math.round(height * ratio); }
      else { width = Math.round(Math.min(1920, width)); height = Math.round(width / ratio); }
    }
  } else {
    const size = Number(state.videoResolution) || 1080;
    if (ratio >= 1) { height = size; width = Math.round(size * ratio); }
    else { width = size; height = Math.round(size / ratio); }
  }
  width = Math.max(2, Math.min(3840, width - (width % 2)));
  height = Math.max(2, Math.min(3840, height - (height % 2)));
  if (targetCanvas && (targetCanvas.width !== width || targetCanvas.height !== height)) {
    targetCanvas.width = width;
    targetCanvas.height = height;
  }
  return { width, height };
}

function resizeVideoCanvas() {
  const { width, height } = getVideoOutputSize(ui.videoCanvas);
  $('formatHint').textContent = `${width} × ${height} px · ${state.videoFrameRate} fps · WebM`;
  updateStageDetails();
}

function getVideoAdjustments() {
  const preset = getFilter(state.videoLook.filter).video;
  return {
    brightness: clamp(100 + state.videoLook.brightness + (preset.brightness || 0), 10, 250),
    contrast: clamp(100 + state.videoLook.contrast + (preset.contrast || 0), 0, 300),
    saturation: clamp(100 + state.videoLook.saturation + (preset.saturation || 0), 0, 300),
    warmth: clamp(state.videoLook.warmth + (preset.warmth || 0), -100, 100),
  };
}

function applyChromaKey(canvas, width, height) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return;
  try {
    const pixels = context.getImageData(0, 0, width, height);
    const data = pixels.data;
    const hex = state.videoLook.chromaColor.replace('#', '');
    const key = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    const tolerance = Number(state.videoLook.chromaTolerance) * 2.55;
    const softEdge = Math.max(12, tolerance * 0.32);
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] === 0) continue;
      const red = data[index] - key[0];
      const green = data[index + 1] - key[1];
      const blue = data[index + 2] - key[2];
      const distance = Math.sqrt(red * red + green * green + blue * blue);
      if (distance <= tolerance) data[index + 3] = 0;
      else if (distance < tolerance + softEdge) data[index + 3] = Math.round(data[index + 3] * ((distance - tolerance) / softEdge));
    }
    context.putImageData(pixels, 0, 0);
  } catch (error) {
    console.warn('O chroma key não pôde processar este quadro.', error);
  }
}

function renderVideoFrameTo(canvas, projectTime = getProjectTime()) {
  const clip = getClip();
  if (!canvas || !clip) return;
  const { width, height } = getVideoOutputSize(canvas);
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return;
  context.save();
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#08090d';
  context.fillRect(0, 0, width, height);
  const video = ui.videoSource;
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    const adjustments = getVideoAdjustments();
    const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
    const drawWidth = video.videoWidth * scale;
    const drawHeight = video.videoHeight * scale;
    const dx = (width - drawWidth) / 2;
    const dy = (height - drawHeight) / 2;
    let footageContext = context;
    if (state.videoLook.chromaEnabled) {
      if (chromaWorkCanvas.width !== width || chromaWorkCanvas.height !== height) {
        chromaWorkCanvas.width = width;
        chromaWorkCanvas.height = height;
      }
      footageContext = chromaWorkCanvas.getContext('2d', { willReadFrequently: true });
      footageContext.clearRect(0, 0, width, height);
    }
    footageContext.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
    footageContext.drawImage(video, dx, dy, drawWidth, drawHeight);
    footageContext.filter = 'none';
    drawWarmth(footageContext, width, height, adjustments.warmth);
    if (state.videoLook.chromaEnabled) {
      applyChromaKey(chromaWorkCanvas, width, height);
      context.fillStyle = state.videoLook.chromaBackground;
      context.fillRect(0, 0, width, height);
      context.drawImage(chromaWorkCanvas, 0, 0, width, height);
    }
  }
  const titleSize = Number(state.videoLook.titleSize) * clamp(width / 1400, 0.7, 2.8);
  if (state.videoLook.title.trim()) {
    drawTextBlock(context, state.videoLook.title, {
      width,
      height,
      y: height * 0.16,
      size: titleSize,
      color: state.videoLook.titleColor,
      background: true,
    });
  }
  if (state.videoLook.sticker) {
    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `${Math.round(Math.min(width, height) * 0.105)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    context.shadowColor = 'rgba(0,0,0,.35)';
    context.shadowBlur = 12;
    context.fillText(state.videoLook.sticker, width * 0.83, height * 0.2);
    context.restore();
  }
  const activeCaption = state.captions.find((caption) => projectTime >= caption.start && projectTime < caption.end);
  if (activeCaption) {
    const captionY = state.captionPosition === 'top' ? height * 0.32 : height * 0.84;
    drawTextBlock(context, activeCaption.text, {
      width,
      height,
      y: captionY,
      size: Math.min(height * 0.045, width * 0.055),
      color: '#ffffff',
      background: true,
      maxWidth: width * 0.9,
    });
  }
  const fadeDuration = Math.min(Number(state.videoLook.fadeDuration) || 0, Math.max(0, (clip.end - clip.start) / 2));
  if (fadeDuration > 0) {
    const localTime = currentLoadedClipId === clip.id ? ui.videoSource.currentTime : clip.start;
    const fadeProgress = clamp(Math.min((localTime - clip.start) / fadeDuration, (clip.end - localTime) / fadeDuration), 0, 1);
    if (fadeProgress < 1) {
      context.globalAlpha = 1 - fadeProgress;
      context.fillStyle = '#05060a';
      context.fillRect(0, 0, width, height);
      context.globalAlpha = 1;
    }
  }
  context.restore();
}

function renderVideoFrame() {
  if (!state.clips.length) return;
  resizeVideoCanvas();
  renderVideoFrameTo(ui.videoCanvas, getProjectTime());
}

function updateStageDetails() {
  if (state.mode === 'image' && state.imageSource) {
    const size = getImageSourceSize();
    $('stageBadgeText').textContent = `${size.width} × ${size.height} px`;
  } else if (state.mode === 'video' && state.clips.length) {
    const { width, height } = getVideoOutputSize(ui.videoCanvas);
    $('stageBadgeText').textContent = `${width} × ${height} px · ${formatTime(getTotalDuration())}`;
  }
}

function ensureAudioGraph() {
  if (audioGraphError) return false;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    audioGraphError = true;
    return false;
  }
  try {
    if (!audioContext) {
      audioContext = new AudioContextClass();
      audioDestination = audioContext.createMediaStreamDestination();
    }
    if (!videoSourceNode) {
      videoSourceNode = audioContext.createMediaElementSource(ui.videoSource);
      videoGainNode = audioContext.createGain();
      videoSourceNode.connect(videoGainNode);
      videoGainNode.connect(audioContext.destination);
      videoGainNode.connect(audioDestination);
    }
    if (state.musicUrl && !musicSourceNode) {
      musicSourceNode = audioContext.createMediaElementSource(ui.musicSource);
      musicGainNode = audioContext.createGain();
      musicSourceNode.connect(musicGainNode);
      musicGainNode.connect(audioContext.destination);
      musicGainNode.connect(audioDestination);
    }
    updateAudioGains();
    return true;
  } catch (error) {
    console.warn('Áudio Web Audio não disponível neste navegador.', error);
    audioGraphError = true;
    return false;
  }
}

function updateAudioGains() {
  const clip = getClip();
  if (videoGainNode && audioContext) {
    ui.videoSource.muted = false;
    ui.videoSource.volume = 1;
    const target = clip && !clip.muted ? state.videoVolume : 0;
    videoGainNode.gain.setTargetAtTime(target, audioContext.currentTime, 0.025);
  } else {
    ui.videoSource.muted = !clip || Boolean(clip.muted);
    ui.videoSource.volume = clamp(state.videoVolume, 0, 1);
  }
  if (musicGainNode && audioContext) {
    ui.musicSource.volume = 1;
    musicGainNode.gain.setTargetAtTime(state.musicVolume, audioContext.currentTime, 0.025);
  } else {
    ui.musicSource.volume = clamp(state.musicVolume, 0, 1);
  }
}

async function playMusicFrom(projectTime = 0) {
  if (!state.musicUrl) return;
  if (ensureAudioGraph() && audioContext.state === 'suspended') await audioContext.resume();
  ui.musicSource.loop = true;
  if (Number.isFinite(ui.musicSource.duration) && ui.musicSource.duration > 0) {
    const target = projectTime % ui.musicSource.duration;
    if (Math.abs(ui.musicSource.currentTime - target) > 0.25) {
      try { ui.musicSource.currentTime = target; } catch { /* arquivo ainda está sendo buscado */ }
    }
  }
  try { await ui.musicSource.play(); } catch { /* música é opcional; o vídeo continua */ }
}

function startVideoLoop() {
  cancelAnimationFrame(videoAnimationFrame);
  const tick = () => {
    if (state.mode === 'video' && state.clips.length) {
      renderVideoFrameTo(ui.videoCanvas, getProjectTime());
      updateTimelineUI();
    }
    if (sequencePlaying && !isExporting) videoAnimationFrame = requestAnimationFrame(tick);
  };
  videoAnimationFrame = requestAnimationFrame(tick);
}

function pausePreview() {
  sequencePlaying = false;
  ui.videoSource.pause();
  ui.musicSource.pause();
  cancelAnimationFrame(videoAnimationFrame);
  updateTimelineUI();
  renderVideoFrame();
}

async function playPreview() {
  if (!state.clips.length || isExporting) return;
  let index = getSelectedClipIndex();
  if (index < 0) index = 0;
  const clip = state.clips[index];
  if (currentLoadedClipId !== clip.id) await activateClip(index, clip.start);
  if (ui.videoSource.currentTime >= clip.end - 0.04) {
    index = index < state.clips.length - 1 ? index + 1 : 0;
    await activateClip(index, state.clips[index].start);
  } else if (ui.videoSource.currentTime < clip.start) {
    await seekMedia(clip.start);
  }
  ensureAudioGraph();
  if (audioContext?.state === 'suspended') await audioContext.resume().catch(() => {});
  updateAudioGains();
  sequencePlaying = true;
  try {
    await ui.videoSource.play();
    await playMusicFrom(getProjectTime());
    startVideoLoop();
    updateTimelineUI();
  } catch {
    sequencePlaying = false;
    notify('Não foi possível reproduzir este vídeo neste navegador.', 'error');
  }
}

async function togglePlayback() {
  if (sequencePlaying) pausePreview();
  else await playPreview();
}

async function moveToNextClip() {
  if (clipTransitioning || !sequencePlaying || isExporting) return;
  const index = getSelectedClipIndex();
  if (index < 0) return;
  if (index >= state.clips.length - 1) {
    sequencePlaying = false;
    ui.videoSource.pause();
    ui.musicSource.pause();
    updateTimelineUI();
    return;
  }
  clipTransitioning = true;
  const nextIndex = index + 1;
  try {
    await activateClip(nextIndex, state.clips[nextIndex].start, { keepSequence: true });
    sequencePlaying = true;
    await ui.videoSource.play();
    await playMusicFrom(getProjectTime());
  } catch (error) {
    sequencePlaying = false;
    notify(error.message, 'error');
  } finally {
    clipTransitioning = false;
  }
}

function handleVideoTimeUpdate() {
  if (!state.clips.length || currentLoadedClipId !== state.activeClipId) return;
  const clip = getClip();
  if (!clip) return;
  updateTimelineUI();
  if (sequencePlaying && ui.videoSource.currentTime >= clip.end - 0.035) moveToNextClip();
}

function timelineLocation(time) {
  let offset = 0;
  for (let index = 0; index < state.clips.length; index += 1) {
    const clip = state.clips[index];
    const duration = getClipPlayDuration(clip);
    if (time <= offset + duration || index === state.clips.length - 1) {
      const within = clamp(time - offset, 0, duration);
      return { index, time: clip.start + within * clip.speed };
    }
    offset += duration;
  }
  return { index: 0, time: state.clips[0]?.start || 0 };
}

async function seekProjectTime(time) {
  if (!state.clips.length) return;
  const target = clamp(Number(time) || 0, 0, getTotalDuration());
  const location = timelineLocation(target);
  if (location.index === getSelectedClipIndex() && currentLoadedClipId === state.clips[location.index].id) {
    await seekMedia(location.time);
    renderVideoFrame();
    updateTimelineUI();
  } else {
    await activateClip(location.index, location.time);
  }
}

function onTimelineInput() {
  const target = Number($('timelineSeek').value);
  $('currentTimeLabel').textContent = formatTime(target);
  clearTimeout(seekTimer);
  seekTimer = window.setTimeout(() => seekProjectTime(target), 75);
}

function selectClipFromEvent(event) {
  const orderButton = event.target.closest('[data-action]');
  const item = event.target.closest('[data-clip-id]');
  if (!item) return;
  const index = state.clips.findIndex((clip) => clip.id === item.dataset.clipId);
  if (index < 0) return;
  if (orderButton) {
    event.stopPropagation();
    moveClip(index, orderButton.dataset.action === 'up' ? index - 1 : index + 1);
    return;
  }
  pausePreview();
  activateClip(index, state.clips[index].start).catch((error) => notify(error.message, 'error'));
}

function moveClip(from, to) {
  if (to < 0 || to >= state.clips.length) return;
  const [clip] = state.clips.splice(from, 1);
  state.clips.splice(to, 0, clip);
  renderClipList();
  updateTimelineUI();
  commitHistory();
  notify('Ordem dos clipes atualizada.');
}

function removeSelectedClip() {
  const index = getSelectedClipIndex();
  if (index < 0) return;
  const [removed] = state.clips.splice(index, 1);
  if (removed) {
    if (state.clips.length) {
      const nextIndex = Math.min(index, state.clips.length - 1);
      state.activeClipId = state.clips[nextIndex].id;
      currentLoadedClipId = '';
      updateStage();
      activateClip(nextIndex, state.clips[nextIndex].start).catch(() => {});
    } else {
      state.activeClipId = '';
      currentLoadedClipId = '';
      ui.videoSource.pause();
      ui.videoSource.removeAttribute('src');
      ui.videoSource.load();
      updateStage();
    }
    renderClipList();
    commitHistory();
    notify('Clipe removido da montagem.');
  }
}

async function splitClipAtPlayhead() {
  const clip = getClip();
  const index = getSelectedClipIndex();
  if (!clip || index < 0 || currentLoadedClipId !== clip.id || ui.videoSource.readyState < 1) {
    notify('Selecione um clipe e carregue o playhead para dividir.', 'error');
    return;
  }
  const splitTime = ui.videoSource.currentTime;
  const minimum = Math.min(0.08, (clip.end - clip.start) / 2);
  if (splitTime <= clip.start + minimum || splitTime >= clip.end - minimum) {
    notify('Mova o playhead para dentro do clipe antes de dividir.', 'error');
    return;
  }
  pausePreview();
  const left = { ...clip, id: makeId('clip'), name: `${clip.name} · A`, end: splitTime };
  const right = { ...clip, id: makeId('clip'), name: `${clip.name} · B`, start: splitTime };
  state.clips.splice(index, 1, left, right);
  state.activeClipId = right.id;
  currentLoadedClipId = '';
  renderClipList();
  updateTimelineUI();
  commitHistory();
  try {
    await activateClip(index + 1, splitTime);
    notify(`Clipe dividido em ${formatTime(splitTime)}.`);
  } catch (error) {
    notify(error.message, 'error');
  }
}

async function downloadCurrentFrame() {
  if (!state.clips.length || ui.videoCanvas.hidden) {
    notify('Importe um vídeo para salvar um quadro.', 'error');
    return;
  }
  renderVideoFrame();
  const blob = await canvasToBlob(ui.videoCanvas, 'image/png', 1);
  if (!blob) {
    notify('Não foi possível criar a imagem deste quadro.', 'error');
    return;
  }
  const clip = getClip();
  downloadBlob(blob, `${cleanFilename(clip?.name || 'editzz-quadro')}-quadro-${formatTime(ui.videoSource.currentTime).replaceAll(':', '-')}.png`);
  notify('Quadro atual salvo como imagem PNG.');
}

function trimSelectedClip(which) {
  const clip = getClip();
  if (!clip) return;
  const minSpan = Math.min(0.1, clip.duration);
  if (which === 'start') {
    clip.start = clamp(Number($('clipTrimStart').value) || 0, 0, Math.max(0, clip.end - minSpan));
    $('clipTrimStart').value = clip.start.toFixed(1);
    if (ui.videoSource.currentTime < clip.start) seekMedia(clip.start);
  } else {
    clip.end = clamp(Number($('clipTrimEnd').value) || clip.duration, Math.min(clip.duration, clip.start + minSpan), clip.duration);
    $('clipTrimEnd').value = clip.end.toFixed(1);
    if (ui.videoSource.currentTime > clip.end) seekMedia(clip.end);
  }
  renderClipList();
  updateTimelineUI();
  renderVideoFrame();
  commitHistory();
}

function updateClipSpeed() {
  const clip = getClip();
  if (!clip) return;
  clip.speed = Number($('clipSpeed').value) || 1;
  if (currentLoadedClipId === clip.id) ui.videoSource.playbackRate = clip.speed;
  renderClipList();
  updateTimelineUI();
  commitHistory();
  notify(`Velocidade definida para ${clip.speed}×.`);
}

function updateClipMute() {
  const clip = getClip();
  if (!clip) return;
  clip.muted = $('clipMuted').checked;
  updateAudioGains();
  renderClipList();
  commitHistory();
}

function parseSrtTimestamp(value) {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(`0.${match[4].padEnd(3, '0')}`);
}

function toSrtTimestamp(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.floor((safe - Math.floor(safe)) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function parseSrt(text) {
  const normalized = String(text).replace(/^\uFEFF/, '').replace(/\r/g, '').trim();
  const blocks = normalized.split(/\n\s*\n/);
  const parsed = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) continue;
    const match = lines[timingIndex].match(/(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/);
    if (!match) continue;
    const start = parseSrtTimestamp(match[1]);
    const end = parseSrtTimestamp(match[2]);
    const captionText = lines.slice(timingIndex + 1).join(' ').trim();
    if (start === null || end === null || end <= start || !captionText) continue;
    parsed.push({ id: makeId('caption'), text: captionText, start, end });
  }
  return parsed;
}

function addCaption() {
  if (!state.clips.length) {
    notify('Adicione um vídeo antes de criar legendas.', 'error');
    return;
  }
  const text = $('captionText').value.trim();
  if (!text) {
    $('captionText').focus();
    notify('Digite o texto da legenda primeiro.', 'error');
    return;
  }
  const start = getProjectTime();
  const duration = clamp(Number($('captionDuration').value) || 3, 0.5, 30);
  const end = Math.min(getTotalDuration(), start + duration);
  if (end <= start) {
    notify('Posicione o playhead antes do fim do vídeo.', 'error');
    return;
  }
  state.captions.push({ id: makeId('caption'), text, start, end });
  state.captions.sort((a, b) => a.start - b.start);
  $('captionText').value = '';
  renderCaptions();
  renderVideoFrame();
  commitHistory();
  notify(`Legenda adicionada em ${formatTime(start)}.`);
}

function renderCaptions() {
  const list = $('captionList');
  list.replaceChildren();
  $('captionCount').textContent = String(state.captions.length);
  $('exportSrtButton').disabled = state.captions.length === 0;
  if (!state.captions.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-list-message';
    empty.textContent = 'As legendas que você adicionar aparecerão aqui.';
    list.append(empty);
    return;
  }
  state.captions.forEach((caption) => {
    const row = document.createElement('div');
    row.className = 'caption-item';
    row.dataset.captionId = caption.id;
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `Ir para legenda em ${formatTime(caption.start)}`);
    const time = document.createElement('span');
    time.className = 'caption-time';
    time.textContent = formatTime(caption.start);
    const text = document.createElement('span');
    text.className = 'caption-item-text';
    text.textContent = caption.text;
    const remove = document.createElement('button');
    remove.className = 'caption-remove';
    remove.type = 'button';
    remove.dataset.removeCaption = caption.id;
    remove.setAttribute('aria-label', 'Remover legenda');
    remove.title = 'Remover legenda';
    remove.textContent = '×';
    row.append(time, text, remove);
    list.append(row);
  });
}

function importSrtFile(file) {
  if (!file) return;
  file.text().then((text) => {
    const parsed = parseSrt(text);
    if (!parsed.length) {
      notify('Nenhuma legenda válida foi encontrada neste .SRT.', 'error');
      return;
    }
    state.captions = [...state.captions, ...parsed].sort((a, b) => a.start - b.start);
    renderCaptions();
    renderVideoFrame();
    commitHistory();
    notify(`${parsed.length} ${parsed.length === 1 ? 'legenda importada' : 'legendas importadas'}.`);
  }).catch(() => notify('Não foi possível ler este arquivo .SRT.', 'error'));
}

function exportSrt() {
  if (!state.captions.length) return;
  const contents = [...state.captions]
    .sort((a, b) => a.start - b.start)
    .map((caption, index) => `${index + 1}\n${toSrtTimestamp(caption.start)} --> ${toSrtTimestamp(caption.end)}\n${caption.text}`)
    .join('\n\n');
  downloadBlob(new Blob([contents], { type: 'text/plain;charset=utf-8' }), `${cleanFilename(state.clips[0]?.name)}-legendas.srt`);
  notify('Arquivo .SRT baixado.');
}

function handleCaptionListClick(event) {
  const removeButton = event.target.closest('[data-remove-caption]');
  if (removeButton) {
    const id = removeButton.dataset.removeCaption;
    state.captions = state.captions.filter((caption) => caption.id !== id);
    renderCaptions();
    renderVideoFrame();
    commitHistory();
    return;
  }
  const row = event.target.closest('[data-caption-id]');
  if (row) {
    const caption = state.captions.find((item) => item.id === row.dataset.captionId);
    if (caption) seekProjectTime(caption.start).catch(() => {});
  }
}

function updateMusicUI() {
  const hasMusic = Boolean(state.musicUrl);
  $('musicTrackName').textContent = hasMusic ? state.musicName : 'Sem faixa de música';
  $('musicTrackMeta').textContent = hasMusic
    ? (state.musicDuration ? `${formatTime(state.musicDuration)} · acompanha a montagem` : 'Faixa local adicionada')
    : 'Adicione um arquivo de áudio do seu dispositivo.';
  $('removeMusicButton').hidden = !hasMusic;
  $('addMusicButton').hidden = hasMusic;
}

function restoreMusicSource() {
  ui.musicSource.pause();
  const loadedUrl = ui.musicSource.getAttribute('src') || '';
  if (state.musicUrl && loadedUrl !== state.musicUrl) {
    ui.musicSource.src = state.musicUrl;
    ui.musicSource.loop = true;
    ui.musicSource.load();
  } else if (!state.musicUrl && loadedUrl) {
    ui.musicSource.removeAttribute('src');
    ui.musicSource.load();
  }
}

function loadMusicFile(file) {
  if (!file || (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg|opus|flac)$/i.test(file.name || ''))) {
    notify('Escolha um arquivo de áudio compatível.', 'error');
    return;
  }
  const url = URL.createObjectURL(file);
  objectUrls.add(url);
  ui.musicSource.pause();
  ui.musicSource.src = url;
  ui.musicSource.loop = true;
  ui.musicSource.load();
  state.musicUrl = url;
  state.musicName = file.name || 'Faixa de áudio';
  state.musicDuration = 0;
  ui.musicSource.onloadedmetadata = () => {
    if (state.musicUrl === url) {
      state.musicDuration = Number.isFinite(ui.musicSource.duration) ? ui.musicSource.duration : 0;
      updateMusicUI();
    }
  };
  updateMusicUI();
  ensureAudioGraph();
  commitHistory();
  notify('Faixa de áudio adicionada à montagem.');
}

function removeMusic() {
  ui.musicSource.pause();
  ui.musicSource.removeAttribute('src');
  ui.musicSource.load();
  state.musicUrl = '';
  state.musicName = '';
  state.musicDuration = 0;
  updateMusicUI();
  updateAudioGains();
  commitHistory();
  notify('Faixa de música removida.');
}

function setImageCropRatio(ratio) {
  crop.ratio = ratio === 'free' ? null : (() => {
    const [width, height] = ratio.split(':').map(Number);
    return width / height;
  })();
  document.querySelectorAll('#imageRatioGrid .ratio-button').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.ratio === ratio);
  });
  if (!crop.active) startCrop();
  if (crop.active) {
    const width = ui.cropOverlay.clientWidth;
    const height = ui.cropOverlay.clientHeight;
    if (crop.ratio) {
      let boxWidth = width;
      let boxHeight = boxWidth / crop.ratio;
      if (boxHeight > height) {
        boxHeight = height;
        boxWidth = boxHeight * crop.ratio;
      }
      crop.rect = { x: (width - boxWidth) / 2, y: (height - boxHeight) / 2, width: boxWidth, height: boxHeight };
    } else {
      crop.rect = { x: 0, y: 0, width, height };
    }
    drawCropSelection();
  }
}

function startCrop() {
  if (!state.imageSource) {
    notify('Importe uma imagem para usar o recorte.', 'error');
    return;
  }
  if (crop.active) return;
  crop.previousCrop = state.image.crop ? { ...state.image.crop } : null;
  state.image.crop = null;
  crop.active = true;
  ui.canvasStage.classList.add('is-cropping');
  renderImage();
  ui.cropOverlay.hidden = false;
  requestAnimationFrame(() => {
    positionCropOverlay();
    const width = ui.cropOverlay.clientWidth;
    const height = ui.cropOverlay.clientHeight;
    if (crop.ratio) {
      let boxWidth = width;
      let boxHeight = boxWidth / crop.ratio;
      if (boxHeight > height) { boxHeight = height; boxWidth = boxHeight * crop.ratio; }
      crop.rect = { x: (width - boxWidth) / 2, y: (height - boxHeight) / 2, width: boxWidth, height: boxHeight };
    } else {
      crop.rect = { x: 0, y: 0, width, height };
    }
    drawCropSelection();
  });
}

function positionCropOverlay() {
  if (!crop.active || ui.imageCanvas.hidden) return;
  const canvasRect = ui.imageCanvas.getBoundingClientRect();
  const stageRect = ui.canvasStage.getBoundingClientRect();
  ui.cropOverlay.style.left = `${canvasRect.left - stageRect.left}px`;
  ui.cropOverlay.style.top = `${canvasRect.top - stageRect.top}px`;
  ui.cropOverlay.style.width = `${canvasRect.width}px`;
  ui.cropOverlay.style.height = `${canvasRect.height}px`;
}

function drawCropSelection() {
  if (!crop.rect) return;
  ui.cropSelection.style.left = `${crop.rect.x}px`;
  ui.cropSelection.style.top = `${crop.rect.y}px`;
  ui.cropSelection.style.width = `${crop.rect.width}px`;
  ui.cropSelection.style.height = `${crop.rect.height}px`;
  const scaleX = ui.imageCanvas.width / Math.max(1, ui.cropOverlay.clientWidth);
  const scaleY = ui.imageCanvas.height / Math.max(1, ui.cropOverlay.clientHeight);
  $('cropSizeLabel').textContent = `${Math.round(crop.rect.width * scaleX)} × ${Math.round(crop.rect.height * scaleY)} px`;
}

function cancelCrop(restore = true) {
  if (!crop.active) {
    ui.cropOverlay.hidden = true;
    ui.canvasStage.classList.remove('is-cropping');
    return;
  }
  if (restore) state.image.crop = crop.previousCrop ? { ...crop.previousCrop } : null;
  crop.active = false;
  crop.rect = null;
  crop.pointerId = null;
  crop.action = '';
  crop.previousCrop = null;
  ui.cropOverlay.hidden = true;
  ui.canvasStage.classList.remove('is-cropping');
  if (state.imageSource) renderImage();
}

function applyCropSelection() {
  if (!crop.active || !crop.rect) return;
  if (crop.rect.width < 8 || crop.rect.height < 8) {
    notify('Arraste para selecionar uma área de recorte maior.', 'error');
    return;
  }
  const scaleX = ui.imageCanvas.width / Math.max(1, ui.cropOverlay.clientWidth);
  const scaleY = ui.imageCanvas.height / Math.max(1, ui.cropOverlay.clientHeight);
  const x = clamp(Math.round(crop.rect.x * scaleX), 0, ui.imageCanvas.width - 1);
  const y = clamp(Math.round(crop.rect.y * scaleY), 0, ui.imageCanvas.height - 1);
  const width = clamp(Math.round(crop.rect.width * scaleX), 1, ui.imageCanvas.width - x);
  const height = clamp(Math.round(crop.rect.height * scaleY), 1, ui.imageCanvas.height - y);
  if (width < 1 || height < 1) {
    notify('Selecione uma área maior para recortar.', 'error');
    return;
  }
  state.image.crop = { x, y, width, height };
  crop.active = false;
  crop.rect = null;
  crop.previousCrop = null;
  ui.cropOverlay.hidden = true;
  ui.canvasStage.classList.remove('is-cropping');
  if (!state.image.outputCustom) {
    state.image.outputWidth = width;
    state.image.outputHeight = height;
  }
  renderImage();
  syncImageOutputFields();
  commitHistory();
  notify(`Recorte aplicado · ${width} × ${height} px`);
}

function cropPointerDown(event) {
  if (!crop.active || event.button !== 0) return;
  const bounds = ui.cropOverlay.getBoundingClientRect();
  const x = clamp(event.clientX - bounds.left, 0, bounds.width);
  const y = clamp(event.clientY - bounds.top, 0, bounds.height);
  const handle = event.target.closest('[data-handle]');
  crop.startX = x;
  crop.startY = y;
  crop.origin = crop.rect ? { ...crop.rect } : { x, y, width: 0, height: 0 };
  crop.handle = handle?.dataset.handle || '';
  if (handle) {
    crop.action = 'resize';
  } else if (crop.rect && x >= crop.rect.x && x <= crop.rect.x + crop.rect.width && y >= crop.rect.y && y <= crop.rect.y + crop.rect.height) {
    crop.action = 'move';
  } else {
    crop.action = 'draw';
    crop.rect = { x, y, width: 1, height: 1 };
  }
  crop.pointerId = event.pointerId;
  ui.cropOverlay.setPointerCapture(event.pointerId);
  drawCropSelection();
  event.preventDefault();
}

function cropPointerMove(event) {
  if (!crop.active || crop.pointerId !== event.pointerId || !crop.action || !crop.origin) return;
  const bounds = ui.cropOverlay.getBoundingClientRect();
  const x = clamp(event.clientX - bounds.left, 0, bounds.width);
  const y = clamp(event.clientY - bounds.top, 0, bounds.height);
  const dx = x - crop.startX;
  const dy = y - crop.startY;
  const origin = crop.origin;
  if (crop.action === 'move') {
    crop.rect = {
      ...origin,
      x: clamp(origin.x + dx, 0, bounds.width - origin.width),
      y: clamp(origin.y + dy, 0, bounds.height - origin.height),
    };
  } else if (crop.action === 'draw') {
    let width = Math.abs(dx);
    let height = Math.abs(dy);
    if (crop.ratio) {
      if (height === 0 || width / height > crop.ratio) height = width / crop.ratio;
      else width = height * crop.ratio;
      width = Math.min(width, dx >= 0 ? bounds.width - crop.startX : crop.startX);
      height = Math.min(height, dy >= 0 ? bounds.height - crop.startY : crop.startY);
      if (height * crop.ratio < width) width = height * crop.ratio;
      else height = width / crop.ratio;
    }
    crop.rect = { x: dx < 0 ? crop.startX - width : crop.startX, y: dy < 0 ? crop.startY - height : crop.startY, width, height };
  } else {
    const leftOrigin = origin.x;
    const topOrigin = origin.y;
    let left = leftOrigin;
    let top = topOrigin;
    let right = leftOrigin + origin.width;
    let bottom = topOrigin + origin.height;
    if (crop.handle.includes('w')) left = clamp(leftOrigin + dx, 0, right - 8);
    if (crop.handle.includes('e')) right = clamp(leftOrigin + origin.width + dx, left + 8, bounds.width);
    if (crop.handle.includes('n')) top = clamp(topOrigin + dy, 0, bottom - 8);
    if (crop.handle.includes('s')) bottom = clamp(topOrigin + origin.height + dy, top + 8, bounds.height);
    let width = right - left;
    let height = bottom - top;
    if (crop.ratio) {
      if (Math.abs(dx) >= Math.abs(dy)) height = width / crop.ratio;
      else width = height * crop.ratio;
      if (crop.handle.includes('w')) left = right - width;
      else right = left + width;
      if (crop.handle.includes('n')) top = bottom - height;
      else bottom = top + height;
      left = clamp(left, 0, bounds.width - 8);
      top = clamp(top, 0, bounds.height - 8);
      right = clamp(right, left + 8, bounds.width);
      bottom = clamp(bottom, top + 8, bounds.height);
    }
    crop.rect = { x: left, y: top, width: right - left, height: bottom - top };
  }
  drawCropSelection();
}

function cropPointerUp(event) {
  if (crop.pointerId !== event.pointerId) return;
  crop.pointerId = null;
  crop.action = '';
  crop.origin = null;
}

function rotateImage(degrees) {
  if (!state.imageSource) return;
  state.image.rotation = ((state.image.rotation + degrees) % 360 + 360) % 360;
  state.image.crop = null;
  if (!state.image.outputCustom && Math.abs(degrees) === 90) {
    [state.image.outputWidth, state.image.outputHeight] = [state.image.outputHeight, state.image.outputWidth];
  }
  if (crop.active) cancelCrop(false);
  renderImage();
  syncImageOutputFields();
  commitHistory();
  notify(`Imagem girada ${degrees > 0 ? 'à direita' : 'à esquerda'}.`);
}

function flipImage(axis) {
  if (!state.imageSource) return;
  if (axis === 'horizontal') state.image.flipH = !state.image.flipH;
  else state.image.flipV = !state.image.flipV;
  state.image.crop = null;
  renderImage();
  commitHistory();
  notify(axis === 'horizontal' ? 'Espelhamento horizontal aplicado.' : 'Espelhamento vertical aplicado.');
}

function startCompare() {
  if (!state.imageSource || crop.active) return;
  comparePressed = true;
  renderImage(true);
  $('compareButton').setAttribute('aria-pressed', 'true');
}

function stopCompare() {
  if (!comparePressed) return;
  comparePressed = false;
  $('compareButton').setAttribute('aria-pressed', 'false');
  renderImage();
}

function updateImageOutputDimensions(changed) {
  if (!state.imageSource) return;
  const baseWidth = ui.imageCanvas.width || state.image.outputWidth || 1;
  const baseHeight = ui.imageCanvas.height || state.image.outputHeight || 1;
  const ratio = baseWidth / Math.max(1, baseHeight);
  let width = clamp(Math.round(Number($('imageOutputWidth').value) || baseWidth), 1, 12000);
  let height = clamp(Math.round(Number($('imageOutputHeight').value) || baseHeight), 1, 12000);
  if ($('imageLockRatio').checked) {
    if (changed === 'width') height = clamp(Math.round(width / ratio), 1, 12000);
    else width = clamp(Math.round(height * ratio), 1, 12000);
  }
  const limited = constrainImageSize(width, height);
  state.image.outputWidth = limited.width;
  state.image.outputHeight = limited.height;
  state.image.outputCustom = true;
  syncImageOutputFields();
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function exportImage() {
  if (!state.imageSource || isExporting) return;
  stopCompare();
  if (crop.active) applyCropSelection();
  renderImage();
  const requestedWidth = clamp(Math.round(state.image.outputWidth || ui.imageCanvas.width), 1, 12000);
  const requestedHeight = clamp(Math.round(state.image.outputHeight || ui.imageCanvas.height), 1, 12000);
  const { width, height } = constrainImageSize(requestedWidth, requestedHeight);
  state.image.outputWidth = width;
  state.image.outputHeight = height;
  syncImageOutputFields();
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const context = output.getContext('2d');
  if (!context) {
    notify('Seu navegador não conseguiu criar a imagem final.', 'error');
    return;
  }
  if (state.image.outputFormat === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(ui.imageCanvas, 0, 0, width, height);
  try {
    const blob = await canvasToBlob(output, state.image.outputFormat, state.image.outputQuality);
    const extension = state.image.outputFormat === 'image/jpeg' ? 'jpg' : state.image.outputFormat === 'image/webp' ? 'webp' : 'png';
    downloadBlob(blob, `${cleanFilename(state.imageFileName)}-editzz.${extension}`);
    notify(`Imagem exportada · ${width} × ${height} px`);
  } catch {
    notify('Erro ao exportar a imagem.', 'error');
  }
}

function setExportUi(active, message = 'Renderizando cada quadro em tempo real…') {
  isExporting = active;
  $('exportShade').hidden = !active;
  $('exportButton').disabled = active || (state.mode === 'image' ? !state.imageSource : !state.clips.length);
  $('videoPanelExportButton').hidden = active;
  $('cancelExportButton').hidden = !active;
  $('exportProgressWrap').hidden = !active;
  $('importButton').disabled = active;
  updateHistoryButtons();
  if (active) {
    $('exportStatus').textContent = message;
    $('exportModalStatus').textContent = message;
    $('exportPercent').textContent = '0%';
    $('exportProgressBar').style.width = '0%';
    $('modalExportProgress').style.width = '0%';
  }
  updateStage();
}

function updateExportProgress(progress, message) {
  const percent = clamp(Math.round(progress * 100), 0, 100);
  $('exportStatus').textContent = message;
  $('exportModalStatus').textContent = message;
  $('exportPercent').textContent = `${percent}%`;
  $('exportProgressBar').style.width = `${percent}%`;
  $('modalExportProgress').style.width = `${percent}%`;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function cancelVideoExport() {
  if (!isExporting) return;
  cancelExportRequested = true;
  ui.videoSource.pause();
  ui.musicSource.pause();
  if (recorder && recorder.state !== 'inactive') {
    try { recorder.stop(); } catch { /* já foi finalizado */ }
  }
  $('exportModalStatus').textContent = 'Cancelando exportação…';
}

async function exportVideo() {
  if (!state.clips.length || isExporting) return;
  if (!HTMLCanvasElement.prototype.captureStream || !window.MediaRecorder) {
    notify('Este navegador não oferece gravação de vídeo por canvas. Use uma versão atual do Chrome, Edge ou Firefox.', 'error');
    return;
  }
  const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) {
    notify('Não foi encontrado um formato WebM compatível neste navegador.', 'error');
    return;
  }
  const originalClipId = state.activeClipId;
  const originalTime = currentLoadedClipId ? ui.videoSource.currentTime : 0;
  const wasPlaying = sequencePlaying;
  if (sequencePlaying) pausePreview();
  const fps = clamp(Number($('videoFrameRate').value) || 30, 12, 60);
  state.videoFrameRate = fps;
  state.videoResolution = $('videoResolution').value;
  state.videoAspect = $('videoAspect').value;
  state.videoBitrate = Number($('videoBitrate').value) || 5000000;
  exportAspectRatio = state.videoAspect === 'source'
    ? (state.clips[0].width / Math.max(1, state.clips[0].height))
    : null;
  exportOutputSize = null;
  if (state.videoResolution === 'source') {
    const ratioParts = String(state.videoAspect).split(':').map(Number);
    const ratio = exportAspectRatio || (ratioParts[0] && ratioParts[1] ? ratioParts[0] / ratioParts[1] : 16 / 9);
    const longSide = Math.min(1920, Math.max(state.clips[0].width, state.clips[0].height));
    const rawWidth = ratio >= 1 ? longSide : longSide * ratio;
    const rawHeight = ratio >= 1 ? longSide / ratio : longSide;
    exportOutputSize = {
      width: Math.max(2, Math.round(rawWidth / 2) * 2),
      height: Math.max(2, Math.round(rawHeight / 2) * 2),
    };
  }
  const exportCanvas = document.createElement('canvas');
  const { width, height } = getVideoOutputSize(exportCanvas);
  const totalDuration = Math.max(getTotalDuration(), 0.05);
  cancelExportRequested = false;
  recorderChunks = [];
  clipTransitioning = false;
  setExportUi(true);
  let captureStream;
  let audioTracks = [];
  let stopPromise;
  let recorderFailed = null;
  try {
    await activateClip(0, state.clips[0].start);
    const hasAudioGraph = ensureAudioGraph();
    if (hasAudioGraph && audioContext.state === 'suspended') await audioContext.resume();
    updateAudioGains();
    captureStream = exportCanvas.captureStream(fps);
    if (hasAudioGraph && audioDestination) {
      audioTracks = audioDestination.stream.getAudioTracks();
      audioTracks.forEach((track) => captureStream.addTrack(track));
    }
    recorder = new MediaRecorder(captureStream, { mimeType, videoBitsPerSecond: state.videoBitrate });
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) recorderChunks.push(event.data);
    });
    recorder.addEventListener('error', (event) => {
      recorderFailed = event.error || new Error('Falha durante a gravação do vídeo.');
      cancelExportRequested = true;
    });
    stopPromise = new Promise((resolve) => recorder.addEventListener('stop', resolve, { once: true }));
    try {
      recorder.start(400);
    } catch (error) {
      stopPromise = null;
      throw error;
    }
    const draw = () => {
      if (!isExporting || !recorder || recorder.state !== 'recording') return;
      renderVideoFrameTo(exportCanvas, getProjectTime());
      exportAnimationFrame = requestAnimationFrame(draw);
    };
    renderVideoFrameTo(exportCanvas, getProjectTime());
    exportAnimationFrame = requestAnimationFrame(draw);
    let offset = 0;
    for (let index = 0; index < state.clips.length; index += 1) {
      if (cancelExportRequested || recorder.state !== 'recording') break;
      const clip = state.clips[index];
      await activateClip(index, clip.start);
      updateAudioGains();
      if (index === 0) await playMusicFrom(0);
      else if (state.musicUrl && ui.musicSource.paused) await playMusicFrom(offset);
      updateExportProgress(offset / totalDuration, `Clipe ${index + 1} de ${state.clips.length} · ${clip.name}`);
      try {
        await ui.videoSource.play();
      } catch {
        throw new Error(`O navegador não conseguiu reproduzir ${clip.name}.`);
      }
      const startedAt = performance.now();
      while (ui.videoSource.currentTime < clip.end - 0.025 && !cancelExportRequested && recorder.state === 'recording') {
        const clipProgress = clamp((ui.videoSource.currentTime - clip.start) / Math.max(0.05, clip.end - clip.start), 0, 1);
        const projectProgress = offset + clipProgress * getClipPlayDuration(clip);
        updateExportProgress(projectProgress / totalDuration, `Renderizando clipe ${index + 1} de ${state.clips.length} · ${formatTime(projectProgress)}`);
        if (performance.now() - startedAt > (getClipPlayDuration(clip) + 45) * 1000) throw new Error(`A reprodução de ${clip.name} parou antes do fim.`);
        await delay(45);
      }
      ui.videoSource.pause();
      ui.musicSource.pause();
      offset += getClipPlayDuration(clip);
      updateExportProgress(offset / totalDuration, 'Finalizando arquivo…');
    }
    if (recorder.state !== 'inactive') recorder.stop();
    await stopPromise;
    cancelAnimationFrame(exportAnimationFrame);
    if (recorderFailed) throw recorderFailed;
    if (cancelExportRequested) {
      notify('Exportação cancelada. Nenhum arquivo foi baixado.', 'error');
    } else {
      const blob = new Blob(recorderChunks, { type: recorder.mimeType || mimeType });
      const base = cleanFilename(state.clips[0]?.name || 'editzz-video');
      downloadBlob(blob, `${base}-editzz.webm`);
      updateExportProgress(1, 'Vídeo pronto para baixar.');
      notify(`Vídeo exportado · ${width} × ${height} px`);
    }
  } catch (error) {
    console.error('Falha ao exportar o vídeo:', error);
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch { /* gravação finalizada */ }
    }
    if (stopPromise) await stopPromise.catch(() => {});
    notify(error.message || 'Não foi possível exportar o vídeo.', 'error');
  } finally {
    cancelAnimationFrame(exportAnimationFrame);
    if (captureStream) captureStream.getVideoTracks().forEach((track) => track.stop());
    recorder = null;
    recorderChunks = [];
    exportAspectRatio = null;
    exportOutputSize = null;
    setExportUi(false);
    const restoreIndex = Math.max(0, state.clips.findIndex((clip) => clip.id === originalClipId));
    if (state.clips.length) {
      await activateClip(restoreIndex, originalTime).catch(() => {});
      if (wasPlaying && !cancelExportRequested) await playPreview();
    }
    cancelExportRequested = false;
    renderVideoFrame();
    updateStage();
  }
}

function resetActivePanel() {
  const panel = state.activePanel;
  if (state.mode === 'image') {
    if (panel === 'adjust') {
      Object.assign(state.image, { brightness: 0, exposure: 0, contrast: 0, saturation: 0, warmth: 0, hue: 0, blur: 0, vignette: 0 });
      syncImageControls(); renderImage(); commitHistory(); notify('Ajustes de imagem redefinidos.');
    } else if (panel === 'filters') {
      state.image.filter = 'original'; state.image.filterIntensity = 100;
      syncImageControls(); renderImage(); commitHistory(); notify('Filtro original restaurado.');
    } else if (panel === 'crop') {
      if (crop.active) cancelCrop();
      state.image.crop = null; state.image.rotation = 0; state.image.flipH = false; state.image.flipV = false;
      renderImage(); syncImageOutputFields(); commitHistory(); notify('Enquadramento redefinido.');
    } else if (panel === 'text') {
      state.image.text = ''; state.image.textColor = '#ffffff'; state.image.textSize = 48; state.image.textBackground = true; state.image.textPosition = 0.84;
      syncImageControls(); renderImage(); commitHistory(); notify('Texto removido da imagem.');
    } else if (panel === 'image-export') {
      const { width, height } = getImageSourceSize();
      state.image.outputWidth = width; state.image.outputHeight = height; state.image.outputCustom = false;
      state.image.outputFormat = 'image/png'; state.image.outputQuality = 0.92;
      syncImageControls(); commitHistory(); notify('Opções de exportação redefinidas.');
    }
    return;
  }
  if (panel === 'video-look') {
    state.videoLook = videoLookDefaults(); syncVideoLookControls(); renderVideoFrame(); commitHistory(); notify('Visual do vídeo redefinido.');
  } else if (panel === 'clips') {
    const clip = getClip();
    if (!clip) return;
    clip.start = 0; clip.end = clip.duration; clip.speed = 1; clip.muted = false;
    activateClip(getSelectedClipIndex(), 0).catch(() => {});
    renderClipList(); updateTimelineUI(); commitHistory(); notify('Clipe restaurado ao original.');
  } else if (panel === 'captions') {
    state.captions = []; renderCaptions(); renderVideoFrame(); commitHistory(); notify('Legendas removidas.');
  } else if (panel === 'audio') {
    state.videoVolume = 1; state.musicVolume = 0.35; syncVideoSettings(); updateAudioGains(); commitHistory(); notify('Níveis de áudio redefinidos.');
  } else if (panel === 'video-export') {
    state.videoResolution = '1080'; state.videoFrameRate = 30; state.videoBitrate = 5000000;
    syncVideoSettings(); commitHistory(); notify('Opções de exportação redefinidas.');
  }
}

function bindEvents() {
  ui.modeButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $('importButton').addEventListener('click', () => (state.mode === 'image' ? ui.imageInput : ui.videoInput).click());
  $('emptyImportButton').addEventListener('click', () => (state.mode === 'image' ? ui.imageInput : ui.videoInput).click());
  $('addVideoButton').addEventListener('click', () => ui.videoInput.click());
  $('panelAddVideoButton').addEventListener('click', () => ui.videoInput.click());
  $('imagePanelExportButton').addEventListener('click', exportImage);
  $('videoPanelExportButton').addEventListener('click', exportVideo);
  $('exportButton').addEventListener('click', () => state.mode === 'image' ? exportImage() : exportVideo());
  $('undoButton').addEventListener('click', undo);
  $('redoButton').addEventListener('click', redo);
  $('resetButton').addEventListener('click', resetActivePanel);
  $('fitButton').addEventListener('click', () => {
    if (state.mode === 'image') renderImage();
    else renderVideoFrame();
    notify('Pré-visualização ajustada à área de trabalho.');
  });
  $('compareButton').addEventListener('pointerdown', (event) => { event.preventDefault(); startCompare(); });
  $('compareButton').addEventListener('pointerup', stopCompare);
  $('compareButton').addEventListener('pointerleave', stopCompare);
  $('compareButton').addEventListener('pointercancel', stopCompare);
  $('compareButton').addEventListener('blur', stopCompare);

  ui.imageInput.addEventListener('change', () => {
    const [file] = ui.imageInput.files || [];
    if (file) loadImageFile(file);
    ui.imageInput.value = '';
  });
  ui.videoInput.addEventListener('change', () => {
    addVideoFiles(ui.videoInput.files || []);
    ui.videoInput.value = '';
  });
  ui.musicInput.addEventListener('change', () => {
    const [file] = ui.musicInput.files || [];
    if (file) loadMusicFile(file);
    ui.musicInput.value = '';
  });
  ui.srtInput.addEventListener('change', () => {
    const [file] = ui.srtInput.files || [];
    if (file) importSrtFile(file);
    ui.srtInput.value = '';
  });
  $('addMusicButton').addEventListener('click', () => ui.musicInput.click());
  $('removeMusicButton').addEventListener('click', removeMusic);
  $('importSrtButton').addEventListener('click', () => ui.srtInput.click());
  $('exportSrtButton').addEventListener('click', exportSrt);
  $('addCaptionButton').addEventListener('click', addCaption);
  $('captionList').addEventListener('click', handleCaptionListClick);
  $('captionPosition').addEventListener('change', () => {
    state.captionPosition = $('captionPosition').value;
    renderVideoFrame(); commitHistory();
  });

  document.querySelectorAll('[data-open-panel]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.openPanel)));
  document.querySelectorAll('[data-image-param]').forEach((input) => {
    input.addEventListener('input', () => {
      const key = input.dataset.imageParam;
      state.image[key] = Number(input.value);
      updateRangeOutput(input, input.value, key === 'hue' ? '°' : key === 'filterIntensity' ? '%' : '');
      scheduleImageRender();
      if (key === 'filterIntensity') renderImageFilters();
    });
    input.addEventListener('change', () => { renderImage(); commitHistory(); });
  });
  document.querySelectorAll('[data-video-param]').forEach((input) => {
    input.addEventListener('input', () => {
      const key = input.dataset.videoParam;
      state.videoLook[key] = Number(input.value);
      if (key === 'fadeDuration') $('vidFadeValue').textContent = `${Number(input.value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
      else updateRangeOutput(input, input.value);
      renderVideoFrame();
    });
    input.addEventListener('change', () => commitHistory());
  });

  $('imageOverlayText').addEventListener('input', () => { state.image.text = $('imageOverlayText').value; scheduleImageRender(); });
  $('imageOverlayText').addEventListener('change', commitHistory);
  $('imageTextColor').addEventListener('input', () => {
    state.image.textColor = $('imageTextColor').value;
    $('imageTextColorValue').textContent = state.image.textColor.toUpperCase(); renderImage();
  });
  $('imageTextColor').addEventListener('change', commitHistory);
  $('imageTextSize').addEventListener('input', () => { state.image.textSize = clamp(Number($('imageTextSize').value) || 48, 12, 180); renderImage(); });
  $('imageTextSize').addEventListener('change', commitHistory);
  $('imageTextBackground').addEventListener('change', () => { state.image.textBackground = $('imageTextBackground').checked; renderImage(); commitHistory(); });
  $('imageTextPosition').addEventListener('change', () => { state.image.textPosition = Number($('imageTextPosition').value); renderImage(); commitHistory(); });

  $('imageRatioGrid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-ratio]');
    if (button) setImageCropRatio(button.dataset.ratio);
  });
  $('applyCropButton').addEventListener('click', applyCropSelection);
  $('cancelCropButton').addEventListener('click', () => cancelCrop());
  $('rotateLeftButton').addEventListener('click', () => rotateImage(-90));
  $('rotateRightButton').addEventListener('click', () => rotateImage(90));
  $('flipHorizontalButton').addEventListener('click', () => flipImage('horizontal'));
  $('flipVerticalButton').addEventListener('click', () => flipImage('vertical'));
  ui.cropOverlay.addEventListener('pointerdown', cropPointerDown);
  ui.cropOverlay.addEventListener('pointermove', cropPointerMove);
  ui.cropOverlay.addEventListener('pointerup', cropPointerUp);
  ui.cropOverlay.addEventListener('pointercancel', cropPointerUp);

  $('imageOutputWidth').addEventListener('change', () => { updateImageOutputDimensions('width'); commitHistory(); });
  $('imageOutputHeight').addEventListener('change', () => { updateImageOutputDimensions('height'); commitHistory(); });
  $('imageOutputFormat').addEventListener('change', () => {
    state.image.outputFormat = $('imageOutputFormat').value;
    updateImageQualityVisibility(); commitHistory();
  });
  $('imageQuality').addEventListener('input', () => {
    state.image.outputQuality = Number($('imageQuality').value) / 100;
    $('imageQualityValue').textContent = `${$('imageQuality').value}%`;
  });
  $('imageQuality').addEventListener('change', commitHistory);

  $('videoChromaEnabled').addEventListener('change', () => {
    state.videoLook.chromaEnabled = $('videoChromaEnabled').checked;
    renderVideoFrame(); commitHistory();
    notify(state.videoLook.chromaEnabled ? 'Chroma key ativado · ajuste a cor e a tolerância.' : 'Chroma key desativado.');
  });
  $('videoChromaColor').addEventListener('input', () => {
    state.videoLook.chromaColor = $('videoChromaColor').value;
    $('videoChromaColorValue').textContent = state.videoLook.chromaColor.toUpperCase();
    renderVideoFrame();
  });
  $('videoChromaColor').addEventListener('change', commitHistory);
  $('videoChromaBackground').addEventListener('input', () => {
    state.videoLook.chromaBackground = $('videoChromaBackground').value;
    $('videoChromaBackgroundValue').textContent = state.videoLook.chromaBackground.toUpperCase();
    renderVideoFrame();
  });
  $('videoChromaBackground').addEventListener('change', commitHistory);
  $('videoChromaTolerance').addEventListener('input', () => {
    state.videoLook.chromaTolerance = Number($('videoChromaTolerance').value);
    $('videoChromaToleranceValue').textContent = String(state.videoLook.chromaTolerance);
    renderVideoFrame();
  });
  $('videoChromaTolerance').addEventListener('change', commitHistory);
  $('videoTitle').addEventListener('input', () => { state.videoLook.title = $('videoTitle').value; renderVideoFrame(); });
  $('videoTitle').addEventListener('change', commitHistory);
  $('videoTitleColor').addEventListener('input', () => {
    state.videoLook.titleColor = $('videoTitleColor').value;
    $('videoTitleColorValue').textContent = state.videoLook.titleColor.toUpperCase(); renderVideoFrame();
  });
  $('videoTitleColor').addEventListener('change', commitHistory);
  $('videoTitleSize').addEventListener('input', () => { state.videoLook.titleSize = clamp(Number($('videoTitleSize').value) || 52, 18, 120); renderVideoFrame(); });
  $('videoTitleSize').addEventListener('change', commitHistory);
  $('videoSticker').addEventListener('change', () => { state.videoLook.sticker = $('videoSticker').value; renderVideoFrame(); commitHistory(); });

  $('clipList').addEventListener('click', selectClipFromEvent);
  $('clipList').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      if (!event.target.closest('[data-action]')) selectClipFromEvent(event);
    }
  });
  $('clipTrack').addEventListener('click', selectClipFromEvent);
  $('removeSelectedClipButton').addEventListener('click', removeSelectedClip);
  $('clipTrimStart').addEventListener('change', () => trimSelectedClip('start'));
  $('clipTrimEnd').addEventListener('change', () => trimSelectedClip('end'));
  $('clipSpeed').addEventListener('change', updateClipSpeed);
  $('clipMuted').addEventListener('change', updateClipMute);
  $('videoAspect').addEventListener('change', () => { updateVideoAspectAndResolution(); commitHistory(); });
  $('videoResolution').addEventListener('change', () => { updateVideoAspectAndResolution(); commitHistory(); });
  $('videoFrameRate').addEventListener('change', () => { state.videoFrameRate = Number($('videoFrameRate').value) || 30; commitHistory(); });
  $('videoBitrate').addEventListener('change', () => { state.videoBitrate = Number($('videoBitrate').value) || 5000000; commitHistory(); });
  $('videoVolume').addEventListener('input', () => {
    state.videoVolume = Number($('videoVolume').value) / 100;
    $('videoVolumeValue').textContent = `${$('videoVolume').value}%`;
    updateAudioGains();
  });
  $('videoVolume').addEventListener('change', commitHistory);
  $('musicVolume').addEventListener('input', () => {
    state.musicVolume = Number($('musicVolume').value) / 100;
    $('musicVolumeValue').textContent = `${$('musicVolume').value}%`;
    updateAudioGains();
  });
  $('musicVolume').addEventListener('change', commitHistory);

  $('playButton').addEventListener('click', togglePlayback);
  $('splitClipButton').addEventListener('click', splitClipAtPlayhead);
  $('saveFrameButton').addEventListener('click', downloadCurrentFrame);
  $('timelineSeek').addEventListener('pointerdown', () => { isScrubbing = true; if (sequencePlaying) pausePreview(); });
  $('timelineSeek').addEventListener('pointerup', () => { isScrubbing = false; onTimelineInput(); });
  $('timelineSeek').addEventListener('input', onTimelineInput);
  $('timelineSeek').addEventListener('change', () => { isScrubbing = false; onTimelineInput(); });
  $('cancelExportButton').addEventListener('click', cancelVideoExport);
  $('modalCancelExport').addEventListener('click', cancelVideoExport);

  ui.videoSource.addEventListener('timeupdate', handleVideoTimeUpdate);
  ui.videoSource.addEventListener('loadedmetadata', () => {
    resizeVideoCanvas(); renderVideoFrame(); updateTimelineUI();
  });
  ui.videoSource.addEventListener('seeked', () => { renderVideoFrame(); updateTimelineUI(); });
  ui.videoSource.addEventListener('ended', () => { if (sequencePlaying) moveToNextClip(); });
  ui.musicSource.addEventListener('loadedmetadata', () => {
    if (state.musicUrl) {
      state.musicDuration = Number.isFinite(ui.musicSource.duration) ? ui.musicSource.duration : 0;
      updateMusicUI();
    }
  });

  ui.canvasStage.addEventListener('dragenter', (event) => { event.preventDefault(); ui.canvasStage.classList.add('is-drag-over'); });
  ui.canvasStage.addEventListener('dragover', (event) => { event.preventDefault(); ui.canvasStage.classList.add('is-drag-over'); });
  ui.canvasStage.addEventListener('dragleave', (event) => {
    if (!ui.canvasStage.contains(event.relatedTarget)) ui.canvasStage.classList.remove('is-drag-over');
  });
  ui.canvasStage.addEventListener('drop', (event) => {
    event.preventDefault();
    ui.canvasStage.classList.remove('is-drag-over');
    const files = [...(event.dataTransfer?.files || [])];
    const image = files.find((file) => file.type.startsWith('image/'));
    const videos = files.filter(isVideoFile);
    if (state.mode === 'image' && image) loadImageFile(image);
    else if (videos.length) addVideoFiles(videos);
    else if (image) loadImageFile(image);
    else notify('Esse tipo de arquivo não é compatível com este espaço.', 'error');
  });

  window.addEventListener('resize', () => {
    if (state.imageSource) renderImage();
    if (crop.active) requestAnimationFrame(positionCropOverlay);
    if (state.clips.length) renderVideoFrame();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && crop.active) { cancelCrop(); return; }
    if (event.key === 'Escape' && isExporting) { cancelVideoExport(); return; }
    const editable = event.target instanceof HTMLElement && (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName));
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
      event.preventDefault(); (state.mode === 'image' ? ui.imageInput : ui.videoInput).click(); return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault(); state.mode === 'image' ? exportImage() : exportVideo(); return;
    }
    if (!editable && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault(); event.shiftKey ? redo() : undo(); return;
    }
    if (!editable && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault(); redo(); return;
    }
    if (!editable && event.code === 'Space' && state.mode === 'video' && state.clips.length) {
      event.preventDefault(); togglePlayback();
    }
  });
}

function init() {
  renderImageFilters();
  syncImageControls();
  syncVideoLookControls();
  syncVideoSettings();
  updateMusicUI();
  renderCaptions();
  bindEvents();
  showPanel('adjust');
  updateStage();
  resetHistory();
  window.addEventListener('beforeunload', () => {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
  });
}

init();
