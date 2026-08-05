import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(
  new URL("../app.js", import.meta.url),
  "utf8",
);
const indexSource = await readFile(
  new URL("../index.html", import.meta.url),
  "utf8",
);
const archive = JSON.parse(
  await readFile(new URL("../data/game_archive.json", import.meta.url), "utf8"),
);

function loadPureFunction(name, dependencies = {}) {
  const match = appSource.match(
    new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`),
  );
  assert.ok(match, `${name} helper is missing`);
  const names = Object.keys(dependencies);
  const values = Object.values(dependencies);
  return Function(...names, `"use strict"; return (${match[0]});`)(...values);
}

test("recently playing is the middle segment and result count is absent", () => {
  assert.doesNotMatch(indexSource, /id="result-count"/);
  assert.match(
    indexSource,
    /data-filter="all"[\s\S]*data-filter="active"[\s\S]*data-filter="perfect"/,
  );
});

test("active filter combines Steam activity and explicit manual activity", () => {
  const isRecentlyActive = loadPureFunction("isRecentlyActive");
  const names = archive.games
    .filter(isRecentlyActive)
    .map((game) => game.name)
    .sort((left, right) => left.localeCompare(right, "zh-CN"));

  assert.deepEqual(
    names,
    [
      "Counter-Strike 2",
      "Lies of P",
      "Nioh 3",
      "潜水员戴夫",
      "英雄联盟",
    ].sort((left, right) => left.localeCompare(right, "zh-CN")),
  );
});

test("active filter ignores platform while normal filters keep it", () => {
  const platformOf = loadPureFunction("platformOf");
  const isRecentlyActive = loadPureFunction("isRecentlyActive");
  const matchesPlatformFilter = loadPureFunction("matchesPlatformFilter", {
    platformOf,
    isRecentlyActive,
  });
  const league = archive.games.find((game) => game.id === "manual-lol");

  assert.equal(matchesPlatformFilter(league, "active", "steam"), true);
  assert.equal(matchesPlatformFilter(league, "all", "steam"), false);
  assert.equal(matchesPlatformFilter(league, "all", "tencent"), true);
});

test("active filter clears the selected platform treatment", () => {
  const isPlatformSelected = loadPureFunction("isPlatformSelected");

  assert.equal(isPlatformSelected("all", "steam", "steam"), true);
  assert.equal(isPlatformSelected("all", "steam", "tencent"), false);
  assert.equal(isPlatformSelected("active", "steam", "steam"), false);
});
