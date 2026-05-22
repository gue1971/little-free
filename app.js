const pages = Array.from({ length: 12 }, (_, index) => {
  return `images/${String(index + 1).padStart(2, "0")}.png`;
});

const image = document.getElementById("page");
const status = document.getElementById("status");

let pageIndex = 0;
let turning = false;
let scale = 1;
let pageX = 0;
let pageY = 0;
let tapStart = null;
let dragStart = null;
let pinchStart = null;
let gestureHadPinch = false;

const pointers = new Map();
const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clampPage(index) {
  return Math.max(0, Math.min(pages.length - 1, index));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampOffset(x, y, nextScale = scale) {
  const maxX = Math.max(0, (image.offsetWidth * (nextScale - 1)) / 2);
  const maxY = Math.max(0, (image.offsetHeight * (nextScale - 1)) / 2);

  return {
    x: clamp(x, -maxX, maxX),
    y: clamp(y, -maxY, maxY)
  };
}

function applyTransform() {
  const clamped = clampOffset(pageX, pageY);
  pageX = clamped.x;
  pageY = clamped.y;
  image.style.setProperty("--page-x", `${pageX}px`);
  image.style.setProperty("--page-y", `${pageY}px`);
  image.style.setProperty("--page-scale", String(scale));
}

function resetZoom() {
  scale = 1;
  pageX = 0;
  pageY = 0;
  applyTransform();
}

function updatePage(nextIndex, direction) {
  const clamped = clampPage(nextIndex);

  if (clamped === pageIndex || turning) {
    return;
  }

  turning = true;
  resetZoom();
  image.classList.add(direction === "prev" ? "is-turning-prev" : "is-turning-next");

  window.setTimeout(() => {
    pageIndex = clamped;
    image.src = pages[pageIndex];
    status.textContent = `${pageIndex + 1} / ${pages.length}`;
    image.classList.remove("is-turning-prev", "is-turning-next");
    turning = false;
  }, 150);
}

function nextPage() {
  updatePage(pageIndex + 1, "next");
}

function prevPage() {
  updatePage(pageIndex - 1, "prev");
}

function handlePointTurn(clientX) {
  if (clientX < window.innerWidth * 0.35) {
    prevPage();
    return;
  }

  nextPage();
}

function getPointerList() {
  return Array.from(pointers.values());
}

function getDistance(first, second) {
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

function getMidpoint(first, second) {
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2
  };
}

function startPinch() {
  const [first, second] = getPointerList();
  const midpoint = getMidpoint(first, second);
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  gestureHadPinch = true;
  pinchStart = {
    distance: Math.max(1, getDistance(first, second)),
    scale,
    contentX: (midpoint.x - centerX - pageX) / scale,
    contentY: (midpoint.y - centerY - pageY) / scale
  };
  image.classList.add("is-interacting");
}

function capturePointer(pointerId) {
  if (image.setPointerCapture) {
    image.setPointerCapture(pointerId);
  }
}

function releasePointer(pointerId) {
  if (image.releasePointerCapture && image.hasPointerCapture?.(pointerId)) {
    image.releasePointerCapture(pointerId);
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === " ") {
    event.preventDefault();
    nextPage();
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    prevPage();
  }
});

document.addEventListener("pointerdown", (event) => {
  capturePointer(event.pointerId);
  pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

  if (pointers.size === 1) {
    tapStart = { clientX: event.clientX, clientY: event.clientY };
    dragStart = { clientX: event.clientX, clientY: event.clientY, pageX, pageY };
    gestureHadPinch = false;
  }

  if (pointers.size === 2) {
    startPinch();
  }
});

document.addEventListener("pointermove", (event) => {
  if (!pointers.has(event.pointerId)) {
    return;
  }

  pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

  if (pointers.size >= 2 && pinchStart) {
    event.preventDefault();
    const [first, second] = getPointerList();
    const midpoint = getMidpoint(first, second);
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const nextScale = clamp((pinchStart.scale * getDistance(first, second)) / pinchStart.distance, MIN_SCALE, MAX_SCALE);
    const nextX = midpoint.x - centerX - pinchStart.contentX * nextScale;
    const nextY = midpoint.y - centerY - pinchStart.contentY * nextScale;
    const clamped = clampOffset(nextX, nextY, nextScale);

    scale = nextScale;
    pageX = clamped.x;
    pageY = clamped.y;
    applyTransform();
    return;
  }

  if (scale > 1.01 && dragStart) {
    event.preventDefault();
    const deltaX = event.clientX - dragStart.clientX;
    const deltaY = event.clientY - dragStart.clientY;
    const clamped = clampOffset(dragStart.pageX + deltaX, dragStart.pageY + deltaY);

    image.classList.add("is-interacting");
    pageX = clamped.x;
    pageY = clamped.y;
    applyTransform();
  }
});

document.addEventListener("pointerup", (event) => {
  if (!pointers.has(event.pointerId)) {
    return;
  }

  pointers.delete(event.pointerId);
  releasePointer(event.pointerId);

  if (pointers.size === 1) {
    const [remaining] = getPointerList();
    pinchStart = null;
    dragStart = { clientX: remaining.clientX, clientY: remaining.clientY, pageX, pageY };
  }

  if (pointers.size > 0) {
    return;
  }

  image.classList.remove("is-interacting");
  pinchStart = null;

  if (!tapStart || gestureHadPinch || scale > 1.01) {
    tapStart = null;
    return;
  }

  const deltaX = event.clientX - tapStart.clientX;
  const deltaY = event.clientY - tapStart.clientY;
  const isSwipe = Math.abs(deltaX) > 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4;

  if (isSwipe) {
    if (deltaX < 0) {
      nextPage();
    } else {
      prevPage();
    }
    return;
  }

  if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
    handlePointTurn(event.clientX);
  }

  tapStart = null;
});

document.addEventListener("pointercancel", () => {
  pointers.clear();
  tapStart = null;
  dragStart = null;
  pinchStart = null;
  image.classList.remove("is-interacting");
});

window.addEventListener("resize", applyTransform);

for (const src of pages.slice(1)) {
  const preload = new Image();
  preload.src = src;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}
