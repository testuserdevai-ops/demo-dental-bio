// /utils/function_utils.ts

export function arraysRankingAreEqual(arr1: any[], arr2: any[]): boolean {
  if (arr1.length !== arr2.length) {
    return false; // Arrays are not the same length
  }
  console.log(arr1, arr2);
  return arr1.every((value, index) => value.rank === arr2[index].rank);
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}