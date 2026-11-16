export interface Point {
  r: number;
  c: number;
}

export type Grid = (string | null)[][];

/**
 * Checks if a straight horizontal or vertical line between p1 and p2 is completely clear of obstacles.
 */
function isLineClear(grid: Grid, p1: Point, p2: Point): boolean {
  if (p1.r === p2.r) {
    const minC = Math.min(p1.c, p2.c);
    const maxC = Math.max(p1.c, p2.c);
    for (let c = minC + 1; c < maxC; c++) {
      if (grid[p1.r][c] !== null) return false;
    }
    return true;
  }
  if (p1.c === p2.c) {
    const minR = Math.min(p1.r, p2.r);
    const maxR = Math.max(p1.r, p2.r);
    for (let r = minR + 1; r < maxR; r++) {
      if (grid[r][p1.c] !== null) return false;
    }
    return true;
  }
  return false;
}

/**
 * Returns the path points if p1 and p2 can be connected with at most 2 turns (3 segments).
 * Returns null if no valid path exists.
 */
export function findLinkPath(grid: Grid, p1: Point, p2: Point): Point[] | null {
  // Can't connect to self
  if (p1.r === p2.r && p1.c === p2.c) return null;

  // Both endpoints must contain identical matching values
  const val1 = grid[p1.r][p1.c];
  const val2 = grid[p2.r][p2.c];
  if (!val1 || !val2 || val1 !== val2) return null;

  // 1. Direct line (0 turns / 1 segment)
  if ((p1.r === p2.r || p1.c === p2.c) && isLineClear(grid, p1, p2)) {
    return [p1, p2];
  }

  // 2. One turn (1 bend / 2 segments)
  // Corner candidate 1: (p1.r, p2.c)
  const c1: Point = { r: p1.r, c: p2.c };
  if (grid[c1.r][c1.c] === null && isLineClear(grid, p1, c1) && isLineClear(grid, c1, p2)) {
    return [p1, c1, p2];
  }

  // Corner candidate 2: (p2.r, p1.c)
  const c2: Point = { r: p2.r, c: p1.c };
  if (grid[c2.r][c2.c] === null && isLineClear(grid, p1, c2) && isLineClear(grid, c2, p2)) {
    return [p1, c2, p2];
  }

  // 3. Two turns (2 bends / 3 segments)
  const rows = grid.length;
  const cols = grid[0].length;

  // Cast ray vertically from p1
  for (let r = 0; r < rows; r++) {
    if (r === p1.r) continue;
    const mid1: Point = { r, c: p1.c };
    // mid1 must be empty and reachable from p1
    if (grid[mid1.r][mid1.c] === null && isLineClear(grid, p1, mid1)) {
      // From mid1 to p2, test 1-turn candidate: (mid1.r, p2.c)
      const mid2: Point = { r: mid1.r, c: p2.c };
      if (
        grid[mid2.r][mid2.c] === null &&
        isLineClear(grid, mid1, mid2) &&
        isLineClear(grid, mid2, p2)
      ) {
        return [p1, mid1, mid2, p2];
      }
    }
  }

  // Cast ray horizontally from p1
  for (let c = 0; c < cols; c++) {
    if (c === p1.c) continue;
    const mid1: Point = { r: p1.r, c };
    // mid1 must be empty and reachable from p1
    if (grid[mid1.r][mid1.c] === null && isLineClear(grid, p1, mid1)) {
      // From mid1 to p2, test 1-turn candidate: (p2.r, mid1.c)
      const mid2: Point = { r: p2.r, c: mid1.c };
      if (
        grid[mid2.r][mid2.c] === null &&
        isLineClear(grid, mid1, mid2) &&
        isLineClear(grid, mid2, p2)
      ) {
        return [p1, mid1, mid2, p2];
      }
    }
  }

  return null;
}

/**
 * Searches the grid for any available pair that can be connected.
 * Useful for hint generation and deadlock auto-shuffle detection.
 */
export function findAvailablePair(grid: Grid): { p1: Point; p2: Point; path: Point[] } | null {
  const pointsWithItems: { pt: Point; val: string }[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const val = grid[r][c];
      if (val !== null) {
        pointsWithItems.push({ pt: { r, c }, val });
      }
    }
  }

  for (let i = 0; i < pointsWithItems.length; i++) {
    for (let j = i + 1; j < pointsWithItems.length; j++) {
      if (pointsWithItems[i].val === pointsWithItems[j].val) {
        const path = findLinkPath(grid, pointsWithItems[i].pt, pointsWithItems[j].pt);
        if (path) {
          return { p1: pointsWithItems[i].pt, p2: pointsWithItems[j].pt, path };
        }
      }
    }
  }
  return null;
}
