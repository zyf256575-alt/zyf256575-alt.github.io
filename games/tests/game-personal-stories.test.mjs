import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const archiveUrl = new URL("../data/game_archive.json", import.meta.url);
const appUrl = new URL("../app.js", import.meta.url);
const styleUrl = new URL("../styles.css", import.meta.url);

const archive = JSON.parse(await readFile(archiveUrl, "utf8"));
const appSource = await readFile(appUrl, "utf8");
const styleSource = await readFile(styleUrl, "utf8");

test("Dyson Sphere Program carries the approved personal story and four local screenshots", async () => {
  const dyson = archive.games.find((game) => game.id === "1366540");

  assert.ok(dyson, "Dyson Sphere Program record is missing");
  assert.equal(dyson.review?.length, 3);
  assert.match(dyson.review.join("\n"), /单球每分钟约 2\.3 万白糖/);
  assert.match(dyson.review.join("\n"), /近百万个建造单位/);
  assert.match(dyson.review.join("\n"), /工业浪漫/);
  assert.equal(dyson.screenshots?.length, 4);

  for (const screenshot of dyson.screenshots) {
    assert.ok(screenshot.src, "screenshot src is required");
    assert.ok(screenshot.alt, "screenshot alt is required");
    assert.ok(screenshot.caption, "screenshot caption is required");
    await access(new URL(`../${screenshot.src}`, import.meta.url));
  }
});

test("Warcraft III is recorded without an invented long-form review", () => {
  const warcraft = archive.games.find((game) => game.id === "manual-warcraft3");

  assert.ok(warcraft, "Warcraft III record is missing");
  assert.equal(warcraft.name, "魔兽争霸 III");
  assert.equal(warcraft.platform, "other");
  assert.equal(warcraft.primaryGenre, "即时战略");
  assert.equal(warcraft.coreStructure, "自定义地图");
  assert.equal(warcraft.playPeriod, "2010–2017");
  assert.match(warcraft.note, /守图/);
  assert.equal(warcraft.review, undefined);
});

test("expanded details render personal stories and a responsive screenshot gallery", () => {
  assert.match(appSource, /game-personal-review/);
  assert.match(appSource, /game-screenshot-gallery/);
  assert.match(styleSource, /\.game-personal-review\b/);
  assert.match(styleSource, /\.game-screenshot-gallery\s*\{/);
  assert.match(
    styleSource,
    /\.game-details\.has-editorial\[open\]\s*~\s*\.game-play-period[\s\S]*?display:\s*none/,
  );
});
