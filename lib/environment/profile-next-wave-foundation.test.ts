import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as ts from "typescript";
import { describe, expect, test } from "bun:test";

import {
  publicActionSchema,
  publicSectionSchema,
} from "@/lib/analytics/contract";

const root = process.cwd();
const showcaseDirectory = resolve(root, "supabase/seeds/template-showcases");

function parse(relativePath: string) {
  return readFile(resolve(root, relativePath), "utf8").then((source) => ({
    source,
    tree: ts.createSourceFile(
      relativePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
  }));
}

function visit<T extends ts.Node>(
  tree: ts.Node,
  predicate: (node: ts.Node) => node is T,
) {
  const nodes: T[] = [];
  const walk = (node: ts.Node) => {
    if (predicate(node)) nodes.push(node);
    ts.forEachChild(node, walk);
  };
  walk(tree);
  return nodes;
}

function callNames(tree: ts.Node) {
  return visit(tree, ts.isCallExpression)
    .map((call) =>
      ts.isIdentifier(call.expression) ? call.expression.text : null,
    )
    .filter((name): name is string => Boolean(name));
}

function calledPropertyNames(tree: ts.Node) {
  return visit(tree, ts.isCallExpression)
    .map((call) =>
      ts.isPropertyAccessExpression(call.expression)
        ? call.expression.name.text
        : null,
    )
    .filter((name): name is string => Boolean(name));
}

function arrayInitializer(tree: ts.Node, name: string) {
  const declaration = visit(tree, ts.isVariableDeclaration).find(
    (entry) => ts.isIdentifier(entry.name) && entry.name.text === name,
  );
  if (!declaration?.initializer) {
    throw new Error(`Expected ${name} to have an initializer.`);
  }
  const initializer = declaration.initializer;
  expect(
    ts.isAsExpression(initializer) || ts.isArrayLiteralExpression(initializer),
  ).toBe(true);
  const array = ts.isAsExpression(initializer)
    ? initializer.expression
    : initializer;
  expect(ts.isArrayLiteralExpression(array)).toBe(true);
  return array as ts.ArrayLiteralExpression;
}

function stringEntries(array: ts.ArrayLiteralExpression) {
  return array.elements.filter(ts.isStringLiteral).map((entry) => entry.text);
}

function propertyString(object: ts.ObjectLiteralExpression, name: string) {
  const property = object.properties.find(
    (entry): entry is ts.PropertyAssignment =>
      ts.isPropertyAssignment(entry) &&
      ((ts.isIdentifier(entry.name) && entry.name.text === name) ||
        (ts.isStringLiteral(entry.name) && entry.name.text === name)),
  );
  return property && ts.isStringLiteral(property.initializer)
    ? property.initializer.text
    : null;
}

function analyticsDescriptors(tree: ts.Node) {
  return visit(tree, ts.isJsxAttribute).flatMap((attribute) => {
    if (
      !ts.isIdentifier(attribute.name) ||
      attribute.name.text !== "analytics" ||
      !attribute.initializer
    )
      return [];
    if (
      !ts.isJsxExpression(attribute.initializer) ||
      !attribute.initializer.expression ||
      !ts.isObjectLiteralExpression(attribute.initializer.expression)
    ) {
      return [];
    }
    const analytics = attribute.initializer.expression;
    const action = analytics.properties.find(
      (entry): entry is ts.PropertyAssignment =>
        ts.isPropertyAssignment(entry) &&
        ts.isIdentifier(entry.name) &&
        entry.name.text === "action",
    );
    const section = propertyString(analytics, "section");
    const type =
      action && ts.isObjectLiteralExpression(action.initializer)
        ? propertyString(action.initializer, "type")
        : null;
    return section && type ? [{ section, type }] : [];
  });
}

describe("next-wave locations, videos, and shop foundation", () => {
  test("reserves only isolated comment-only overlays in deterministic staging order", async () => {
    const placeholders = [
      "zz-next-wave-a.sql",
      "zz-next-wave-b.sql",
      "zz-next-wave-c.sql",
    ];
    const [apply, showcaseFiles] = await Promise.all([
      parse("scripts/apply-staging-template-seed.ts"),
      readdir(showcaseDirectory),
    ]);
    const files = stringEntries(arrayInitializer(apply.tree, "seedFiles"));

    expect(files.slice(-3)).toEqual(placeholders);
    expect(files).not.toContain("zz-treatment-service-parity.sql");
    expect(files).not.toContain("zz-link-parity.sql");
    expect(
      showcaseFiles.filter((file) => file.startsWith("zz-next-wave-")).sort(),
    ).toEqual([...placeholders].sort());
    expect(apply.source).toMatch(
      /Final rebase dependency:[\s\S]*zz-treatment-service-parity\.sql[\s\S]*zz-link-parity\.sql/,
    );

    for (const file of placeholders) {
      const content = await readFile(resolve(showcaseDirectory, file), "utf8");
      expect(content.trim()).not.toBe("");
      expect(
        content
          .split("\n")
          .every((line) => !line.trim() || line.trimStart().startsWith("--")),
      ).toBe(true);
    }
  });

  test("preserves the fixed staging and public-profile write guards", async () => {
    const { source, tree } = await parse(
      "scripts/apply-staging-template-seed.ts",
    );
    const literals = visit(tree, ts.isStringLiteral).map(
      (literal) => literal.text,
    );
    const regularExpressions = visit(tree, ts.isRegularExpressionLiteral).map(
      (expression) => expression.text,
    );

    expect(literals).toContain("pcbakmokevyrpiqvbzni");
    expect(source).toMatch(/linkedRef\s*!==\s*STAGING_PROJECT_REF/);
    expect(
      regularExpressions.some((expression) =>
        expression.includes("public_profiles"),
      ),
    ).toBe(true);
  });

  test("keeps the reusable public seam uncapped, selector-owned, and detached from parents", async () => {
    const [videos, products, entries] = await Promise.all([
      parse("app/[username]/_components/ProfileVideoSections.tsx"),
      parse("app/[username]/_components/ProfileProductSection.tsx"),
      readdir(resolve(root, "app/[username]/_components")),
    ]);
    const sources = [videos, products];

    for (const { tree } of sources) {
      const propertyNames = visit(tree, ts.isPropertyAccessExpression).map(
        (entry) => entry.name.text,
      );
      const identifiers = visit(tree, ts.isIdentifier).map(
        (entry) => entry.text,
      );
      expect(propertyNames).not.toContain("slice");
      expect(propertyNames).not.toContain("filter");
      expect(identifiers.some((name) => name.startsWith("normalize"))).toBe(
        false,
      );
    }

    const parents = entries.filter(
      (file) =>
        file.endsWith("ProfileTemplate.tsx") &&
        !file.startsWith("ProfileVideoSections") &&
        !file.startsWith("ProfileProductSection"),
    );
    for (const parent of parents) {
      const { tree } = await parse(`app/[username]/_components/${parent}`);
      const imports = visit(tree, ts.isImportDeclaration).map((entry) =>
        ts.isStringLiteral(entry.moduleSpecifier)
          ? entry.moduleSpecifier.text
          : "",
      );
      expect(imports).not.toContain("./ProfileVideoSections");
      expect(imports).not.toContain("./ProfileProductSection");
    }
  });

  test("uses only the existing controlled video and product analytics vocabulary", async () => {
    const [videos, products] = await Promise.all([
      parse("app/[username]/_components/ProfileVideoSections.tsx"),
      parse("app/[username]/_components/ProfileProductSection.tsx"),
    ]);
    const videoDescriptors = analyticsDescriptors(videos.tree);
    const productDescriptors = analyticsDescriptors(products.tree);
    expect(videoDescriptors).toEqual([
      { section: "videos", type: "video_open" },
    ]);
    expect(productDescriptors).toEqual([
      { section: "shop", type: "product_click" },
    ]);
    expect(publicSectionSchema.parse(videoDescriptors[0]?.section)).toBe(
      "videos",
    );
    expect(publicSectionSchema.parse(productDescriptors[0]?.section)).toBe(
      "shop",
    );
    expect(
      publicActionSchema.parse({
        type: videoDescriptors[0]?.type,
        videoId: 1,
        groupId: 1,
      }),
    ).toMatchObject({ type: "video_open" });
    expect(
      publicActionSchema.parse({
        type: productDescriptors[0]?.type,
        productId: 1,
      }),
    ).toMatchObject({
      type: "product_click",
    });
  });

  test("keeps dashboard preview evidence structural and free of timing sleeps", async () => {
    const unitFiles = [
      "app/dashboard/video/_components/VideoManager.test.tsx",
      "app/dashboard/shop/_components/ProductManager.test.tsx",
    ];
    const e2eFiles = [
      "e2e/dashboard/video.spec.ts",
      "e2e/dashboard/shop.spec.ts",
    ];
    const [videoUnit, shopUnit, videoE2e, shopE2e] = await Promise.all(
      [...unitFiles, ...e2eFiles].map(parse),
    );

    expect(arrayInitializer(videoUnit.tree, "scenarios").elements).toHaveLength(
      10,
    );
    expect(arrayInitializer(shopUnit.tree, "scenarios").elements).toHaveLength(
      5,
    );
    for (const unit of [videoUnit, shopUnit]) {
      const names = callNames(unit.tree);
      const properties = calledPropertyNames(unit.tree);
      expect(names).toContain("waitFor");
      expect(properties).toContain("toHaveBeenCalledTimes");
      expect(properties).toContain("toHaveBeenCalled");
    }
    for (const e2e of [videoE2e, shopE2e]) {
      const names = callNames(e2e.tree);
      const properties = calledPropertyNames(e2e.tree);
      const numericLiterals = visit(e2e.tree, ts.isNumericLiteral).map(
        (literal) => Number(literal.text),
      );
      expect(
        names.filter((name) => name === "expectOnePreviewReload").length,
      ).toBeGreaterThan(5);
      expect(names).not.toContain("waitForTimeout");
      expect(properties).toContain("fulfill");
      expect(properties).toContain("toHaveValue");
      expect(numericLiterals).toContain(500);
    }
  });
});
