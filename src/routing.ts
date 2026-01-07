const nodes: string[] = [];

// Placeholder hash function
function hashFn(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

function routeToNode(key: string): string {
  let selectedNode = nodes[0];
  let maxScore = hashFn(`${key}:${selectedNode}`);

  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    const score = hashFn(`${key}:${node}`);

    if (score > maxScore) {
      maxScore = score;
      selectedNode = node;
    }
  }

  return selectedNode;
}

export { routeToNode };
