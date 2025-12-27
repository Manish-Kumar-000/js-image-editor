/* ==========================
   TRANSFORM STATE
========================== */
let rotation = 0;
let flipX = 1;
let flipY = 1;

let isCropping = false;
let isSelectingCrop = false;
let cropRect = null;

/* ==========================
   FILTER STATE (BRAIN)
========================== */
const filters = {
  brightness: { value: 100, min: 0, max: 200, unit: "%" },
  contrast: { value: 100, min: 0, max: 200, unit: "%" },
  saturation: { value: 100, min: 0, max: 200, unit: "%" },
  blur: { value: 0, min: 0, max: 20, unit: "px" },
  grayscale: { value: 0, min: 0, max: 100, unit: "%" },
  sepia: { value: 0, min: 0, max: 100, unit: "%" }
};

/* ==========================
   PRESETS
========================== */
const presets = {
  normal: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    grayscale: 0,
    sepia: 0,
  },

  warm: {
    brightness: 110,
    contrast: 105,
    saturation: 120,
    blur: 0,
    grayscale: 0,
    sepia: 20,
  },

  cool: {
    brightness: 95,
    contrast: 110,
    saturation: 90,
    blur: 0,
    grayscale: 0,
    sepia: 0,
  },

  vintage: {
    brightness: 105,
    contrast: 95,
    saturation: 80,
    blur: 1,
    grayscale: 10,
    sepia: 35,
  },

  bw: {
    brightness: 100,
    contrast: 120,
    saturation: 0,
    blur: 0,
    grayscale: 100,
    sepia: 0,
  }
};


/* ==========================
   DOM ELEMENTS
========================== */
const chooseBtn = document.getElementById("chooseBtn");
const uploadInput = document.getElementById("upload");
const resetBtn = document.getElementById("reset");
const downloadBtn = document.getElementById("download");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const wrapper = document.querySelector(".canvas-wrapper");
const placeholder = document.querySelector(".placeholder");
const filtersContainer = document.getElementById("filters-container");

/* ==========================
   IMAGE OBJECT
========================== */
const img = new Image();

/* ==========================
   FILTER APPLY
========================== */
function applyFilters() {
  ctx.filter = `
    brightness(${filters.brightness.value}${filters.brightness.unit})
    contrast(${filters.contrast.value}${filters.contrast.unit})
    saturate(${filters.saturation.value}${filters.saturation.unit})
    blur(${filters.blur.value}${filters.blur.unit})
    grayscale(${filters.grayscale.value}${filters.grayscale.unit})
    sepia(${filters.sepia.value}${filters.sepia.unit})
  `;
}

/* ==========================
   DRAW IMAGE (CORE)
========================== */
function drawImage() {
  if (!img.src) return;

  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;

  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0, 0, w, h);
  applyFilters();

  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;

  const offsetX = (w - dw) / 2;
  const offsetY = (h - dh) / 2;

  const angle = rotation * Math.PI / 180;

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(angle);
  ctx.scale(flipX, flipY);
  ctx.translate(-w / 2, -h / 2);

  ctx.drawImage(img, offsetX, offsetY, dw, dh);
  ctx.restore();

  if (isCropping && cropRect) {
    drawCropRect();
  }
}

function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) return;

  // update filters object
  Object.keys(filters).forEach((key) => {
    filters[key].value = preset[key];
  });

  // update sliders + values text
  document.querySelectorAll(".filter").forEach((filterDiv) => {
    const input = filterDiv.querySelector("input");
    const valueText = filterDiv.querySelector(".filter-value");
    const key = input.id;

    input.value = filters[key].value;
    valueText.textContent = `${filters[key].value}${filters[key].unit}`;
  });

  drawImage();
}


/* ==========================
   CROP OVERLAY
========================== */
function drawCropRect() {
  const { x, y, w, h } = cropRect;

  ctx.save();
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.setLineDash([6]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/* ==========================
   CROP EVENTS
========================== */
canvas.addEventListener("mousedown", (e) => {
  if (!isCropping) return;
  isSelectingCrop = true;
  cropRect = { x: e.offsetX, y: e.offsetY, w: 0, h: 0 };
});

canvas.addEventListener("mousemove", (e) => {
  if (!isCropping || !isSelectingCrop) return;

  cropRect.w = e.offsetX - cropRect.x;
  cropRect.h = e.offsetY - cropRect.y;

  drawImage();
});

canvas.addEventListener("mouseup", () => {
  if (!isCropping) return;
  isSelectingCrop = false; // 🔥 lock crop
});

/* ==========================
   BUTTON EVENTS
========================== */
chooseBtn.onclick = () => uploadInput.click();

uploadInput.onchange = () => {
  const file = uploadInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => (img.src = reader.result);
  reader.readAsDataURL(file);
};

img.onload = () => {
  canvas.style.display = "block";
  placeholder.style.display = "none";
  drawImage();
};

document.getElementById("cropBtn").onclick = () => {
  if (!img.src) return;
  isCropping = true;
  cropRect = null;
};

document.getElementById("applyCrop").onclick = () => {
  if (!cropRect || isSelectingCrop) return;

  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;

  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;

  const offsetX = (w - dw) / 2;
  const offsetY = (h - dh) / 2;

  const sx = (cropRect.x - offsetX) / scale;
  const sy = (cropRect.y - offsetY) / scale;
  const sw = cropRect.w / scale;
  const sh = cropRect.h / scale;

  if (sw <= 5 || sh <= 5) return;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = sw;
  tempCanvas.height = sh;

  const tctx = tempCanvas.getContext("2d");
  tctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  img.src = tempCanvas.toDataURL();

  isCropping = false;
  cropRect = null;
};

document.getElementById("rotateLeft").onclick = () => {
  rotation -= 90;
  drawImage();
};

document.getElementById("rotateRight").onclick = () => {
  rotation += 90;
  drawImage();
};

resetBtn.onclick = () => {
  img.src = "";
  uploadInput.value = "";
  canvas.style.display = "none";
  placeholder.style.display = "flex";

  rotation = 0;
  flipX = 1;
  flipY = 1;

  Object.keys(filters).forEach(k => {
    filters[k].value =
      k === "blur" || k === "grayscale" || k === "sepia" ? 0 : 100;
  });

  ctx.filter = "none";
};

downloadBtn.onclick = () => {
  if (!img.src) return;
  const link = document.createElement("a");
  link.download = "edited-image.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
};

/* ==========================
   FILTER UI
========================== */
function createFilterElement(name, filter) {
  const div = document.createElement("div");
  div.className = "filter";

  const label = document.createElement("p");
  label.textContent = name.charAt(0).toUpperCase() + name.slice(1);

  const value = document.createElement("span");
  value.className = "filter-value";
  value.textContent = `${filter.value}${filter.unit}`;

  const input = document.createElement("input");
  input.type = "range";
  input.min = filter.min;
  input.max = filter.max;
  input.value = filter.value;
  input.id = name;

  input.oninput = (e) => {
    filter.value = e.target.value;
    value.textContent = `${filter.value}${filter.unit}`;
    drawImage();
  };

  div.append(label, value, input);
  return div;
}

Object.keys(filters).forEach((key) => {
  filtersContainer.appendChild(
    createFilterElement(key, filters[key])
  );
});
