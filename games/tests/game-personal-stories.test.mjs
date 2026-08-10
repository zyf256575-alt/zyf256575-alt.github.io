import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

const archiveUrl = new URL("../data/game_archive.json", import.meta.url);
const appUrl = new URL("../app.js", import.meta.url);
const styleUrl = new URL("../styles.css", import.meta.url);
const indexUrl = new URL("../index.html", import.meta.url);

const archive = JSON.parse(await readFile(archiveUrl, "utf8"));
const appSource = await readFile(appUrl, "utf8");
const styleSource = await readFile(styleUrl, "utf8");
const indexSource = await readFile(indexUrl, "utf8");

async function assertScreenshotCollection(game, expectedNames) {
  assert.ok(game, "game record is missing");
  assert.deepEqual(
    game.screenshots?.map(({ src }) =>
      src.replace(`assets/screenshots/${game.id}/`, "").replace(".webp", ""),
    ),
    expectedNames,
  );

  for (const screenshot of game.screenshots) {
    assert.ok(screenshot.alt, "screenshot alt is required");
    assert.ok(screenshot.caption, "screenshot caption is required");
    assert.match(screenshot.thumbSrc, /-thumb\.webp$/);
    assert.match(screenshot.fullSrc, /-original\.jpg$/);

    const previewUrl = new URL(`../${screenshot.src}`, import.meta.url);
    const thumbnailUrl = new URL(`../${screenshot.thumbSrc}`, import.meta.url);
    const originalUrl = new URL(`../${screenshot.fullSrc}`, import.meta.url);
    await Promise.all([access(previewUrl), access(thumbnailUrl), access(originalUrl)]);
    const [previewStats, thumbnailStats] = await Promise.all([
      stat(previewUrl),
      stat(thumbnailUrl),
    ]);
    assert.ok(thumbnailStats.size < previewStats.size);
  }
}

test("Dyson Sphere Program keeps the approved short personal note and four original screenshots", async () => {
  const dyson = archive.games.find((game) => game.id === "1366540");

  assert.ok(dyson, "Dyson Sphere Program record is missing");
  assert.deepEqual(dyson.review, [
    "接触到的第一款建造游戏。二周目开始折腾极限密铺、模块化和自动化，直到把整颗行星都密铺成一个超级工厂，算是亲手搓出了一点工业浪漫。",
  ]);
  assert.equal(dyson.screenshots?.length, 4);

  for (const screenshot of dyson.screenshots) {
    assert.ok(screenshot.src, "screenshot src is required");
    assert.ok(screenshot.thumbSrc, "dedicated thumbnail src is required");
    assert.match(screenshot.thumbSrc, /-thumb\.webp$/);
    assert.ok(screenshot.fullSrc, "full-resolution screenshot src is required");
    assert.match(screenshot.fullSrc, /-original\.jpg$/);
    assert.ok(screenshot.alt, "screenshot alt is required");
    assert.ok(screenshot.caption, "screenshot caption is required");
    const previewUrl = new URL(`../${screenshot.src}`, import.meta.url);
    const thumbnailUrl = new URL(`../${screenshot.thumbSrc}`, import.meta.url);
    await access(previewUrl);
    await access(thumbnailUrl);
    await access(new URL(`../${screenshot.fullSrc}`, import.meta.url));
    const [previewStats, thumbnailStats] = await Promise.all([
      stat(previewUrl),
      stat(thumbnailUrl),
    ]);
    assert.ok(
      thumbnailStats.size < previewStats.size,
      "dedicated thumbnail must be smaller than its drawer preview",
    );
  }
});

test("Warcraft III uses the classic Frozen Throne cover with a restrained default review", async () => {
  const warcraft = archive.games.find((game) => game.id === "manual-warcraft3");

  assert.ok(warcraft, "Warcraft III record is missing");
  assert.equal(warcraft.name, "魔兽争霸 III");
  assert.equal(warcraft.platform, "other");
  assert.equal(warcraft.primaryGenre, "即时战略");
  assert.equal(warcraft.coreStructure, "自定义地图");
  assert.equal(warcraft.playPeriod, "2010–2017");
  assert.match(warcraft.note, /守图/);
  assert.ok(Array.isArray(warcraft.review));
  assert.equal(warcraft.review.length, 1);
  assert.ok(warcraft.review[0].length > 0);
  assert.equal(warcraft.cover, "assets/covers/manual-warcraft3.png");
  await access(new URL(`../${warcraft.cover}`, import.meta.url));
});

test("Warframe keeps the approved short personal note", () => {
  const warframe = archive.games.find((game) => game.id === "230410");

  assert.ok(warframe, "Warframe record is missing");
  assert.deepEqual(warframe.review, [
    "重肝微氪，特别适合拿来消磨时间的刷子游戏。内容量大得离谱，随便拎出一个小系统都够研究很久。喜欢太空机甲的话，很难错过。",
  ]);
});

test("Silksong keeps the eight screenshots selected from the complete gallery", async () => {
  const silksong = archive.games.find((game) => game.id === "1030300");

  await assertScreenshotCollection(silksong, [
    "01-silksong-004",
    "02-silksong-008",
    "03-silksong-023",
    "04-silksong-025",
    "05-silksong-030",
    "06-silksong-072",
    "07-silksong-073",
    "08-silksong-082",
  ]);
});

test("Black Myth Wukong keeps the fourteen screenshots in the approved order", async () => {
  const wukong = archive.games.find((game) => game.id === "2358720");

  await assertScreenshotCollection(wukong, [
    "01-wukong-001",
    "02-wukong-002",
    "03-wukong-004",
    "04-wukong-003",
    "05-wukong-010",
    "06-wukong-014",
    "07-wukong-044",
    "08-wukong-049",
    "09-wukong-052",
    "10-wukong-055",
    "11-wukong-064",
    "12-wukong-069",
    "13-wukong-074",
    "14-wukong-081",
  ]);
});

test("Elden Ring keeps the approved review and eight screenshots in the selected order", async () => {
  const eldenRing = archive.games.find((game) => game.id === "1245620");

  assert.ok(eldenRing, "Elden Ring record is missing");
  assert.deepEqual(eldenRing.review, [
    "目前玩过的所有游戏里，毋庸置疑的 GOAT。魂系列的集大成之作，美术、光影、音乐、战斗、箱庭和开放世界探索全是顶尖水平。最喜欢的还是配乐和哥特式建筑以及碎片化叙事的那种神秘史诗感。",
  ]);

  const expectedScreenshots = [
    "01-moonlit-cliff",
    "02-gothic-castle-portrait",
    "03-gothic-castle-approach",
    "04-erdtree-and-moon",
    "05-leyndell-encounter",
    "06-mountain-pass",
    "07-lands-between-panorama",
    "08-farum-azula-storm",
  ];

  assert.deepEqual(
    eldenRing.screenshots?.map(({ src }) =>
      src.replace("assets/screenshots/1245620/", "").replace(".webp", ""),
    ),
    expectedScreenshots,
  );

  for (const screenshot of eldenRing.screenshots) {
    assert.ok(screenshot.thumbSrc, "dedicated thumbnail src is required");
    assert.match(screenshot.thumbSrc, /-thumb\.webp$/);
    assert.ok(screenshot.fullSrc, "full-resolution screenshot src is required");
    assert.match(screenshot.fullSrc, /-original\.jpg$/);
    assert.ok(screenshot.alt, "screenshot alt is required");
    assert.ok(screenshot.caption, "screenshot caption is required");

    const previewUrl = new URL(`../${screenshot.src}`, import.meta.url);
    const thumbnailUrl = new URL(`../${screenshot.thumbSrc}`, import.meta.url);
    const originalUrl = new URL(`../${screenshot.fullSrc}`, import.meta.url);
    await Promise.all([
      access(previewUrl),
      access(thumbnailUrl),
      access(originalUrl),
    ]);
    const [previewStats, thumbnailStats] = await Promise.all([
      stat(previewUrl),
      stat(thumbnailUrl),
    ]);
    assert.ok(
      thumbnailStats.size < previewStats.size,
      "dedicated thumbnail must be smaller than its drawer preview",
    );
  }
});

test("Monster Hunter Wilds keeps the approved short review", () => {
  const monsterHunterWilds = archive.games.find((game) => game.id === "2246340");

  assert.ok(monsterHunterWilds, "Monster Hunter Wilds record is missing");
  assert.deepEqual(monsterHunterWilds.review, ["太刀，帅！"]);
});

test("Monster Hunter: World keeps the approved short review and three selected original screenshots", async () => {
  const monsterHunterWorld = archive.games.find((game) => game.id === "582010");

  assert.ok(monsterHunterWorld, "Monster Hunter: World record is missing");
  assert.deepEqual(monsterHunterWorld.review, ["太刀，帅！"]);

  const expectedScreenshots = [
    "01-fatalis-slash",
    "02-hoarfrost-sunset",
    "03-savage-deviljho-hunt",
  ];

  assert.deepEqual(
    monsterHunterWorld.screenshots?.map(({ src }) =>
      src.replace("assets/screenshots/582010/", "").replace(".webp", ""),
    ),
    expectedScreenshots,
  );

  for (const screenshot of monsterHunterWorld.screenshots) {
    assert.ok(screenshot.thumbSrc, "dedicated thumbnail src is required");
    assert.match(screenshot.thumbSrc, /-thumb\.webp$/);
    assert.ok(screenshot.fullSrc, "full-resolution screenshot src is required");
    assert.match(screenshot.fullSrc, /-original\.jpg$/);
    assert.ok(screenshot.alt, "screenshot alt is required");
    assert.ok(screenshot.caption, "screenshot caption is required");

    const previewUrl = new URL(`../${screenshot.src}`, import.meta.url);
    const thumbnailUrl = new URL(`../${screenshot.thumbSrc}`, import.meta.url);
    const originalUrl = new URL(`../${screenshot.fullSrc}`, import.meta.url);
    await Promise.all([
      access(previewUrl),
      access(thumbnailUrl),
      access(originalUrl),
    ]);
    const [previewStats, thumbnailStats] = await Promise.all([
      stat(previewUrl),
      stat(thumbnailUrl),
    ]);
    assert.ok(
      thumbnailStats.size < previewStats.size,
      "dedicated thumbnail must be smaller than its drawer preview",
    );
  }
});

test("the approved small Steam screenshot collections are imported in editorial order", async () => {
  const expectedCollections = new Map([
    ["1868140", [
      "01-deep-sea-eel",
      "02-giant-crab",
      "03-godzilla",
      "04-kaiju-sunset",
      "05-giant-shark",
      "06-ancient-creature",
      "07-bancho-toast",
      "08-thank-you",
      "09-jungle-festival",
    ]],
    ["2322010", ["01-giant-encounter", "02-snowy-overlook", "03-eclipse"]],
    ["2277560", ["01-misty-landscape", "02-sunset-town", "03-branching-tree"]],
    ["578080", ["01-match-moment"]],
    ["2215430", ["01-pampas-field"]],
  ]);

  for (const [gameId, expectedNames] of expectedCollections) {
    const game = archive.games.find((candidate) => candidate.id === gameId);
    await assertScreenshotCollection(game, expectedNames);
  }
});

test("Dyson Sphere Program keeps the approved two-playthrough detail", () => {
  const dysonSphereProgram = archive.games.find((game) => game.id === "1366540");

  assert.ok(dysonSphereProgram, "Dyson Sphere Program record is missing");
  assert.equal(dysonSphereProgram.playthroughs, 2);
});

test("The Witcher 3 keeps the approved review and two-playthrough detail", () => {
  const witcher3 = archive.games.find((game) => game.id === "292030");

  assert.ok(witcher3, "The Witcher 3 record is missing");
  assert.equal(witcher3.playthroughs, 2);
  assert.deepEqual(witcher3.review, [
    "目前玩过的 RPG 里，单论剧情，毫无疑问是 GOAT。战斗一般，剧情真夯。",
  ]);
  assert.deepEqual(witcher3.reviewSections, [
    {
      title: "本体",
      text: "战争把人推向一个个没有正确答案的选择。杰洛特能杀掉怪物，却解决不了偏见、贪婪和恐惧。最难忘的反而是那些做完很久以后，依然不知道自己选得对不对的任务。",
    },
    {
      title: "资料片 · 石之心",
      cover: "assets/covers/378649.jpg",
      text: "一个关于欲望、爱情和代价的故事。欧吉尔德、爱丽丝与镜子大师，把经典的“魔鬼契约”讲得冷酷又克制。篇幅不算长，却可能是《巫师 3》里完成度最高、后劲也最足的一段。",
    },
    {
      title: "资料片 · 血与酒",
      cover: "assets/covers/378648.jpg",
      text: "陶森特像一场阳光明媚的骑士童话，葡萄酒、城堡和仪式之下，藏着的仍是偏见与旧债。它的体量已经很像一部续作，而最好的地方，是终于给漂泊半生的杰洛特留了一个可以回去的家。",
    },
  ]);
});

test("every archived game has an editable first-draft review", () => {
  assert.ok(archive.games.length > 0, "game archive must not be empty");

  const missingReviews = archive.games
    .filter(
      (game) =>
        !Array.isArray(game.review) ||
        !game.review.some((paragraph) => String(paragraph || "").trim()),
    )
    .map((game) => `${game.id}:${game.name}`);

  assert.deepEqual(
    missingReviews,
    [],
    `games missing first-draft reviews: ${missingReviews.join(", ")}`,
  );
});

test("structured review sections stay compact and well formed", () => {
  const gamesWithSections = archive.games.filter((game) => game.reviewSections);

  assert.ok(gamesWithSections.length > 0, "at least one major expansion should use sections");
  gamesWithSections.forEach((game) => {
    assert.ok(Array.isArray(game.reviewSections), `${game.name} sections must be an array`);
    game.reviewSections.forEach((section) => {
      assert.ok(String(section.title || "").trim(), `${game.name} section title is required`);
      assert.ok(String(section.text || "").trim(), `${game.name} section text is required`);
    });
  });
});

test("every base game and expansion has a complete two-sentence work note", () => {
  const incompleteNotes = [];

  archive.games.forEach((game) => {
    const sections = Array.isArray(game.reviewSections)
      ? game.reviewSections
      : [];
    const hasExplicitBase = sections.some((section) =>
      /^(本体|基础游戏)$/.test(String(section.title || "").trim()),
    );
    const notes = sections.map((section) => ({
      title: String(section.title || "").trim(),
      text: String(section.text || section.description || "").trim(),
    }));

    if (!hasExplicitBase) {
      notes.unshift({
        title: "本体",
        text: String(game.workDescription || "").trim(),
      });
    }

    notes.forEach(({ title, text }) => {
      const sentenceCount = (text.match(/[。！？]/g) || []).length;
      if (
        text.length < 45 ||
        sentenceCount < 2 ||
        /(?:\.\.\.|…)$/.test(text)
      ) {
        incompleteNotes.push(`${game.id}:${game.name}:${title}`);
      }
    });
  });

  assert.deepEqual(
    incompleteNotes,
    [],
    `incomplete two-sentence work notes: ${incompleteNotes.join(", ")}`,
  );
});

test("selective personal honors stay explicit for Elden Ring and The Witcher 3", () => {
  const eldenRing = archive.games.find((game) => game.id === "1245620");
  const witcher3 = archive.games.find((game) => game.id === "292030");

  assert.ok(eldenRing, "Elden Ring record is missing");
  assert.ok(witcher3, "The Witcher 3 record is missing");
  assert.deepEqual(eldenRing.personalHonors, ["GOAT"]);
  assert.deepEqual(witcher3.personalHonors, ["剧情 GOAT"]);
  assert.deepEqual(
    archive.games
      .filter((game) => Array.isArray(game.personalHonors))
      .map((game) => game.id)
      .sort(),
    ["1245620", "292030"],
  );
});

test("personal honors stay archived without rendering in the compact selected record", () => {
  const detailsSource = appSource.slice(
    appSource.indexOf("function createGameRecordPanel"),
    appSource.indexOf("function createManualHighlight"),
  );

  assert.doesNotMatch(detailsSource, /game\.personalHonors/);
  assert.doesNotMatch(detailsSource, /game-detail-badge-rail/);
  assert.doesNotMatch(detailsSource, /game-detail-playthroughs/);
  assert.doesNotMatch(detailsSource, /game-detail-personal-honor/);
});

test("approved play periods and Elden Ring playthrough count stay explicit", () => {
  const eldenRing = archive.games.find((game) => game.id === "1245620");
  const dave = archive.games.find((game) => game.id === "1868140");

  assert.ok(eldenRing, "Elden Ring record is missing");
  assert.ok(dave, "DAVE THE DIVER record is missing");
  assert.equal(dave.playPeriod, "2025–2026");
  assert.equal(eldenRing.playPeriod, "2022–2025");
  assert.equal(eldenRing.playthroughs, 5);
});

test("playthrough data stays archived without appearing in the compact selected record", () => {
  const panelSource = appSource.slice(
    appSource.indexOf("function createGameRecordPanel"),
    appSource.indexOf("function createManualHighlight"),
  );

  assert.doesNotMatch(panelSource, /game\.playthroughs/);
  assert.doesNotMatch(panelSource, /game-record-personal/);
  assert.doesNotMatch(panelSource, /game-detail-playthroughs/);
  assert.doesNotMatch(appSource, /make\("summary", "", "游玩记录"\)/);
  assert.doesNotMatch(
    appSource,
    /make\(\s*"span",\s*"game-playthroughs"/s,
  );
  assert.match(styleSource, /\.game-detail-playthroughs\s*\{/);
  assert.doesNotMatch(styleSource, /\.game-playthroughs(?:\s|,|\{|:)/);
});

test("metadata row uses custom fast tooltips", () => {
  assert.match(appSource, /dataset\.tooltip/);
  assert.doesNotMatch(appSource, /period\.title\s*=/);
  assert.doesNotMatch(appSource, /activeStatus\.title\s*=/);
  assert.match(styleSource, /content:\s*attr\(data-tooltip\)/);
  assert.match(styleSource, /transition-delay:\s*120ms/);
});

test("personal reviews remain in data but are not rendered in the compact selected record", () => {
  const panelSource = appSource.slice(
    appSource.indexOf("function createGameRecordPanel"),
    appSource.indexOf("function createManualHighlight"),
  );

  assert.doesNotMatch(
    appSource,
    /make\("span", "game-detail-label", "短评"\)/,
  );
  assert.doesNotMatch(panelSource, /game-personal-review/);
  assert.doesNotMatch(panelSource, /setAttribute\("aria-label", "个人评价"\)/);
  assert.doesNotMatch(panelSource, /"个人评价"/);
});

test("archive uses a stable list and a separate selected-game record panel", () => {
  assert.match(indexSource, /class="archive-workspace"/);
  assert.match(indexSource, /id="game-record-panel"/);
  assert.match(appSource, /function renderGameRecordPanel\(game\)/);
  assert.match(appSource, /row\.dataset\.gameId/);
  assert.match(appSource, /row\.setAttribute\("aria-selected"/);
  assert.match(appSource, /event\.key === "Enter"/);
  assert.match(appSource, /event\.key === " "/);
  assert.doesNotMatch(appSource, /make\("details", "game-details"\)/);
  assert.match(
    styleSource,
    /\.archive-workspace\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:/s,
  );
  assert.match(styleSource, /\.game-record-panel\s*\{[^}]*position:\s*sticky;/s);
});

test("work contents adapt explicit records and existing expansion sections without invented copy", () => {
  const adapterSource = appSource.slice(
    appSource.indexOf("function buildGameWorkContents"),
    appSource.indexOf("function createGameRecordPanel"),
  );

  assert.match(adapterSource, /game\.workContents/);
  assert.match(adapterSource, /game\.reviewSections/);
  assert.match(adapterSource, /section\?\.cover/);
  assert.match(adapterSource, /description/);
  assert.match(adapterSource, /game\.cover/);
  assert.doesNotMatch(adapterSource, /暂无|待补充|敬请期待/);
});

test("compact records separate work cards, work facts, and a screenshot-only gallery", () => {
  const panelSource = appSource.slice(
    appSource.indexOf("function createGameRecordPanel"),
    appSource.indexOf("function createManualHighlight"),
  );

  assert.match(panelSource, /game-record-works/);
  assert.match(panelSource, /game-work-content-rail/);
  assert.match(panelSource, /game-work-description/);
  assert.match(panelSource, /game-record-facts-section/);
  assert.match(panelSource, /game-record-gallery/);
  assert.match(panelSource, /"game-record-section-title", "游戏截图"/);
  assert.match(panelSource, /"game-record-empty", "暂无游戏记录"/);
  assert.doesNotMatch(panelSource, /game-record-personal/);
  assert.doesNotMatch(panelSource, /game-personal-review/);
  assert.match(panelSource, /function createRecordScreenshotStrip\(game, screenshots\)/);
  assert.match(panelSource, /if \(!screenshots\.length\) return null;/);
  assert.match(appSource, /image\.src\s*=\s*screenshot\.src/);
  assert.match(appSource, /openScreenshotLightbox/);
  assert.match(appSource, /screenshot\.fullSrc\s*\|\|\s*screenshot\.src/);
  assert.match(appSource, /ArrowLeft/);
  assert.match(appSource, /ArrowRight/);
  assert.match(appSource, /event\.key\s*===\s*"Escape"/);
  assert.doesNotMatch(appSource, /game-editorial-trigger/);
  assert.doesNotMatch(appSource, /game-editorial-dialog/);
  assert.doesNotMatch(styleSource, /\.game-editorial-dialog/);
  assert.match(styleSource, /\.game-screenshot-lightbox::backdrop/);
});

test("selected-game panel keeps work cards before facts and the screenshot gallery", () => {
  const panelSource = appSource.slice(
    appSource.indexOf("function createGameRecordPanel"),
    appSource.indexOf("function createManualHighlight"),
  );
  const worksIndex = panelSource.indexOf("game-record-works");
  const factsIndex = panelSource.indexOf("game-record-facts-section");
  const galleryIndex = panelSource.indexOf("game-record-gallery");

  assert.notEqual(worksIndex, -1, "work layer must exist");
  assert.notEqual(factsIndex, -1, "work facts must exist");
  assert.notEqual(galleryIndex, -1, "screenshot gallery must exist");
  assert.ok(worksIndex < factsIndex, "work cards must render before work facts");
  assert.ok(factsIndex < galleryIndex, "work facts must render before screenshots");
  assert.match(
    styleSource,
    /@media\s*\(max-width:\s*1100px\)[\s\S]*?\.archive-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s,
  );
  assert.match(
    styleSource,
    /@media\s*\(max-width:\s*1100px\)[\s\S]*?\.game-record-panel\s*\{[^}]*order:\s*-1;/s,
    "the selected record must remain visible above the long game list in a narrow split view",
  );
});

test("Elden Ring exposes the base game and Shadow of the Erdtree as separate work records", async () => {
  const eldenRing = archive.games.find((game) => game.id === "1245620");

  assert.deepEqual(
    eldenRing.reviewSections?.map((section) => section.title),
    ["本体", "资料片 · 黄金树幽影"],
  );
  assert.ok(
    eldenRing.reviewSections.every((section) => section.text?.trim()),
    "both work records need neutral descriptions",
  );
  assert.equal(
    eldenRing.reviewSections[1].cover,
    "assets/covers/2778580.jpg",
    "the DLC should use its own local cover",
  );
  const dlcCoverUrl = new URL(`../${eldenRing.reviewSections[1].cover}`, import.meta.url);
  await access(dlcCoverUrl);
  assert.ok((await stat(dlcCoverUrl)).size > 20_000, "DLC cover should be a real local image");
});

test("major expansion descriptions drive the work selector instead of personal tags", () => {
  const panelSource = appSource.slice(
    appSource.indexOf("function createGameRecordPanel"),
    appSource.indexOf("function createManualHighlight"),
  );
  assert.match(panelSource, /workContents\.forEach/);
  assert.match(panelSource, /selectWorkContent/);
  assert.match(panelSource, /aria-pressed/);
  assert.match(styleSource, /\.game-work-card\.is-active\s*\{/);
});

test("work selector drives one large cover stage, unified thumbnails, and selected-work facts", () => {
  const panelSource = appSource.slice(
    appSource.indexOf("function createGameRecordPanel"),
    appSource.indexOf("function createManualHighlight"),
  );

  assert.match(panelSource, /game-work-stage/);
  assert.match(panelSource, /game-work-stage-image/);
  assert.match(panelSource, /game-work-stage-placeholder/);
  assert.match(panelSource, /game-work-thumbnail-rail/);
  assert.match(panelSource, /game-work-thumbnail/);
  assert.match(panelSource, /selectedWorkLabel/);
  assert.match(panelSource, /selectedWorkDescription/);
  assert.match(panelSource, /selectedWorkTitle/);
  assert.match(panelSource, /aria-pressed/);
  assert.match(panelSource, /keydown/);
  assert.match(panelSource, /ArrowLeft/);
  assert.match(panelSource, /ArrowRight/);
  assert.match(
    styleSource,
    /\.game-work-stage\s*\{[^}]*aspect-ratio:\s*460\s*\/\s*215;/s,
  );
  assert.match(
    styleSource,
    /\.game-work-thumbnail-rail\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s,
  );
});

test("work cards use a dominant base cover and unlabeled expansion covers", () => {
  const panelSource = appSource.slice(
    appSource.indexOf("function createGameRecordPanel"),
    appSource.indexOf("function createManualHighlight"),
  );

  assert.match(
    panelSource,
    /content\.cover\s*\?\s*" has-cover"\s*:\s*" is-text-only"/,
  );
  assert.match(panelSource, /content\.type === "base"\s*\?\s*" is-base-work"\s*:\s*" is-expansion-work"/);
  assert.match(panelSource, /card\.setAttribute\("aria-label", `查看作品内容：\$\{content\.title\}`\)/);
  assert.match(panelSource, /card\.title\s*=\s*content\.title/);
  assert.doesNotMatch(panelSource, /card\.dataset\.workType/);
  assert.doesNotMatch(panelSource, /game-work-card-copy|game-work-card-type|game-work-card-title/);
  assert.doesNotMatch(panelSource, /"BASE"|"DLC"|BASE GAME|DLC \/ EXPANSION/);
  assert.match(
    styleSource,
    /\.game-work-card\.has-cover\s*\{[^}]*position:\s*relative;[^}]*aspect-ratio:\s*460\s*\/\s*215;/s,
  );
  assert.match(
    styleSource,
    /\.game-work-card\.is-base-work\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s,
  );
  assert.match(
    styleSource,
    /\.game-work-content-rail\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s,
  );
  assert.match(
    styleSource,
    /\.game-work-card\.is-expansion-work\s*\{[^}]*min-width:\s*0;/s,
  );
  assert.doesNotMatch(styleSource, /content:\s*attr\(data-work-type\)/);
});

test("selected record uses a larger visual scale than the compact list", () => {
  assert.match(
    styleSource,
    /\.archive-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*0\.96fr\)\s+minmax\(500px,\s*1\.04fr\);[^}]*gap:\s*32px;/s,
  );
  assert.match(
    styleSource,
    /\.game-record-panel\s*\{[^}]*padding:\s*26px;/s,
  );
  assert.match(
    styleSource,
    /\.game-record-title\s*\{[^}]*font-size:\s*clamp\(30px,\s*3vw,\s*42px\);/s,
  );
  assert.match(
    styleSource,
    /\.game-work-content-rail\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[^}]*gap:\s*10px;/s,
  );
  assert.match(
    styleSource,
    /\.game-work-card\.has-cover img\s*\{[^}]*height:\s*100%;[^}]*object-fit:\s*cover;/s,
  );
  assert.match(
    styleSource,
    /\.game-work-description\s*\{[^}]*font-size:\s*14px;/s,
  );
  assert.match(
    styleSource,
    /\.game-record-fact dt\s*\{[^}]*font-size:\s*11px;/s,
  );
  assert.match(
    styleSource,
    /\.game-record-fact dd\s*\{[^}]*font-size:\s*14px;/s,
  );
});

test("missing-cover DLC cards remain quiet visual placeholders", () => {
  const panelSource = appSource.slice(
    appSource.indexOf("function createGameRecordPanel"),
    appSource.indexOf("function createManualHighlight"),
  );

  assert.match(
    panelSource,
    /content\.cover\s*\?\s*" has-cover"\s*:\s*" is-text-only"/,
  );
  assert.match(
    styleSource,
    /\.game-work-card\.is-text-only\s*\{[^}]*min-height:\s*74px;[^}]*background:/s,
  );
  assert.doesNotMatch(styleSource, /\.game-work-card\.is-text-only::after\s*\{/);
  assert.doesNotMatch(panelSource, /make\("strong", "game-work-card-title"/);
});

test("record sections expose compact work facts and screenshot headings", () => {
  const panelSource = appSource.slice(
    appSource.indexOf("function createGameRecordPanel"),
    appSource.indexOf("function createManualHighlight"),
  );

  assert.match(panelSource, /"game-record-facts-section"/);
  assert.match(panelSource, /"game-record-section-title", "作品资料"/);
  assert.match(panelSource, /"game-record-section-title", "游戏截图"/);
  assert.doesNotMatch(panelSource, /"game-record-section-title", "个人评价"/);
  assert.doesNotMatch(panelSource, /game-record-metadata/);
  assert.match(
    styleSource,
    /\.game-record-facts-section\s*\{[^}]*border-top:[^;}]+;[^}]*border-bottom:/s,
  );
});

test("records without screenshots show a compact empty gallery state", () => {
  const panelSource = appSource.slice(
    appSource.indexOf("function createGameRecordPanel"),
    appSource.indexOf("function createManualHighlight"),
  );
  assert.match(panelSource, /const gallery = make\("section", "game-record-gallery"\)/);
  assert.match(panelSource, /if \(screenshotStrip\)/);
  assert.match(panelSource, /"game-record-empty", "暂无游戏记录"/);
  assert.match(styleSource, /\.game-record-empty\s*\{/);
});

test("lightbox navigation uses centered mirrored SVG chevrons", () => {
  assert.match(
    styleSource,
    /\.game-screenshot-lightbox-nav\s*\{[^}]*place-items:\s*center;[^}]*font-size:\s*0;/s,
  );
  assert.match(
    appSource,
    /function createLightboxChevron\(direction\)/,
  );
  assert.match(
    appSource,
    /direction === "previous"\s*\?\s*"M15\.5 5 L8\.5 12 L15\.5 19"\s*:\s*"M8\.5 5 L15\.5 12 L8\.5 19"/s,
  );
  assert.match(
    styleSource,
    /\.game-screenshot-lightbox-chevron\s*\{[^}]*display:\s*block;[^}]*width:\s*20px;[^}]*height:\s*20px;/s,
  );
  assert.doesNotMatch(styleSource, /\.game-screenshot-lightbox-nav::before/);
  assert.doesNotMatch(styleSource, /\.game-screenshot-lightbox-(?:previous|next)::before/);
  assert.doesNotMatch(
    styleSource,
    /\.game-screenshot-lightbox-nav\s*\{[^}]*font-size:\s*(?:28|36)px;/s,
  );
});

test("lightbox uses a near-fullscreen canvas with overlay navigation", () => {
  assert.match(
    styleSource,
    /\.game-screenshot-lightbox\s*\{[^}]*width:\s*calc\(100vw - 8px\);[^}]*height:\s*calc\(100dvh - 8px\);[^}]*padding:\s*8px;/s,
  );
  assert.match(
    styleSource,
    /\.game-screenshot-lightbox\[open\]\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s,
  );
  assert.match(
    styleSource,
    /\.game-screenshot-lightbox-nav\s*\{[^}]*position:\s*absolute;[^}]*top:\s*50%;[^}]*transform:\s*translateY\(-50%\);/s,
  );
});

test("perfect games receive a restrained gradient cover frame", () => {
  assert.match(
    appSource,
    /if \(game\.perfect\) frame\.classList\.add\("is-perfect"\);/,
  );
  assert.match(
    styleSource,
    /\.row-cover\.is-perfect\s*\{[^}]*padding:\s*2px;[^}]*linear-gradient\(/s,
  );
});

test("work cards follow the Steam capsule ratio without letterboxing", () => {
  assert.match(
    styleSource,
    /\.game-work-card\.has-cover\s*\{[^}]*aspect-ratio:\s*460\s*\/\s*215;/s,
  );
  assert.match(
    styleSource,
    /\.game-work-card\.has-cover img\s*\{[^}]*height:\s*100%;[^}]*object-fit:\s*cover;/s,
  );
  assert.doesNotMatch(
    styleSource,
    /\.game-work-card\.has-cover img\s*\{[^}]*background:/s,
  );
});

test("Monster Hunter World Iceborne has a local verified cover and description", async () => {
  const world = archive.games.find((game) => game.id === "582010");
  const iceborne = world?.reviewSections?.find((section) =>
    String(section.title || "").includes("冰原"),
  );

  assert.ok(iceborne, "Iceborne work section is missing");
  assert.equal(iceborne.cover, "assets/covers/1118010.jpg");
  assert.ok(String(iceborne.text || iceborne.description || "").trim());
  await access(new URL("../assets/covers/1118010.jpg", import.meta.url));
});

test("Nioh complete editions give every registered expansion a local official visual", async () => {
  const expectations = new Map([
    ["1325200", [
      ["资料片 · 牛若战记", "assets/covers/nioh2-tengus-disciple.jpg"],
      ["资料片 · 平安京讨魔传", "assets/covers/nioh2-darkness-in-the-capital.jpg"],
      ["资料片 · 太初武士秘史", "assets/covers/nioh2-first-samurai.jpg"],
    ]],
    ["485510", [
      ["资料片 · 东北之龙", "assets/covers/nioh-dragon-of-the-north.jpg"],
      ["资料片 · 义之继承者", "assets/covers/nioh-defiant-honor.jpg"],
      ["资料片 · 元和偃武", "assets/covers/nioh-bloodsheds-end.jpg"],
    ]],
  ]);

  for (const [gameId, sections] of expectations) {
    const game = archive.games.find((entry) => entry.id === gameId);
    assert.ok(game, `${gameId} record is missing`);

    for (const [title, cover] of sections) {
      const section = game.reviewSections?.find((entry) => entry.title === title);
      assert.ok(section, `${game.name} is missing ${title}`);
      assert.equal(section.cover, cover);
      assert.ok(String(section.text || "").trim().length >= 30, `${title} needs a useful description`);
      const coverUrl = new URL(`../${cover}`, import.meta.url);
      await access(coverUrl);
      assert.ok((await stat(coverUrl)).size > 10_000, `${title} cover is too small to be a real visual`);
    }
  }
});

test("DAVE THE DIVER separates the base game and In the Jungle content pack", async () => {
  const dave = archive.games.find((game) => game.id === "1868140");

  assert.deepEqual(
    dave?.reviewSections?.map((section) => section.title),
    ["本体", "资料片 · In the Jungle"],
  );
  assert.equal(dave.reviewSections[0].cover, "assets/covers/dave-the-diver-base-header.jpg");
  assert.equal(dave.reviewSections[1].cover, "assets/covers/4394810.jpg");
  assert.ok(dave.reviewSections.every((section) => String(section.text || "").trim().length >= 30));
  await access(new URL("../assets/covers/4394810.jpg", import.meta.url));
  await access(new URL("../assets/covers/dave-the-diver-base-header.jpg", import.meta.url));
});

test("Lies of P Overture uses its independent official DLC cover and useful copy", async () => {
  const liesOfP = archive.games.find((game) => game.id === "1627720");
  const overture = liesOfP?.reviewSections?.find((section) =>
    String(section.title || "").includes("序曲"),
  );

  assert.ok(overture, "Lies of P: Overture section is missing");
  assert.equal(overture.cover, "assets/covers/2848330.jpg");
  assert.ok(String(overture.text || "").trim().length >= 30);
  const coverUrl = new URL(`../${overture.cover}`, import.meta.url);
  await access(coverUrl);
  assert.ok((await stat(coverUrl)).size > 20_000, "Overture cover should be a real local image");
});

test("Wo Long gives all three registered DLCs independent official covers", async () => {
  const woLong = archive.games.find((game) => game.id === "1448440");
  const expectations = [
    ["逐鹿中原", "assets/covers/2205894.jpg"],
    ["称霸江东", "assets/covers/2205895.jpg"],
    ["风起荆襄", "assets/covers/2205896.jpg"],
  ];

  assert.ok(woLong, "Wo Long record is missing");
  for (const [title, cover] of expectations) {
    const section = woLong.reviewSections?.find((entry) => entry.title === title);
    assert.ok(section, `Wo Long is missing ${title}`);
    assert.equal(section.cover, cover);
    assert.ok(String(section.text || "").trim().length >= 30, `${title} needs a useful description`);
    const coverUrl = new URL(`../${cover}`, import.meta.url);
    await access(coverUrl);
    assert.ok((await stat(coverUrl)).size > 20_000, `${title} cover should be a real local image`);
  }
});

test("automatic base work cards receive a neutral structured description", () => {
  const workBuilderSource = appSource.slice(
    appSource.indexOf("function buildDefaultWorkDescription"),
    appSource.indexOf("function createGameRecordPanel"),
  );

  assert.match(workBuilderSource, /function buildDefaultWorkDescription\(game\)/);
  assert.match(workBuilderSource, /game\.primaryGenre/);
  assert.match(workBuilderSource, /game\.coreStructure/);
  assert.match(workBuilderSource, /description:\s*defaultDescription/);
  assert.doesNotMatch(workBuilderSource, /description:\s*""/);
});

test("automatic base work cards prefer a sourced work description", () => {
  const workBuilderSource = appSource.slice(
    appSource.indexOf("function buildDefaultWorkDescription"),
    appSource.indexOf("function buildGameWorkContents"),
  );

  assert.match(workBuilderSource, /game\.workDescription/);
  assert.match(workBuilderSource, /if \(sourcedDescription\) return sourcedDescription/);
});

test("most automatic Steam work cards carry a sourced official description", () => {
  const automaticSteamGames = archive.games.filter(
    (game) => game.platform === "steam" && !game.reviewSections?.length,
  );
  const sourcedGames = automaticSteamGames.filter(
    (game) =>
      String(game.workDescription || "").trim().length >= 20 &&
      /^https:\/\/store\.steampowered\.com\/app\//.test(
        String(game.workDescriptionSource || ""),
      ),
  );

  assert.ok(automaticSteamGames.length > 0);
  assert.ok(
    sourcedGames.length / automaticSteamGames.length >= 0.8,
    `expected at least 80% sourced descriptions, got ${sourcedGames.length}/${automaticSteamGames.length}`,
  );
});

test("Dying Light descriptions use the protagonist name Crane in Chinese", () => {
  const dyingLight = archive.games.find((game) => game.id === "239140");
  const descriptions = dyingLight?.reviewSections
    ?.map((section) => String(section.text || ""))
    .join("\n");

  assert.ok(dyingLight, "Dying Light record is missing");
  assert.match(descriptions, /克兰/);
  assert.doesNotMatch(descriptions, /特工凯尔|凯尔离开/);
});

test("record hierarchy removes the English eyebrow and distinguishes expansion metadata", () => {
  const panelSource = appSource.slice(
    appSource.indexOf("function createGameRecordPanel"),
    appSource.indexOf("function createManualHighlight"),
  );

  assert.doesNotMatch(panelSource, /SELECTED RECORD/);
  assert.match(
    panelSource,
    /selectedWorkLabel\.classList\.toggle\(\s*"is-expansion"/,
  );
  assert.match(
    styleSource,
    /\.game-record-section-title\s*\{[^}]*font-size:\s*13px;[^}]*font-weight:\s*760;/s,
  );
  assert.match(
    styleSource,
    /\.game-selected-work-label\.is-expansion\s*\{[^}]*color:\s*var\(--amber\);/s,
  );
});

test("painted-world and Oolacile descriptions avoid the repeated short-DLC template", () => {
  const darkSouls3 = archive.games.find((game) => game.id === "374320");
  const darkSoulsRemastered = archive.games.find((game) => game.id === "570940");
  const ariandel = darkSouls3?.reviewSections?.find((section) =>
    String(section.title || "").includes("艾雷德尔"),
  );
  const oolacile = darkSoulsRemastered?.reviewSections?.find((section) =>
    String(section.title || "").includes("亚尔特留斯"),
  );

  assert.ok(ariandel, "Ashes of Ariandel section is missing");
  assert.match(ariandel.text, /魂一.*绘画世界/);
  assert.doesNotMatch(ariandel.text, /篇幅不长/);
  assert.ok(oolacile, "Artorias of the Abyss section is missing");
  assert.match(oolacile.text, /乌拉席露/);
  assert.doesNotMatch(oolacile.text, /篇幅不长/);
});
