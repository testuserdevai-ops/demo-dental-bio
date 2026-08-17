import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { getReviewAggregate } = await import("./queries");

function queryResult<T>(data: T, orders: string[]) {
  const query = {
    select: () => query,
    eq: () => query,
    order: (column: string) => {
      orders.push(column);
      return query;
    },
    then: (resolve: (value: { data: T; error: null }) => unknown): unknown =>
      resolve({ data, error: null }),
  };
  return query;
}

describe("getReviewAggregate", () => {
  it("loads every external page in the public rank and ID order", async () => {
    const reviewOrders: string[] = [];
    const externalOrders: string[] = [];
    const reviews = queryResult([], reviewOrders);
    const externalPages = queryResult(
      [
        { id: 12, link: "https://second.test/", rank: 1, enabled: false },
        { id: 11, link: "https://first.test/", rank: 2, enabled: true },
      ],
      externalOrders,
    );
    const client = {
      from: (table: string) =>
        table === "external_review_pages" ? externalPages : reviews,
    };

    const result = await getReviewAggregate(
      {
        effectiveUserId: "00000000-0000-4000-8000-000000000001",
      } as never,
      client as never,
    );

    expect(result.externalPages).toEqual([
      { id: 12, link: "https://second.test/", rank: 1, enabled: false },
      { id: 11, link: "https://first.test/", rank: 2, enabled: true },
    ]);
    expect(externalOrders).toEqual(["rank", "id"]);
    expect(reviewOrders).toEqual(["rank"]);
  });
});
