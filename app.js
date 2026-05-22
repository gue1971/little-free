const pages = Array.from({ length: 12 }, (_, index) => {
  return `images/${String(index + 1).padStart(2, "0")}.png`;
});

const image = document.getElementById("page");
const status = document.getElementById("status");

let pageIndex = 0;
let startX = 0;
let startY = 0;
let pointerDown = false;
let turning = false;

function clampPage(index) {
  return Math.max(0, Math.min(pages.length - 1, index));
}

function updatePage(nextIndex, direction) {
  const clamped = clampPage(nextIndex);

  if (clamped === pageIndex || turning) {
    return;
  }

  turning = true;
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
  pointerDown = true;
  startX = event.clientX;
  startY = event.clientY;
});

document.addEventListener("pointerup", (event) => {
  if (!pointerDown) {
    return;
  }

  pointerDown = false;
  const deltaX = event.clientX - startX;
  const deltaY = event.clientY - startY;
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
});

document.addEventListener("pointercancel", () => {
  pointerDown = false;
});

for (const src of pages.slice(1)) {
  const preload = new Image();
  preload.src = src;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}
