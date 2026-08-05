const state = {
  data: null,
  platform: "steam",
  filter: "all",
  sort: "hours",
  genre: "all",
  query: "",
};

const numberFormat = new Intl.NumberFormat("zh-CN");
const hoursFormat = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function platformOf(game) {
  return game.platform || (game.source === "steam" ? "steam" : "other");
}

function formatHours(hours) {
  if (hours === null || hours === undefined) return "";
  return `${hoursFormat.format(hours)} h`;
}

function isRecentlyActive(game) {
  if (game?.active === true) return true;
  const minutes = Number(game?.playtime2WeeksMinutes);
  return Number.isFinite(minutes) && minutes > 0;
}

function completionRatio(game) {
  const achieved = Number(game.achievements?.achieved || 0);
  const total = Number(game.achievements?.total || 0);
  return total > 0 ? achieved / total : -1;
}

function compareNames(left, right) {
  const a = String(left || "").toLowerCase();
  const b = String(right || "").toLowerCase();
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function createCover(game) {
  const frame = make("div", "row-cover");
  const usePlaceholder = () => {
    frame.replaceChildren();
    const template = document.querySelector("#cover-placeholder-template");
    const placeholder = template.content.firstElementChild.cloneNode(true);
    placeholder.querySelector("span").textContent = game.name;
    frame.append(placeholder);
  };

  if (!game.cover) {
    usePlaceholder();
    return frame;
  }

  const image = document.createElement("img");
  image.src = game.cover;
  image.alt = `${game.name} 封面`;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", usePlaceholder, { once: true });
  frame.append(image);
  return frame;
}

const DETAIL_LABELS = {
  studio: "开发商",
  themes: "题材",
};

const DETAIL_ORDER = [
  "studio",
  "themes",
];

function buildGameDetailEntries(game, visibleTagValues = []) {
  const detailData = game.details || {};
  const visibleTags = new Set(
    visibleTagValues
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  );
  return DETAIL_ORDER
    .map((key) => {
      const rawValue = detailData[key];
      const values = (Array.isArray(rawValue) ? rawValue : [rawValue])
        .map((value) => String(value || "").trim())
        .filter((value) => value && !visibleTags.has(value));
      return {
        label: DETAIL_LABELS[key] || key,
        value: values.join("、"),
      };
    })
    .filter(({ value }) => value)
    .slice(0, 4);
}

function createGameEditorial(game) {
  const review = (Array.isArray(game.review) ? game.review : [game.review])
    .map((paragraph) => String(paragraph || "").trim())
    .filter(Boolean);
  const screenshots = (Array.isArray(game.screenshots) ? game.screenshots : [])
    .filter((screenshot) => screenshot?.src);

  if (!review.length && !screenshots.length) return null;

  const editorial = make("div", "game-editorial");

  if (review.length) {
    const reviewBlock = make("section", "game-personal-review");
    reviewBlock.append(make("h3", "game-editorial-title", "个人游玩记录"));
    review.forEach((paragraph) => {
      reviewBlock.append(make("p", "", paragraph));
    });
    editorial.append(reviewBlock);
  }

  if (screenshots.length) {
    const screenshotBlock = make("section", "game-screenshot-block");
    screenshotBlock.append(make("h3", "game-editorial-title", "游戏内截图"));
    const gallery = make("div", "game-screenshot-gallery");

    screenshots.forEach((screenshot, index) => {
      const figure = make(
        "figure",
        `game-screenshot-card${index === 0 ? " is-featured" : ""}`,
      );
      const link = document.createElement("a");
      link.href = screenshot.src;
      link.target = "_blank";
      link.rel = "noopener";
      link.setAttribute("aria-label", `${screenshot.caption || game.name}，打开原图`);

      const image = document.createElement("img");
      image.src = screenshot.src;
      image.alt = screenshot.alt || `${game.name} 游戏内截图`;
      image.loading = "lazy";
      image.decoding = "async";
      link.append(image);
      figure.append(link);

      if (screenshot.caption) {
        figure.append(make("figcaption", "", screenshot.caption));
      }
      gallery.append(figure);
    });

    screenshotBlock.append(gallery);
    editorial.append(screenshotBlock);
  }

  return editorial;
}

function createGameDetails(game, visibleTagValues = []) {
  const entries = buildGameDetailEntries(game, visibleTagValues);
  const editorial = createGameEditorial(game);

  if (!entries.length && !editorial) return null;

  const details = make("details", "game-details");
  if (editorial) details.classList.add("has-editorial");
  details.append(make("summary", "", "详情"));
  if (entries.length) {
    const strip = make("div", "game-detail-strip");
    entries.forEach(({ label, value }) => {
      const item = make("span", "game-detail-item");
      item.append(
        make("span", "game-detail-label", label),
        make("span", "game-detail-value", value),
      );
      strip.append(item);
    });
    details.append(strip);
  }
  if (editorial) details.append(editorial);
  return details;
}

function createManualHighlight(game) {
  const highlight = game.highlight;
  if (!highlight?.label || !highlight?.value) return null;

  const block = make(
    "div",
    `manual-highlight tone-${highlight.tone || "experience"}`,
  );
  block.append(
    make("span", "manual-highlight-label", highlight.label),
    make("strong", "manual-highlight-value", highlight.value),
  );
  return block;
}

function createRowProgress(game) {
  const block = make("div", "achievement-block");
  const achieved = Number(game.achievements?.achieved || 0);
  const total = Number(game.achievements?.total || 0);
  if (total <= 0) {
    block.append(
      make("span", "no-achievements", "Steam 暂未提供成就数据"),
    );
    return block;
  }

  block.append(
    make(
      "span",
      "achievement-count",
      `成就 ${numberFormat.format(achieved)} / ${numberFormat.format(total)}`,
    ),
  );
  const track = make("div", "progress-track");
  const fill = make(
    "div",
    `progress-fill${game.perfect ? " is-perfect" : ""}`,
  );
  fill.style.width = `${Math.min(100, (achieved / total) * 100)}%`;
  track.append(fill);
  block.append(track);
  return block;
}

function createGameRow(game) {
  const row = make("article", "game-row");
  row.dataset.platform = platformOf(game);
  row.dataset.primaryGenre = game.primaryGenre || "其他";
  row.append(createCover(game));

  const main = make("div", "game-main");
  main.append(make("div", "game-name", game.name));

  const subline = make("div", "game-subline");
  const visibleTags = [
    {
      value: game.primaryGenre || "其他",
      className: "tag primary-genre-tag",
    },
    {
      value: game.coreStructure || "待整理",
      className: "tag core-structure-tag",
    },
  ];
  const seenTags = new Set();
  visibleTags.forEach(({ value, className }) => {
    if (!value || seenTags.has(value)) return;
    seenTags.add(value);
    subline.append(make("span", className, value));
  });
  main.append(subline);

  const details = createGameDetails(game, [...seenTags]);
  const playPeriod = String(game.playPeriod || "").trim();
  const recentlyActive = isRecentlyActive(game);
  if (details || playPeriod || recentlyActive) {
    const metaLine = make("div", "game-meta-line");
    if (details) metaLine.append(details);
    if (playPeriod) {
      const period = make("span", "game-play-period", playPeriod);
      period.title = "个人游玩跨度";
      period.setAttribute("aria-label", `个人游玩跨度：${playPeriod}`);
      metaLine.append(period);
    }
    if (recentlyActive) {
      const activeStatus = make("span", "game-active-status", "活跃");
      const recentMinutes = Number(game.playtime2WeeksMinutes);
      if (Number.isFinite(recentMinutes) && recentMinutes > 0) {
        const recentHours = hoursFormat.format(recentMinutes / 60);
        activeStatus.title = `近两周游玩 ${recentHours} 小时`;
        activeStatus.setAttribute(
          "aria-label",
          `Steam 活跃状态：近两周游玩 ${recentHours} 小时`,
        );
      } else {
        activeStatus.title = "当前活跃";
        activeStatus.setAttribute("aria-label", "当前活跃");
      }
      metaLine.append(activeStatus);
    }
    main.append(metaLine);
  }
  row.append(main);

  if (platformOf(game) === "steam") {
    const time = make("div", "game-hours");
    time.append(document.createTextNode(formatHours(game.hours)));
    time.append(make("span", "", "累计时长"));
    row.append(time, createRowProgress(game));
  } else {
    const highlight = createManualHighlight(game);
    if (highlight) row.append(highlight);
  }

  const status = make("div", "row-status");
  if (platformOf(game) === "steam" && game.perfect) {
    status.append(make("span", "perfect-badge", "全成就"));
  }
  row.append(status);
  return row;
}

function renderProfile(data) {
  const profile = data.profile || {};
  const profileLink = document.querySelector("#steam-profile-link");
  if (profileLink) {
    profileLink.href = profile.profileUrl || "#";
  }
}

function matchesPlatformFilter(game, filter, platform) {
  if (platformOf(game) !== platform) return false;
  if (filter === "active") return isRecentlyActive(game);
  if (filter === "perfect" && !game.perfect) return false;
  return true;
}

function matchesCurrentView(game) {
  if (!matchesPlatformFilter(game, state.filter, state.platform)) return false;
  if (
    state.genre !== "all" &&
    game.primaryGenre !== state.genre
  ) {
    return false;
  }
  if (
    state.query &&
    !String(game.name || "")
      .toLowerCase()
      .includes(state.query.toLowerCase())
  ) {
    return false;
  }
  return true;
}

function sortGames(games) {
  const sorted = [...games];
  sorted.sort((left, right) => {
    if (state.sort === "completion") {
      const ratioDelta = completionRatio(right) - completionRatio(left);
      if (ratioDelta !== 0) return ratioDelta;
      const totalDelta =
        Number(right.achievements?.total || 0) -
        Number(left.achievements?.total || 0);
      if (totalDelta !== 0) return totalDelta;
    } else if (state.sort === "recent") {
      const recentDelta =
        Number(right.lastPlayed || 0) - Number(left.lastPlayed || 0);
      if (recentDelta !== 0) return recentDelta;
    } else if (state.sort === "type") {
      const genreDelta = String(left.primaryGenre || "其他").localeCompare(
        String(right.primaryGenre || "其他"),
        "zh-CN",
      );
      if (genreDelta !== 0) return genreDelta;
      const structureDelta = String(
        left.coreStructure || "待整理",
      ).localeCompare(
        String(right.coreStructure || "待整理"),
        "zh-CN",
      );
      if (structureDelta !== 0) return structureDelta;
      return String(left.name || "").localeCompare(
        String(right.name || ""),
        "zh-CN",
      );
    } else if (state.sort === "name") {
      return compareNames(left.name, right.name);
    } else {
      const hoursDelta =
        Number(right.hours ?? -1) - Number(left.hours ?? -1);
      if (hoursDelta !== 0) return hoursDelta;
    }
    return compareNames(left.name, right.name);
  });
  return sorted;
}

function renderArchive() {
  const games = sortGames(state.data.games.filter(matchesCurrentView));
  const list = document.querySelector("#game-list");
  const emptyState = document.querySelector("#empty-state");
  list.replaceChildren(...games.map(createGameRow));
  emptyState.hidden = games.length > 0;
}

function populateGenres() {
  const select = document.querySelector("#archive-type");
  const platformGames = state.data.games.filter(
    (game) => platformOf(game) === state.platform,
  );
  const sourceGames = state.filter === "active"
    ? platformGames.filter(isRecentlyActive)
    : platformGames;
  const genreCounts = sourceGames
    .reduce((counts, game) => {
      const genre = game.primaryGenre || "其他";
      counts.set(genre, (counts.get(genre) || 0) + 1);
      return counts;
    }, new Map());
  const genres = [...genreCounts.keys()]
    .sort((left, right) => left.localeCompare(right, "zh-CN"));

  select.replaceChildren(new Option("全部类型", "all"));
  genres.forEach((genre) => {
    select.append(new Option(genre, genre));
  });
  if (state.genre !== "all" && !genreCounts.has(state.genre)) {
    state.genre = "all";
  }
  select.value = state.genre;
}

function syncFilterButtons() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    const active = button.dataset.filter === state.filter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function isPlatformSelected(filter, currentPlatform, buttonPlatform) {
  return currentPlatform === buttonPlatform;
}

function syncPlatformButtons() {
  document.querySelectorAll("[data-platform]").forEach((button) => {
    const active = isPlatformSelected(
      state.filter,
      state.platform,
      button.dataset.platform,
    );
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function setPlatform(platform) {
  state.platform = platform;
  if (state.filter !== "active") state.filter = "all";
  state.genre = "all";
  state.sort = platform === "steam" ? "hours" : "type";

  syncPlatformButtons();

  const perfectButton = document.querySelector('[data-filter="perfect"]');
  perfectButton.disabled = platform !== "steam";
  document.querySelector("#archive-sort").value = state.sort;
  populateGenres();
  syncFilterButtons();
  renderArchive();
}

function wireControls() {
  document.querySelectorAll("[data-platform]").forEach((button) => {
    button.addEventListener("click", () => {
      setPlatform(button.dataset.platform);
    });
  });

  document.querySelector("#game-search").addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    renderArchive();
  });

  document.querySelector("#archive-sort").addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderArchive();
  });

  document.querySelector("#archive-type").addEventListener("change", (event) => {
    state.genre = event.target.value;
    renderArchive();
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      state.filter = button.dataset.filter;
      if (state.filter === "active") state.genre = "all";
      syncPlatformButtons();
      populateGenres();
      syncFilterButtons();
      renderArchive();
    });
  });
}

function renderPlatformCounts(data) {
  const counts = data.summary.platformCounts || {};
  document.querySelector("#steam-platform-count").textContent =
    numberFormat.format(counts.steam || 0);
  document.querySelector("#battlenet-platform-count").textContent =
    numberFormat.format(counts.battlenet || 0);
  document.querySelector("#tencent-platform-count").textContent =
    numberFormat.format(counts.tencent || 0);
  document.querySelector("#other-platform-count").textContent =
    numberFormat.format(counts.other || 0);
}

function showArchiveError(message) {
  const list = document.querySelector("#game-list");
  list.replaceChildren(make("p", "empty-state", message));
}

async function loadArchive() {
  const response = await fetch("data/game_archive.json", {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function renderApp(data) {
  state.data = data;
  renderProfile(state.data);
  renderPlatformCounts(state.data);
  wireControls();
  setPlatform("steam");
}

async function init() {
  let data;
  try {
    data = await loadArchive();
  } catch (error) {
    console.error("Game archive load failed", error);
    showArchiveError("游戏档案数据加载失败，请刷新页面后重试。");
    return;
  }

  try {
    renderApp(data);
  } catch (error) {
    console.error("Game archive render failed", error);
    showArchiveError("游戏档案渲染失败，请刷新页面后重试。");
  }
}

document.addEventListener("DOMContentLoaded", init);
