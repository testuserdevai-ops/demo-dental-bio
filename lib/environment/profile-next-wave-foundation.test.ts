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

type TestCase = {
  title: string;
  body: ts.ConciseBody;
};

type ExpectationEvidence = {
  subject: ts.Expression;
  matcher: string;
  negated: boolean;
  arguments: readonly ts.Expression[];
  position: number;
};

function testCases(tree: ts.SourceFile) {
  return visit(tree, ts.isCallExpression).flatMap((call): TestCase[] => {
    if (
      !ts.isIdentifier(call.expression) ||
      !["it", "test"].includes(call.expression.text) ||
      call.arguments.length < 2
    ) {
      return [];
    }
    const [title, callback] = call.arguments;
    if (
      !title ||
      !callback ||
      (!ts.isStringLiteral(title) && !ts.isTemplateExpression(title)) ||
      (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))
    ) {
      return [];
    }
    const titleText = ts.isStringLiteral(title)
      ? title.text
      : `${title.head.text}${title.templateSpans
          .map(
            (span) =>
              `\${${span.expression.getText(tree)}}${span.literal.text}`,
          )
          .join("")}`;
    return [{ title: titleText, body: callback.body }];
  });
}

function expectationEvidence(scope: ts.Node) {
  return visit(scope, ts.isCallExpression).flatMap(
    (call): ExpectationEvidence[] => {
      if (!ts.isPropertyAccessExpression(call.expression)) return [];
      const matcher = call.expression.name.text;
      let receiver = call.expression.expression;
      let negated = false;
      if (
        ts.isPropertyAccessExpression(receiver) &&
        receiver.name.text === "not"
      ) {
        negated = true;
        receiver = receiver.expression;
      }
      if (
        !ts.isCallExpression(receiver) ||
        !ts.isIdentifier(receiver.expression) ||
        receiver.expression.text !== "expect" ||
        !receiver.arguments[0]
      ) {
        return [];
      }
      return [
        {
          subject: receiver.arguments[0],
          matcher,
          negated,
          arguments: call.arguments,
          position: call.pos,
        },
      ];
    },
  );
}

function identifierName(expression: ts.Expression) {
  return ts.isIdentifier(expression) ? expression.text : null;
}

function hasExpectation(
  evidence: readonly ExpectationEvidence[],
  expected: {
    subject: string;
    matcher: string;
    negated?: boolean;
    numericArgument?: number;
  },
) {
  return evidence.some(
    (entry) =>
      identifierName(entry.subject) === expected.subject &&
      entry.matcher === expected.matcher &&
      entry.negated === Boolean(expected.negated) &&
      (expected.numericArgument === undefined ||
        (entry.arguments[0] &&
          ts.isNumericLiteral(entry.arguments[0]) &&
          Number(entry.arguments[0].text) === expected.numericArgument)),
  );
}

function scenarioContract(tree: ts.SourceFile) {
  return arrayInitializer(tree, "scenarios").elements.map((element) => {
    if (!ts.isObjectLiteralExpression(element)) {
      throw new Error("Every dashboard scenario must be an object literal.");
    }
    return {
      name: propertyString(element, "name"),
      mutation: propertyString(element, "mutation"),
    };
  });
}

function assertManagerEvidence(
  tree: ts.SourceFile,
  expectedScenarios: readonly { name: string; mutation: string }[],
  retained: { mutation: string; value: string },
) {
  expect(scenarioContract(tree)).toEqual([...expectedScenarios]);
  const cases = testCases(tree);
  const success = cases.find(
    ({ title }) =>
      title ===
      "${scenario.name} reloads exactly once after authoritative success",
  );
  const rejection = cases.find(
    ({ title }) =>
      title ===
      "${scenario.name} keeps authoritative state and never reloads after rejection",
  );
  expect(success).toBeTruthy();
  expect(rejection).toBeTruthy();

  const successEvidence = expectationEvidence(success!.body);
  expect(
    hasExpectation(successEvidence, {
      subject: "mutation",
      matcher: "toHaveBeenCalledTimes",
      numericArgument: 1,
    }),
  ).toBe(true);
  expect(
    hasExpectation(successEvidence, {
      subject: "triggerReload",
      matcher: "toHaveBeenCalledTimes",
      numericArgument: 1,
    }),
  ).toBe(true);

  const rejectionEvidence = expectationEvidence(rejection!.body);
  expect(
    hasExpectation(rejectionEvidence, {
      subject: "mutation",
      matcher: "toHaveBeenCalledTimes",
      numericArgument: 1,
    }),
  ).toBe(true);
  expect(
    hasExpectation(rejectionEvidence, {
      subject: "triggerReload",
      matcher: "toHaveBeenCalled",
      negated: true,
    }),
  ).toBe(true);

  const retainedDraft = cases.find(({ title }) =>
    title.includes("retains a rejected edit draft"),
  );
  expect(retainedDraft).toBeTruthy();
  const retainedEvidence = expectationEvidence(retainedDraft!.body);
  expect(
    hasExpectation(retainedEvidence, {
      subject: retained.mutation,
      matcher: "toHaveBeenCalledTimes",
      numericArgument: 1,
    }),
  ).toBe(true);
  expect(
    retainedEvidence.some(
      ({ matcher, arguments: args }) =>
        matcher === "toBe" &&
        args[0] &&
        ts.isStringLiteral(args[0]) &&
        args[0].text === retained.value,
    ),
  ).toBe(true);
  expect(
    hasExpectation(retainedEvidence, {
      subject: "triggerReload",
      matcher: "toHaveBeenCalled",
      negated: true,
    }),
  ).toBe(true);

  const cancellation = cases.find(({ title }) =>
    title.includes("validation and delete cancellation"),
  );
  expect(cancellation).toBeTruthy();
  const cancellationStrings = visit(cancellation!.body, ts.isStringLiteral).map(
    ({ text }) => text,
  );
  expect(cancellationStrings).toContain("aria-invalid");
  expect(cancellationStrings).toContain("Cancel");
  expect(
    hasExpectation(expectationEvidence(cancellation!.body), {
      subject: "triggerReload",
      matcher: "toHaveBeenCalled",
      negated: true,
    }),
  ).toBe(true);
}

function firstPageReload(tree: ts.SourceFile) {
  const call = visit(tree, ts.isCallExpression).find(
    (entry) =>
      ts.isPropertyAccessExpression(entry.expression) &&
      entry.expression.name.text === "reload" &&
      ts.isIdentifier(entry.expression.expression) &&
      entry.expression.expression.text === "page",
  );
  if (!call) throw new Error("Expected an authoritative full-page reload.");
  return call;
}

function expectedOrderReferences(
  tree: ts.SourceFile,
  subject: string,
  after: number,
) {
  const expectation = expectationEvidence(tree).find(
    (entry) =>
      entry.position > after &&
      identifierName(entry.subject) === subject &&
      entry.matcher === "toEqual",
  );
  const argument = expectation?.arguments[0];
  if (!argument || !ts.isArrayLiteralExpression(argument)) return [];
  return argument.elements.flatMap((element) => {
    if (ts.isIdentifier(element)) return [element.text];
    if (ts.isTemplateExpression(element)) {
      return element.templateSpans
        .map(({ expression }) => identifierName(expression))
        .filter((name): name is string => Boolean(name));
    }
    return [];
  });
}

function postReloadTemplateReferences(tree: ts.SourceFile, after: number) {
  return visit(tree, ts.isTemplateExpression)
    .filter((template) => template.pos > after)
    .map((template) => ({
      head: template.head.text,
      references: template.templateSpans
        .map(({ expression }) => identifierName(expression))
        .filter((name): name is string => Boolean(name)),
    }));
}

function assertE2eFailureAndCancelEvidence(tree: ts.SourceFile) {
  const fulfill = visit(tree, ts.isCallExpression).find(
    (call) =>
      ts.isPropertyAccessExpression(call.expression) &&
      call.expression.name.text === "fulfill" &&
      call.arguments[0] &&
      ts.isObjectLiteralExpression(call.arguments[0]) &&
      call.arguments[0].properties.some(
        (property) =>
          ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.name) &&
          property.name.text === "status" &&
          ts.isNumericLiteral(property.initializer) &&
          property.initializer.text === "500",
      ),
  );
  expect(fulfill).toBeTruthy();

  const allStrings = visit(tree, ts.isStringLiteral).map(({ text }) => text);
  expect(allStrings).toContain("Cancel");
  expect(allStrings).toContain("aria-invalid");
  const failureEvidence = expectationEvidence(tree).filter(
    ({ position }) => position > fulfill!.pos,
  );
  expect(
    failureEvidence.some(
      ({ subject, matcher, arguments: args }) =>
        ts.isAwaitExpression(subject) &&
        ts.isCallExpression(subject.expression) &&
        ts.isIdentifier(subject.expression.expression) &&
        subject.expression.expression.text === "previewLoadCount" &&
        matcher === "toBe" &&
        args[0] !== undefined &&
        ts.isNumericLiteral(args[0]) &&
        args[0].text === "0",
    ),
  ).toBe(true);
  expect(
    failureEvidence.some(
      ({ matcher, arguments: args }) =>
        matcher === "toHaveValue" &&
        args[0] !== undefined &&
        ts.isIdentifier(args[0]),
    ),
  ).toBe(true);
  const cancelReloadExpectation = expectationEvidence(tree).find(
    ({ subject, matcher, arguments: args }) =>
      ts.isAwaitExpression(subject) &&
      ts.isCallExpression(subject.expression) &&
      ts.isIdentifier(subject.expression.expression) &&
      subject.expression.expression.text === "previewLoadCount" &&
      matcher === "toBe" &&
      args[0] &&
      ts.isIdentifier(args[0]) &&
      args[0].text === "beforeCancel",
  );
  expect(cancelReloadExpectation).toBeTruthy();
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

    expect(files.slice(-5)).toEqual([
      "zz-treatment-service-parity.sql",
      "zz-link-parity.sql",
      ...placeholders,
    ]);
    expect(
      showcaseFiles.filter((file) => file.startsWith("zz-next-wave-")).sort(),
    ).toEqual([...placeholders].sort());
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

  test("keeps semantic dashboard mutation, failure, draft, and persistence evidence", async () => {
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

    assertManagerEvidence(
      videoUnit.tree,
      [
        { name: "group create", mutation: "createGroup" },
        { name: "group edit", mutation: "updateGroup" },
        { name: "group toggle", mutation: "updateGroup" },
        { name: "group delete", mutation: "deleteGroup" },
        { name: "group reorder", mutation: "reorderGroups" },
        { name: "video create", mutation: "createVideo" },
        { name: "video edit", mutation: "updateVideo" },
        { name: "video toggle", mutation: "updateVideo" },
        { name: "video delete", mutation: "deleteVideo" },
        { name: "video reorder", mutation: "reorderVideos" },
      ],
      { mutation: "updateVideo", value: "Draft title" },
    );
    assertManagerEvidence(
      shopUnit.tree,
      [
        { name: "product create", mutation: "createProduct" },
        { name: "product edit", mutation: "updateProduct" },
        { name: "product toggle", mutation: "updateProduct" },
        { name: "product delete", mutation: "deleteProduct" },
        { name: "product reorder", mutation: "reorderProducts" },
      ],
      { mutation: "updateProduct", value: "Draft kit" },
    );

    assertE2eFailureAndCancelEvidence(videoE2e.tree);
    assertE2eFailureAndCancelEvidence(shopE2e.tree);

    const videoReload = firstPageReload(videoE2e.tree);
    expect(
      expectedOrderReferences(
        videoE2e.tree,
        "persistedGroupOrder",
        videoReload.pos,
      ),
    ).toEqual(["secondGroup", "editedGroup"]);
    expect(
      expectedOrderReferences(
        videoE2e.tree,
        "persistedVideoOrder",
        videoReload.pos,
      ),
    ).toEqual(["secondVideo", "editedVideo"]);
    const videoTemplates = postReloadTemplateReferences(
      videoE2e.tree,
      videoReload.pos,
    );
    expect(videoTemplates).toContainEqual({
      head: "Show group ",
      references: ["editedGroup"],
    });
    expect(videoTemplates).toContainEqual({
      head: "Show ",
      references: ["editedVideo"],
    });

    const shopReload = firstPageReload(shopE2e.tree);
    expect(
      expectedOrderReferences(
        shopE2e.tree,
        "persistedProductOrder",
        shopReload.pos,
      ),
    ).toEqual(["secondProduct", "editedProduct"]);
    expect(
      postReloadTemplateReferences(shopE2e.tree, shopReload.pos),
    ).toContainEqual({
      head: "Show ",
      references: ["editedProduct"],
    });

    for (const e2e of [videoE2e, shopE2e]) {
      const properties = calledPropertyNames(e2e.tree);
      expect(properties).not.toContain("waitForTimeout");
    }
  });
});
