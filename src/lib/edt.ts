import { WorkPackage } from "./workspace";
export const NODE_WIDTH = 232;
export const NODE_HEIGHT = 132;
const GAP_X = 28;
const GAP_Y = 64;
export interface Placement {
  node: WorkPackage;
  x: number;
  y: number;
  depth: number;
}

/** Subtree widths keep siblings on a horizontal row, without overlapping descendants. */
export function layoutMap(packages: WorkPackage[], collapsed: Set<string>) {
  const children = new Map<string | null, WorkPackage[]>();
  for (const node of packages) {
    const list = children.get(node.parentId) ?? [];
    list.push(node);
    children.set(node.parentId, list);
  }
  for (const list of children.values())
    list.sort((a, b) => a.position - b.position);
  const widths = new Map<string, number>();
  // API preorder guarantees descendants follow their parents.
  for (let i = packages.length - 1; i >= 0; i--) {
    const node = packages[i];
    const sub = collapsed.has(node.id) ? [] : (children.get(node.id) ?? []);
    widths.set(
      node.id,
      Math.max(
        NODE_WIDTH,
        sub.reduce(
          (sum, child) => sum + (widths.get(child.id) ?? NODE_WIDTH),
          0,
        ) +
          Math.max(0, sub.length - 1) * GAP_X,
      ),
    );
  }
  const placements: Placement[] = [];
  const roots = children.get(null) ?? [];
  const width =
    Math.max(
      NODE_WIDTH,
      roots.reduce((sum, root) => sum + widths.get(root.id)!, 0) +
        Math.max(0, roots.length - 1) * GAP_X,
    ) + 80;
  let start = 40;
  const stack: { node: WorkPackage; left: number; depth: number }[] = [];
  for (const root of roots) {
    stack.push({ node: root, left: start, depth: 0 });
    start += widths.get(root.id)! + GAP_X;
  }
  while (stack.length) {
    const { node, left, depth } = stack.pop()!;
    const subtreeWidth = widths.get(node.id)!;
    placements.push({
      node,
      x: left + (subtreeWidth - NODE_WIDTH) / 2,
      y: 100 + depth * (NODE_HEIGHT + GAP_Y),
      depth,
    });
    const sub = collapsed.has(node.id) ? [] : (children.get(node.id) ?? []);
    let childLeft = left;
    for (const child of sub) {
      stack.push({ node: child, left: childLeft, depth: depth + 1 });
      childLeft += widths.get(child.id)! + GAP_X;
    }
  }
  return {
    placements,
    width,
    height: Math.max(320, ...placements.map((p) => p.y + NODE_HEIGHT + 60)),
  };
}

export type DropZone = "before" | "inside" | "after";
export function moveTo(
  packages: WorkPackage[],
  sourceId: string,
  targetId: string | null,
  zone: DropZone,
) {
  const source = packages.find((n) => n.id === sourceId);
  const target = targetId ? packages.find((n) => n.id === targetId) : null;
  if (
    !source ||
    (targetId && !target) ||
    target?.id === source.id ||
    target?.number.startsWith(`${source.number}.`)
  )
    return null;
  const parentId = target
    ? zone === "inside"
      ? target.id
      : target.parentId
    : null;
  const siblings = packages
    .filter((n) => n.parentId === parentId && n.id !== sourceId)
    .sort((a, b) => a.position - b.position);
  const targetIndex = target
    ? siblings.findIndex((n) => n.id === target.id)
    : -1;
  const position =
    !target || zone === "inside"
      ? siblings.length
      : targetIndex + (zone === "after" ? 1 : 0);
  return { parentId, position };
}
