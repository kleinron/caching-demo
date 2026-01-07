/**
 * Node in the doubly linked list
 */
class Node {
  key: string;
  value: any;
  prev: Node | null;
  next: Node | null;

  constructor(key: string, value: any) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

/**
 * LRU (Least Recently Used) Cache implementation
 * Uses a doubly linked list for O(1) ordering operations and a Map for O(1) lookups
 * 
 * Structure:
 * - head (dummy) <-> [least recent] <-> ... <-> [most recent] <-> tail (dummy)
 * - Map<key, Node> for fast lookups
 */
export class LRUCache {
  private cache: Map<string, Node>;
  private capacity: number;
  private head: Node;  // Dummy head node
  private tail: Node;  // Dummy tail node

  /**
   * Creates a new LRU Cache with the specified capacity
   * @param capacity Maximum number of items the cache can hold (must be > 0)
   */
  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error("Capacity must be greater than 0");
    }
    this.capacity = capacity;
    this.cache = new Map<string, Node>();
    
    // Initialize dummy head and tail nodes
    this.head = new Node("", "");
    this.tail = new Node("", "");
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Retrieves a value from the cache by key
   * Moves the accessed item to the most recently used position (before tail)
   * @param key The key to look up
   * @returns The value associated with the key, or undefined if not found
   */
  get(key: string): any | undefined {
    const node = this.cache.get(key);
    if (!node) {
      return undefined;
    }

    // Move the accessed node to most recently used position
    this.removeNode(node);
    this.addToTail(node);
    
    return node.value;
  }

  /**
   * Sets a key-value pair in the cache
   * If the key already exists, updates it and moves to most recently used
   * If at capacity, evicts the least recently used item
   * @param key The key to set
   * @param value The value to store
   */
  set(key: string, value: any): void {
    const existingNode = this.cache.get(key);
    
    if (existingNode) {
      // Update existing node
      existingNode.value = value;
      this.removeNode(existingNode);
      this.addToTail(existingNode);
    } else {
      // Create new node
      const newNode = new Node(key, value);
      
      // Check if at capacity
      if (this.cache.size >= this.capacity) {
        // Evict least recently used (node after head)
        this.removeHead();
      }
      
      // Add new node to most recently used position
      this.addToTail(newNode);
      this.cache.set(key, newNode);
    }
  }

  /**
   * Removes a node from the linked list (does not remove from Map)
   * @param node The node to remove
   */
  private removeNode(node: Node): void {
    const prevNode = node.prev!;
    const nextNode = node.next!;
    prevNode.next = nextNode;
    nextNode.prev = prevNode;
  }

  /**
   * Adds a node to the tail (most recently used position)
   * @param node The node to add
   */
  private addToTail(node: Node): void {
    const prevNode = this.tail.prev!;
    prevNode.next = node;
    node.prev = prevNode;
    node.next = this.tail;
    this.tail.prev = node;
  }

  /**
   * Removes the least recently used node (node after head)
   * Also removes it from the Map
   */
  private removeHead(): void {
    const nodeToRemove = this.head.next!;
    if (nodeToRemove === this.tail) {
      return; // No nodes to remove
    }
    this.removeNode(nodeToRemove);
    this.cache.delete(nodeToRemove.key);
  }
}

