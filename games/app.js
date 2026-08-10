const state = {
  data: null,
  platform: "steam",
  filter: "all",
  sort: "hours",
  genre: "all",
  query: "",
  selectedGameId: null,
};

const numberFormat = new Intl.NumberFormat("zh-CN");
const hoursFormat = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

let screenshotLightbox = null;
let screenshotLightboxScreenshots = [];
let screenshotLightboxIndex = 0;
let screenshotLightboxGame = null;
let screenshotLightboxReturnTarget = null;

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function attachFastTooltip(element, tooltip, ariaLabel = tooltip) {
  element.dataset.tooltip = tooltip;
  element.setAttribute("aria-label", ariaLabel);
  return element;
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
  if (game.perfect) frame.classList.add("is-perfect");
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

function getGameEditorialData(game) {
  const review = (Array.isArray(game.review) ? game.review : [game.review])
    .map((paragraph) => String(paragraph || "").trim())
    .filter(Boolean);
  const reviewSections = (
    Array.isArray(game.reviewSections) ? game.reviewSections : []
  )
    .map((section) => ({
      title: String(section?.title || "").trim(),
      text: String(section?.text || "").trim(),
    }))
    .filter(({ title, text }) => title && text);
  const screenshots = (Array.isArray(game.screenshots) ? game.screenshots : [])
    .filter((screenshot) => screenshot?.src);

  return { review, reviewSections, screenshots };
}

function closeScreenshotLightbox() {
  if (!screenshotLightbox?.open) return;
  screenshotLightbox.close();
}

function selectLightboxScreenshot(index) {
  if (!screenshotLightboxScreenshots.length || !screenshotLightbox) return;

  const total = screenshotLightboxScreenshots.length;
  screenshotLightboxIndex = ((index % total) + total) % total;
  const screenshot = screenshotLightboxScreenshots[screenshotLightboxIndex];
  const source = screenshot.fullSrc || screenshot.src;
  const image = screenshotLightbox.querySelector(
    ".game-screenshot-lightbox-image",
  );
  const counter = screenshotLightbox.querySelector(
    ".game-screenshot-lightbox-count",
  );
  const previousButton = screenshotLightbox.querySelector(
    ".game-screenshot-lightbox-previous",
  );
  const nextButton = screenshotLightbox.querySelector(
    ".game-screenshot-lightbox-next",
  );

  image.src = source;
  image.alt = screenshot.alt || `${screenshotLightboxGame?.name || "游戏"} 游戏内截图`;
  counter.textContent = `${String(screenshotLightboxIndex + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  previousButton.disabled = total <= 1;
  nextButton.disabled = total <= 1;
}

function createLightboxChevron(direction) {
  const namespace = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(namespace, "svg");
  const path = document.createElementNS(namespace, "path");

  icon.classList.add("game-screenshot-lightbox-chevron");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");
  path.setAttribute(
    "d",
    direction === "previous"
      ? "M15.5 5 L8.5 12 L15.5 19"
      : "M8.5 5 L15.5 12 L8.5 19",
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  icon.append(path);
  return icon;
}

function ensureScreenshotLightbox() {
  if (screenshotLightbox?.isConnected) return screenshotLightbox;

  const dialog = document.createElement("dialog");
  dialog.id = "game-screenshot-lightbox";
  dialog.className = "game-screenshot-lightbox";
  dialog.setAttribute("aria-label", "游戏截图原图查看器");

  const closeButton = make(
    "button",
    "game-screenshot-lightbox-close",
    "×",
  );
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "关闭原图查看器");
  closeButton.addEventListener("click", closeScreenshotLightbox);

  const previousButton = make(
    "button",
    "game-screenshot-lightbox-nav game-screenshot-lightbox-previous",
  );
  previousButton.type = "button";
  previousButton.setAttribute("aria-label", "上一张截图");
  previousButton.append(createLightboxChevron("previous"));
  previousButton.addEventListener("click", () => {
    selectLightboxScreenshot(screenshotLightboxIndex - 1);
  });

  const image = document.createElement("img");
  image.className = "game-screenshot-lightbox-image";
  image.decoding = "async";

  const nextButton = make(
    "button",
    "game-screenshot-lightbox-nav game-screenshot-lightbox-next",
  );
  nextButton.type = "button";
  nextButton.setAttribute("aria-label", "下一张截图");
  nextButton.append(createLightboxChevron("next"));
  nextButton.addEventListener("click", () => {
    selectLightboxScreenshot(screenshotLightboxIndex + 1);
  });

  const counter = make("span", "game-screenshot-lightbox-count");

  dialog.append(
    closeButton,
    previousButton,
    image,
    nextButton,
    counter,
  );
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeScreenshotLightbox();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectLightboxScreenshot(screenshotLightboxIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      selectLightboxScreenshot(screenshotLightboxIndex + 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeScreenshotLightbox();
    }
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeScreenshotLightbox();
  });
  dialog.addEventListener("close", () => {
    image.removeAttribute("src");
    screenshotLightboxScreenshots = [];
    screenshotLightboxGame = null;
    screenshotLightboxReturnTarget?.focus();
    screenshotLightboxReturnTarget = null;
  });

  document.body.append(dialog);
  screenshotLightbox = dialog;
  return dialog;
}

function openScreenshotLightbox(game, screenshots, index, trigger) {
  if (!screenshots.length) return;

  const dialog = ensureScreenshotLightbox();
  screenshotLightboxScreenshots = screenshots;
  screenshotLightboxGame = game;
  screenshotLightboxReturnTarget = trigger;
  selectLightboxScreenshot(index);
  dialog.showModal();
  dialog.querySelector(".game-screenshot-lightbox-close").focus();
}

function buildDefaultWorkDescription(game) {
  const sourcedDescription = String(game.workDescription || "").trim();
  if (sourcedDescription) return sourcedDescription;

  const theme = String(game.details?.themes?.[0] || "").trim();
  const structure = String(game.coreStructure || "").trim();
  const genre = String(game.primaryGenre || "").trim();

  if (theme && structure && genre) {
    return `以${theme}为题材，围绕${structure}展开的${genre}作品。`;
  }
  if (structure && genre) {
    return `围绕${structure}展开的${genre}作品。`;
  }
  if (theme && genre) {
    return `以${theme}为题材的${genre}作品。`;
  }
  if (genre) return `${genre}作品。`;
  return "该作品的本体内容。";
}

function buildGameWorkContents(game) {
  const defaultDescription = buildDefaultWorkDescription(game);
  const explicitContents = Array.isArray(game.workContents)
    ? game.workContents
    : [];
  const sectionContents = (Array.isArray(game.reviewSections)
    ? game.reviewSections
    : []).map((section) => ({
      type: /^本体$|^基础游戏$/.test(String(section?.title || "").trim())
        ? "base"
        : "expansion",
      title: String(section?.title || "").trim(),
      cover: String(section?.cover || "").trim(),
      description: String(section?.description || section?.text || "").trim(),
    }));
  const sourceContents = explicitContents.length
    ? explicitContents
    : sectionContents;
  const workContents = sourceContents
    .map((content) => {
      const type = String(content?.type || "expansion").trim();
      return {
        type,
        title: String(content?.title || "").trim(),
        cover: String(content?.cover || "").trim(),
        description:
          String(content?.description || content?.text || "").trim() ||
          (type === "base" ? defaultDescription : ""),
      };
    })
    .filter(({ title }) => title);
  const hasBaseContent = workContents.some(({ type, title }) =>
    type === "base" || /^本体$|^基础游戏$/.test(title),
  );

  if (!hasBaseContent) {
    workContents.unshift({
      type: "base",
      title: "本体",
      cover: String(game.cover || "").trim(),
      description: defaultDescription,
    });
  }
  workContents.forEach((content) => {
    if (content.type === "base" && !content.cover) {
      content.cover = String(game.cover || "").trim();
    }
  });
  return workContents;
}

function createGameRecordPanel(game) {
  const record = make("div", "game-record");
  const visibleTags = [game.primaryGenre, game.coreStructure]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const entries = buildGameDetailEntries(game, visibleTags);
  const { screenshots } = getGameEditorialData(game);
  const workContents = buildGameWorkContents(game);
  const screenshotStrip = createRecordScreenshotStrip(game, screenshots);
  const selectedWorkLabel = make("span", "game-selected-work-label");
  const selectedWorkTitle = make("h4", "game-selected-work-title");
  const selectedWorkDescription = make("p", "game-work-description");
  let selectWorkContent = null;

  const header = make("header", "game-record-header");
  header.append(make("h2", "game-record-title", game.name));
  record.append(header);

  if (workContents.length) {
    const works = make("section", "game-record-works");
    works.append(make("h3", "game-record-section-title", "作品内容"));
    const stage = make("div", "game-work-stage");
    const stageImage = document.createElement("img");
    stageImage.className = "game-work-stage-image";
    stageImage.loading = "eager";
    stageImage.decoding = "async";
    const stagePlaceholder = make(
      "div",
      "game-work-stage-placeholder",
      "暂无封面",
    );
    stage.append(stageImage, stagePlaceholder);
    works.append(stage);

    const rail = make(
      "div",
      "game-work-content-rail game-work-thumbnail-rail",
    );
    rail.setAttribute("aria-label", `${game.name} 作品版本`);

    selectWorkContent = (index, focusSelected = false) => {
      const selected = workContents[index];
      if (!selected) return;

      const thumbnails = [...rail.querySelectorAll(".game-work-thumbnail")];
      thumbnails.forEach((card, cardIndex) => {
        const active = cardIndex === index;
        card.classList.toggle("is-active", active);
        card.setAttribute("aria-pressed", String(active));
        card.tabIndex = active ? 0 : -1;
      });

      stageImage.hidden = !selected.cover;
      stagePlaceholder.hidden = Boolean(selected.cover);
      if (selected.cover) {
        stageImage.src = selected.cover;
        stageImage.alt = `${selected.title} 封面`;
      } else {
        stageImage.removeAttribute("src");
        stageImage.alt = "";
        stagePlaceholder.textContent = `${selected.title} · 暂无封面`;
      }

      const cleanTitle = String(selected.title || "")
        .replace(/^(资料片|DLC)[：:·\s-]*/i, "")
        .trim();
      selectedWorkLabel.textContent =
        selected.type === "base" ? "本体" : "资料片";
      selectedWorkLabel.classList.toggle(
        "is-expansion",
        selected.type !== "base",
      );
      selectedWorkTitle.textContent =
        selected.type === "base" ? game.name : cleanTitle || selected.title;
      selectedWorkDescription.textContent = selected.description || "暂无作品简介";

      if (focusSelected) thumbnails[index]?.focus();
    };

    workContents.forEach((content, index) => {
      const workRoleClass =
        content.type === "base" ? " is-base-work" : " is-expansion-work";
      const card = make(
        "button",
        `game-work-card game-work-thumbnail${workRoleClass}${content.cover ? " has-cover" : " is-text-only"}`,
      );
      card.type = "button";
      card.setAttribute("aria-pressed", "false");
      card.setAttribute("aria-label", `查看作品内容：${content.title}`);
      card.title = content.title;
      if (content.cover) {
        const image = document.createElement("img");
        image.src = content.cover;
        image.alt = `${content.title} 封面`;
        image.loading = "lazy";
        image.decoding = "async";
        card.append(image);
      } else {
        card.append(make("span", "game-work-thumbnail-placeholder", content.title));
      }
      card.addEventListener("click", () => selectWorkContent(index));
      card.addEventListener("keydown", (event) => {
        let nextIndex = null;
        if (event.key === "ArrowLeft") {
          nextIndex = (index - 1 + workContents.length) % workContents.length;
        } else if (event.key === "ArrowRight") {
          nextIndex = (index + 1) % workContents.length;
        }
        if (nextIndex === null) return;
        event.preventDefault();
        selectWorkContent(nextIndex, true);
      });
      rail.append(card);
    });
    works.append(rail);
    record.append(works);
  }

  if (entries.length || workContents.length) {
    const factsSection = make("section", "game-record-facts-section");
    factsSection.append(make("h3", "game-record-section-title", "作品资料"));
    if (workContents.length) {
      const selectedWork = make("div", "game-selected-work");
      selectedWork.append(
        selectedWorkLabel,
        selectedWorkTitle,
        selectedWorkDescription,
      );
      factsSection.append(selectedWork);
    }
    if (entries.length) {
      const facts = make("dl", "game-record-facts");
      entries.forEach(({ label, value }) => {
        const fact = make("div", "game-record-fact");
        fact.append(make("dt", "", label), make("dd", "", value));
        facts.append(fact);
      });
      factsSection.append(facts);
    }
    record.append(factsSection);
  }

  selectWorkContent?.(0);

  const gallery = make("section", "game-record-gallery");
  gallery.append(make("h3", "game-record-section-title", "游戏截图"));
  if (screenshotStrip) {
    gallery.append(screenshotStrip);
  } else {
    gallery.append(make("p", "game-record-empty", "暂无游戏记录"));
  }
  record.append(gallery);

  return record;
}

function createRecordScreenshotStrip(game, screenshots) {
  if (!screenshots.length) return null;

  const strip = make("div", "game-record-screenshots");
  strip.setAttribute("aria-label", `${game.name} 游戏截图`);
  screenshots.forEach((screenshot, index) => {
    const button = make("button", "game-record-screenshot");
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `查看第 ${index + 1} 张原图：${screenshot.caption || game.name}`,
    );
    const image = document.createElement("img");
    image.src = screenshot.src;
    image.alt = screenshot.alt || `${game.name} 游戏内截图`;
    image.loading = "lazy";
    image.decoding = "async";
    button.append(image);
    button.addEventListener("click", () => {
      openScreenshotLightbox(game, screenshots, index, button);
    });
    strip.append(button);
  });
  return strip;
}

function renderGameRecordPanel(game) {
  const panel = document.querySelector("#game-record-panel");
  if (!panel) return;
  panel.hidden = !game;
  panel.replaceChildren(...(game ? [createGameRecordPanel(game)] : []));
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
  row.dataset.gameId = String(game.id);
  row.dataset.platform = platformOf(game);
  row.dataset.primaryGenre = game.primaryGenre || "其他";
  row.tabIndex = 0;
  row.setAttribute("role", "button");
  row.setAttribute("aria-selected", String(String(game.id) === state.selectedGameId));
  row.setAttribute("aria-label", `查看 ${game.name} 的作品档案`);
  row.classList.toggle("is-selected", String(game.id) === state.selectedGameId);
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

  const playPeriod = String(game.playPeriod || "").trim();
  const recentlyActive = isRecentlyActive(game);
  if (playPeriod || recentlyActive) {
    const metaLine = make("div", "game-meta-line");
    if (playPeriod) {
      const period = attachFastTooltip(
        make("span", "game-play-period", playPeriod),
        "个人游玩跨度",
        `个人游玩跨度：${playPeriod}`,
      );
      metaLine.append(period);
    }
    if (recentlyActive) {
      const activeStatus = make("span", "game-active-status", "活跃");
      const recentMinutes = Number(game.playtime2WeeksMinutes);
      let tooltip = "当前活跃";
      let ariaLabel = "当前活跃";
      if (Number.isFinite(recentMinutes) && recentMinutes > 0) {
        const recentHours = hoursFormat.format(recentMinutes / 60);
        tooltip = `近两周游玩 ${recentHours} 小时`;
        ariaLabel = `Steam 活跃状态：${tooltip}`;
      }
      attachFastTooltip(activeStatus, tooltip, ariaLabel);
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
  const selectRow = () => {
    state.selectedGameId = String(game.id);
    document.querySelectorAll(".game-row").forEach((candidate) => {
      const selected = candidate.dataset.gameId === state.selectedGameId;
      candidate.classList.toggle("is-selected", selected);
      candidate.setAttribute("aria-selected", String(selected));
    });
    renderGameRecordPanel(game);
  };
  row.addEventListener("click", selectRow);
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectRow();
    }
  });
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
  if (!games.some((game) => String(game.id) === state.selectedGameId)) {
    state.selectedGameId = games.length ? String(games[0].id) : null;
  }
  list.replaceChildren(...games.map(createGameRow));
  emptyState.hidden = games.length > 0;
  renderGameRecordPanel(
    games.find((game) => String(game.id) === state.selectedGameId) || null,
  );
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
