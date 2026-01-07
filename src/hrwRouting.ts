import murmur from "murmurhash3js-revisited";

/**
 * Computes a hash score for a given key and node combination
 * Uses MurmurHash3 for consistent hashing
 */
function computeScore(key: string, node: string): number {
  // Compute MurmurHash3 32-bit hash
  const input = `${key}:${node}`;
  const hash = murmur.x86.hash32(input);
  
  return hash;
}

/**
 * Highest Random Weight (HRW) / Rendezvous Hashing
 * Routes a key to the node with the highest hash score
 * 
 * @param key The key to route (e.g., image filename)
 * @param nodes Array of available node URLs
 * @param weight Weight for all nodes (default: 1, assumes uniform weights)
 * @returns The selected node URL
 */
export function routeToNode(key: string, nodes: string[], weight: number = 1): string {
  if (nodes.length === 0) {
    throw new Error("No nodes available for routing");
  }
  
  if (nodes.length === 1) {
    return nodes[0];
  }
  
  let selectedNode = nodes[0];
  let maxScore = computeScore(key, nodes[0]) * weight;
  
  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    const score = computeScore(key, node) * weight;
    
    if (score > maxScore) {
      maxScore = score;
      selectedNode = node;
    }
  }
  
  return selectedNode;
}

/**
 * Test the distribution of HRW routing
 * Useful for debugging and verifying routing behavior
 */
export function testRouting(keys: string[], nodes: string[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  // Initialize counters
  nodes.forEach(node => {
    distribution[node] = 0;
  });
  
  // Route each key and count
  keys.forEach(key => {
    const selectedNode = routeToNode(key, nodes);
    distribution[selectedNode]++;
  });
  
  return distribution;
}

