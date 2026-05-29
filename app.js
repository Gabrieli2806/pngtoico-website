const fileInput = document.querySelector("#file-input");
const dropZone = document.querySelector("#drop-zone");
const fileList = document.querySelector("#file-list");
const emptyState = document.querySelector("#empty-state");
const convertBtn = document.querySelector("#convert-btn");
const clearBtn = document.querySelector("#clear-btn");
const statusText = document.querySelector("#status-text");
const progressFill = document.querySelector("#progress-fill");
const progressLabel = document.querySelector("#progress-label");
const fileCount = document.querySelector("#file-count");
const doneCount = document.querySelector("#done-count");
const totalSize = document.querySelector("#total-size");
const zipNameInput = document.querySelector("#zip-name");
const sizeOptions = document.querySelector("#size-options");

let selectedFiles = [];
let statuses = new Map();
let objectUrls = [];
let isConverting = false;

fileInput.addEventListener("change", () => addFiles(fileInput.files));

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("is-dragging");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");
  addFiles(event.dataTransfer.files);
});

clearBtn.addEventListener("click", clearFiles);
convertBtn.addEventListener("click", convertSelectedFiles);
sizeOptions.addEventListener("change", updateConvertState);

function addFiles(fileListLike) {
  const incoming = Array.from(fileListLike).filter((file) => file.type === "image/png");
  const known = new Set(selectedFiles.map((file) => fileKey(file)));

  for (const file of incoming) {
    const key = fileKey(file);
    if (!known.has(key)) {
      selectedFiles.push(file);
      statuses.set(key, "Listo");
      known.add(key);
    }
  }

  fileInput.value = "";
  renderFiles();
  updateSummary();
  updateConvertState();

  if (incoming.length === 0 && fileListLike.length > 0) {
    statusText.textContent = "Solo se aceptan archivos PNG.";
  } else if (selectedFiles.length > 0) {
    statusText.textContent = `${selectedFiles.length} PNG listos para convertir.`;
  }
}

function clearFiles() {
  selectedFiles = [];
  statuses.clear();
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls = [];
  isConverting = false;
  setProgress(0);
  renderFiles();
  updateSummary();
  updateConvertState();
  statusText.textContent = "Selecciona archivos PNG para empezar.";
}

async function convertSelectedFiles() {
  const sizes = getSelectedSizes();
  if (selectedFiles.length === 0 || sizes.length === 0 || isConverting) return;

  isConverting = true;
  convertBtn.disabled = true;
  clearBtn.disabled = true;
  doneCount.textContent = "0";
  setProgress(0);
  statusText.textContent = "Convirtiendo archivos...";

  const converted = [];
  let completed = 0;

  for (const file of selectedFiles) {
    const key = fileKey(file);
    statuses.set(key, "Convirtiendo");
    renderFiles();

    try {
      const icoBlob = await pngFileToIco(file, sizes);
      converted.push({
        blob: icoBlob,
        name: `${nameWithoutExtension(file.name)}.ico`,
      });
      statuses.set(key, "Convertido");
    } catch (error) {
      statuses.set(key, "Error");
      console.error(error);
    }

    completed += 1;
    doneCount.textContent = String(converted.length);
    setProgress(Math.round((completed / selectedFiles.length) * 100));
    renderFiles();
    await waitForPaint();
  }

  if (converted.length === 0) {
    statusText.textContent = "No se pudo convertir ningun archivo.";
  } else if (converted.length === 1) {
    downloadBlob(converted[0].blob, converted[0].name);
    statusText.textContent = "Archivo ICO descargado.";
  } else {
    const zipBlob = await buildZipBlob(converted);
    downloadBlob(zipBlob, `${safeName(zipNameInput.value || "iconos-convertidos")}.zip`);
    statusText.textContent = `${converted.length} iconos descargados en ZIP.`;
  }

  isConverting = false;
  clearBtn.disabled = false;
  updateConvertState();
}

async function pngFileToIco(file, sizes) {
  const image = await loadImage(file);
  const pngBuffers = [];

  for (const size of sizes) {
    const blob = await resizeToPng(image, size);
    pngBuffers.push({
      size,
      buffer: await blob.arrayBuffer(),
    });
  }

  return new Blob([buildIco(pngBuffers)], { type: "image/x-icon" });
}

function buildIco(entries) {
  const directorySize = 6 + entries.length * 16;
  const totalSize =
    directorySize + entries.reduce((sum, entry) => sum + entry.buffer.byteLength, 0);
  const ico = new ArrayBuffer(totalSize);
  const view = new DataView(ico);
  const bytes = new Uint8Array(ico);
  let offset = 0;

  view.setUint16(offset, 0, true);
  offset += 2;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, entries.length, true);
  offset += 2;

  let imageOffset = directorySize;
  for (const entry of entries) {
    const dimension = entry.size >= 256 ? 0 : entry.size;
    view.setUint8(offset, dimension);
    view.setUint8(offset + 1, dimension);
    view.setUint8(offset + 2, 0);
    view.setUint8(offset + 3, 0);
    view.setUint16(offset + 4, 1, true);
    view.setUint16(offset + 6, 32, true);
    view.setUint32(offset + 8, entry.buffer.byteLength, true);
    view.setUint32(offset + 12, imageOffset, true);
    offset += 16;

    bytes.set(new Uint8Array(entry.buffer), imageOffset);
    imageOffset += entry.buffer.byteLength;
  }

  return ico;
}

function resizeToPng(image, size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const x = Math.round((size - width) / 2);
  const y = Math.round((size - height) / 2);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, x, y, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo generar PNG"));
    }, "image/png");
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo leer ${file.name}`));
    };
    image.src = url;
  });
}

function renderFiles() {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls = [];
  fileList.innerHTML = "";
  emptyState.hidden = selectedFiles.length > 0;
  fileList.hidden = selectedFiles.length === 0;

  for (const file of selectedFiles) {
    const key = fileKey(file);
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    const status = statuses.get(key) || "Listo";
    const item = document.createElement("li");
    item.className = "file-item";
    item.innerHTML = `
      <img class="thumb" src="${url}" alt="">
      <span>
        <span class="file-name">${escapeHtml(file.name)}</span>
        <span class="file-meta">${formatBytes(file.size)}</span>
      </span>
      <span class="badge ${statusClass(status)}">${status}</span>
    `;
    fileList.appendChild(item);
  }
}

function updateSummary() {
  fileCount.textContent = String(selectedFiles.length);
  totalSize.textContent = formatBytes(selectedFiles.reduce((sum, file) => sum + file.size, 0));
  if (selectedFiles.length === 0) doneCount.textContent = "0";
}

function updateConvertState() {
  convertBtn.disabled = selectedFiles.length === 0 || getSelectedSizes().length === 0 || isConverting;
}

function getSelectedSizes() {
  return Array.from(sizeOptions.querySelectorAll("input:checked"))
    .map((input) => Number(input.value))
    .sort((a, b) => a - b);
}

function setProgress(value) {
  progressFill.style.width = `${value}%`;
  progressLabel.textContent = `${value}%`;
}

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function nameWithoutExtension(name) {
  return safeName(name.replace(/\.[^.]+$/, ""));
}

function safeName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "icono";
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function statusClass(status) {
  if (status === "Convertido") return "done";
  if (status === "Error") return "error";
  return "";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function buildZipBlob(items) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const item of items) {
    const fileBytes = new Uint8Array(await item.blob.arrayBuffer());
    const nameBytes = encoder.encode(item.name);
    const crc = crc32(fileBytes);
    const localHeader = new ArrayBuffer(30 + nameBytes.length);
    const localView = new DataView(localHeader);

    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, fileBytes.byteLength, true);
    localView.setUint32(22, fileBytes.byteLength, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    new Uint8Array(localHeader).set(nameBytes, 30);

    const centralHeader = new ArrayBuffer(46 + nameBytes.length);
    const centralView = new DataView(centralHeader);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, fileBytes.byteLength, true);
    centralView.setUint32(24, fileBytes.byteLength, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    new Uint8Array(centralHeader).set(nameBytes, 46);

    localParts.push(localHeader, fileBytes);
    centralParts.push(centralHeader);
    offset += localHeader.byteLength + fileBytes.byteLength;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
  const endRecord = new ArrayBuffer(22);
  const endView = new DataView(endRecord);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, items.length, true);
  endView.setUint16(10, items.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  return new Blob([...localParts, ...centralParts, endRecord], { type: "application/zip" });
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function waitForPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}
