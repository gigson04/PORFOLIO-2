// =========================================================
// GIGS.EXE portfolio — vanilla JS, no build step, no libraries.
// Projects are stored in this browser's localStorage.
// =========================================================

// Tells the CSS it's safe to start elements hidden for the
// reveal/typing animations, since JS is confirmed running.
document.documentElement.classList.add("js-ready");

const STORAGE_KEY = "gigsPortfolioProjects";

// ---- Seed data shown the very first time the page loads ----
// Edit these directly, or delete them from the UI once you've
// added your own real projects.
const SEED_PROJECTS = [
  {
    id: "seed-1",
    title: "TARA, NV!",
    description:
      "A tourist spot & local accommodation directory for Nueva Vizcaya. Municipality/category filtering, Google Maps, image uploads, OAuth reviews, and an admin panel. Deployed on Vercel with Supabase.",
    tags: ["React", "Supabase", "Capstone"],
    link: "https://github.com/gigson04",
    image: null,
  },
  {
    id: "seed-2",
    title: "ALKANSYA",
    description:
      "A budget tracker with multi-account tracking, savings goals, and Chart.js visualizations, with persistent local storage.",
    tags: ["JavaScript", "Chart.js"],
    link: "https://github.com/gigson04",
    image: null,
  },
  {
    id: "seed-3",
    title: "EXAM.SYS",
    description:
      "An interactive browser-based reviewer and quiz app built for SQL and Systems Analysis & Design finals, with instant answer keys.",
    tags: ["Web App", "Study Tool"],
    link: "https://github.com/gigson04",
    image: null,
  },
];

// ---- DOM references ----
const projectGrid = document.getElementById("projectGrid");
const addProjectBtn = document.getElementById("addProjectBtn");
const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelBtn = document.getElementById("cancelBtn");
const projectForm = document.getElementById("projectForm");

const fieldId = document.getElementById("fieldId");
const fieldTitle = document.getElementById("fieldTitle");
const fieldDescription = document.getElementById("fieldDescription");
const fieldTags = document.getElementById("fieldTags");
const fieldLink = document.getElementById("fieldLink");
const fieldImage = document.getElementById("fieldImage");
const imagePreview = document.getElementById("imagePreview");
const imagePlaceholder = document.getElementById("imagePlaceholder");

const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");

let currentImageData = null; // base64 string of the (possibly compressed) screenshot

// =========================================================
// Storage helpers
// =========================================================

function loadProjects() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    saveProjects(SEED_PROJECTS);
    return SEED_PROJECTS;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Could not read saved projects, starting fresh.", err);
    return [];
  }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

// =========================================================
// Rendering
// =========================================================

function renderProjects() {
  const projects = loadProjects();
  projectGrid.innerHTML = "";

  if (projects.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No projects yet. Click + ADD PROJECT to load one in.";
    projectGrid.appendChild(empty);
    return;
  }

  projects.forEach((project) => {
    projectGrid.appendChild(buildProjectCard(project));
  });

  observeRevealTargets(projectGrid.querySelectorAll(".reveal-target"));
}

function buildProjectCard(project) {
  const card = document.createElement("div");
  card.className = "window project-card reveal-target";

  const titlebar = document.createElement("div");
  titlebar.className = "window-titlebar";
  titlebar.innerHTML = `
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    <span class="window-title">${escapeHtml(slugify(project.title))}.exe</span>
  `;

  const thumbWrap = document.createElement("div");
  thumbWrap.className = "project-thumb-wrap";
  if (project.image) {
    const img = document.createElement("img");
    img.src = project.image;
    img.alt = project.title + " screenshot";
    thumbWrap.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "pixel-placeholder";
    thumbWrap.appendChild(placeholder);
  }

  const body = document.createElement("div");
  body.className = "window-body";

  const title = document.createElement("h3");
  title.className = "project-title";
  title.textContent = project.title;

  const desc = document.createElement("p");
  desc.className = "project-desc";
  desc.textContent = project.description || "";

  const tagsWrap = document.createElement("div");
  tagsWrap.className = "project-tags";
  (project.tags || []).forEach((tag) => {
    const tagEl = document.createElement("span");
    tagEl.className = "tag";
    tagEl.textContent = tag;
    tagsWrap.appendChild(tagEl);
  });

  const actions = document.createElement("div");
  actions.className = "project-actions";

  const linkBtn = document.createElement("a");
  linkBtn.className = "btn";
  linkBtn.textContent = "OPEN ->";
  linkBtn.href = project.link || "#";
  linkBtn.target = "_blank";
  linkBtn.rel = "noopener";
  if (!project.link) linkBtn.style.visibility = "hidden";

  const btnGroup = document.createElement("div");
  btnGroup.style.display = "flex";
  btnGroup.style.gap = "6px";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn icon-btn";
  editBtn.textContent = "EDIT";
  editBtn.addEventListener("click", () => openModal(project));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn icon-btn";
  deleteBtn.textContent = "DEL";
  deleteBtn.addEventListener("click", () => deleteProject(project.id));

  btnGroup.appendChild(editBtn);
  btnGroup.appendChild(deleteBtn);
  actions.appendChild(linkBtn);
  actions.appendChild(btnGroup);

  body.appendChild(title);
  body.appendChild(desc);
  if ((project.tags || []).length) body.appendChild(tagsWrap);
  body.appendChild(actions);

  card.appendChild(titlebar);
  card.appendChild(thumbWrap);
  card.appendChild(body);

  return card;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function slugify(str) {
  return (str || "project").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 20);
}

// =========================================================
// Modal (add / edit)
// =========================================================

function openModal(project) {
  projectForm.reset();
  currentImageData = null;
  imagePreview.hidden = true;
  imagePlaceholder.hidden = false;

  if (project) {
    modalTitle.textContent = "edit_project.exe";
    fieldId.value = project.id;
    fieldTitle.value = project.title;
    fieldDescription.value = project.description || "";
    fieldTags.value = (project.tags || []).join(", ");
    fieldLink.value = project.link || "";
    if (project.image) {
      currentImageData = project.image;
      imagePreview.src = project.image;
      imagePreview.hidden = false;
      imagePlaceholder.hidden = true;
    }
  } else {
    modalTitle.textContent = "new_project.exe";
    fieldId.value = "";
  }

  modalOverlay.hidden = false;
  fieldTitle.focus();
}

function closeModal() {
  modalOverlay.hidden = true;
}

addProjectBtn.addEventListener("click", () => openModal(null));
closeModalBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalOverlay.hidden) closeModal();
});

// ---- image upload: read + downscale to keep localStorage small ----
fieldImage.addEventListener("change", () => {
  const file = fieldImage.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 800;
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      currentImageData = canvas.toDataURL("image/jpeg", 0.8);
      imagePreview.src = currentImageData;
      imagePreview.hidden = false;
      imagePlaceholder.hidden = true;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// ---- save (create or update) ----
projectForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const projects = loadProjects();
  const tags = fieldTags.value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const record = {
    id: fieldId.value || "p-" + Date.now(),
    title: fieldTitle.value.trim(),
    description: fieldDescription.value.trim(),
    tags,
    link: fieldLink.value.trim(),
    image: currentImageData,
  };

  const existingIndex = projects.findIndex((p) => p.id === record.id);
  if (existingIndex >= 0) {
    projects[existingIndex] = record;
  } else {
    projects.push(record);
  }

  try {
    saveProjects(projects);
  } catch (err) {
    alert(
      "Could not save — your browser's local storage is full. Try removing a screenshot or an old project first."
    );
    return;
  }

  closeModal();
  renderProjects();
});

function deleteProject(id) {
  if (!confirm("Delete this project? This can't be undone.")) return;
  const projects = loadProjects().filter((p) => p.id !== id);
  saveProjects(projects);
  renderProjects();
}

// =========================================================
// Export / import (backup, since data lives in this browser only)
// =========================================================

exportBtn.addEventListener("click", () => {
  const data = JSON.stringify(loadProjects(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gigs-portfolio-projects.json";
  a.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", () => {
  const file = importInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error("Not a project list");
      saveProjects(imported);
      renderProjects();
      alert("Projects imported.");
    } catch (err) {
      alert("That file doesn't look like a valid export. Nothing was changed.");
    }
  };
  reader.readAsText(file);
  importInput.value = "";
});

// =========================================================
// Typing effect — returns a Promise so lines can be chained
// =========================================================

function typeText(el, text, speed) {
  return new Promise((resolve) => {
    let i = 0;
    el.textContent = "";
    const interval = setInterval(() => {
      el.textContent += text.charAt(i);
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        resolve();
      }
    }, speed);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =========================================================
// Hero boot sequence
// =========================================================

async function runBootSequence(reducedMotion) {
  const bootLine1 = document.getElementById("bootLine1");
  const bootLine2 = document.getElementById("bootLine2");
  const promptLine = document.getElementById("promptLine");
  const typedNameEl = document.getElementById("typedName");
  const heroRole = document.getElementById("heroRole");
  const heroTagline = document.getElementById("heroTagline");
  const heroButtons = document.getElementById("heroButtons");

  if (reducedMotion) {
    bootLine1.textContent = "SYSTEM CHECK ......... OK";
    bootLine2.textContent = "LOADING PROFILE: GIGS.PORTFOLIO";
    promptLine.classList.add("is-visible");
    typedNameEl.textContent = "GIGS";
    heroRole.classList.add("is-visible");
    heroTagline.classList.add("is-visible");
    heroButtons.classList.add("is-visible");
    return;
  }

  await typeText(bootLine1, "SYSTEM CHECK ......... OK", 18);
  await wait(150);
  await typeText(bootLine2, "LOADING PROFILE: GIGS.PORTFOLIO", 18);
  await wait(250);
  promptLine.classList.add("is-visible");
  await wait(200);
  await typeText(typedNameEl, "GIGS", 140);
  await wait(150);
  heroRole.classList.add("is-visible");
  await wait(120);
  heroTagline.classList.add("is-visible");
  await wait(120);
  heroButtons.classList.add("is-visible");
}

// =========================================================
// Scroll reveal — pixel dissolve, one-time per element
// =========================================================

let revealObserver = null;

function getRevealObserver() {
  if (revealObserver) return revealObserver;
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          revealElement(entry.target);
          revealObserver.unobserve(entry.target);
        }
      });
    },
    // threshold 0 + a bottom rootMargin: fires as soon as even a
    // sliver is in view, so fast scrolls/scrollbar-drags/jump
    // links can't skip past an element without triggering it
    { threshold: 0, rootMargin: "0px 0px 120px 0px" }
  );
  return revealObserver;
}

function revealElement(el) {
  const delay = Number(el.dataset.revealDelay || 0);
  setTimeout(() => el.classList.add("is-visible"), delay);
}

function observeRevealTargets(elements) {
  const list = Array.from(elements);
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    list.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = getRevealObserver();
  list.forEach((el, i) => {
    el.dataset.revealDelay = String(Math.min(i * 70, 350));
    observer.observe(el);

    // safety net: if this element somehow never gets flagged as
    // intersecting (edge cases with instant jumps, oddly-sized
    // layouts, etc.), reveal it anyway after a short grace period
    // so nothing is ever stuck permanently invisible.
    setTimeout(() => {
      if (!el.classList.contains("is-visible")) {
        el.classList.add("is-visible");
        observer.unobserve(el);
      }
    }, 2500);
  });
}

// =========================================================
// Custom pixel cursor + trail
// Only on devices with a real mouse; native cursor stays
// everywhere else (touch, reduced motion).
// =========================================================

function initPixelCursor() {
  const supportsFinePointer = window.matchMedia(
    "(pointer: fine) and (hover: hover)"
  ).matches;

  if (!supportsFinePointer || prefersReducedMotion) return;

  const cursorEl = document.getElementById("pixelCursor");
  document.body.classList.add("pixel-cursor-active");

  let lastTrailTime = 0;
  const trailInterval = 35; // ms between spawned pixels
  const grayTones = ["#1a1a1a", "#4a4a4a", "#6f6f6f", "#9c9c9c", "#bdbdbd"];
  const activePool = [];
  const maxPoolSize = 40;

  window.addEventListener(
    "mousemove",
    (e) => {
      cursorEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;

      const now = performance.now();
      if (now - lastTrailTime > trailInterval) {
        lastTrailTime = now;
        spawnTrailPixel(e.clientX, e.clientY);
      }
    },
    { passive: true }
  );

  function spawnTrailPixel(x, y) {
    const grid = 6;
    const snappedX = Math.round(x / grid) * grid;
    const snappedY = Math.round(y / grid) * grid;

    const pixel = document.createElement("div");
    pixel.className = "pixel-trail";
    pixel.style.left = snappedX + "px";
    pixel.style.top = snappedY + "px";
    pixel.style.background =
      grayTones[Math.floor(Math.random() * grayTones.length)];
    document.body.appendChild(pixel);
    activePool.push(pixel);

    pixel.addEventListener("animationend", () => removeTrailPixel(pixel), {
      once: true,
    });

    // safety net in case animationend never fires (e.g. tab backgrounded)
    setTimeout(() => removeTrailPixel(pixel), 800);

    if (activePool.length > maxPoolSize) {
      removeTrailPixel(activePool[0]);
    }
  }

  function removeTrailPixel(pixel) {
    const idx = activePool.indexOf(pixel);
    if (idx !== -1) activePool.splice(idx, 1);
    if (pixel.parentNode) pixel.parentNode.removeChild(pixel);
  }

  // grow/invert the cursor over anything clickable
  const interactiveSelector = "a, button, input, textarea, label, .chip, .tag";
  document.addEventListener(
    "mouseover",
    (e) => {
      if (e.target.closest(interactiveSelector)) {
        cursorEl.classList.add("cursor-hover");
      }
    },
    { passive: true }
  );
  document.addEventListener(
    "mouseout",
    (e) => {
      if (e.target.closest(interactiveSelector)) {
        cursorEl.classList.remove("cursor-hover");
      }
    },
    { passive: true }
  );
}

// =========================================================
// Init
// =========================================================

document.getElementById("year").textContent = new Date().getFullYear();

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

runBootSequence(prefersReducedMotion);

observeRevealTargets(document.querySelectorAll(".reveal-target"));

renderProjects();

initPixelCursor();
