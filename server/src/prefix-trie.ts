export class PrefixNode {
  public isFinal: boolean = false;
  public edges: Map<string, PrefixNode> = new Map();

  public parent?: PrefixNode;
  public label?: string;
  public term?: string;

  constructor(label?: string, parent?: PrefixNode) {
    this.parent = parent;
    this.label = label;
  }

  addEdge(label: string): PrefixNode {
    let child: PrefixNode | undefined = this.edges.get(label);
    if (child === undefined) {
      child = new PrefixNode(label, this);
      this.edges.set(label, child);
    }
    return child;
  }

  transition(label: string): PrefixNode | undefined {
    let child: PrefixNode | undefined = this.edges.get(label);
    return child;
  }

  buffer(ss: string[]): string[] {
    if (this.parent !== undefined) {
      this.parent.buffer(ss);
      // @ts-ignore: next-line
      ss.push(this.label);
    }
    return ss;
  }

  collect(): string {
    if (this.term === undefined) {
      let ss: string[] = [];
      this.buffer(ss);
      this.term = ss.join("");
    }
    return this.term;
  }

  toString(): string {
    let ss: string[] = [];
    ss.push("PrefixNode{isFinal=");
    ss.push(this.isFinal.toString());
    ss.push(",edges=");
    ss.push(this.edges.size.toString());
    ss.push(',prefix="');
    this.buffer(ss);
    ss.push('"}');
    return ss.join("");
  }

  equalsPrefix(that: any): boolean {
    return (that instanceof PrefixNode) &&
      ((this.parent === undefined) === (that.parent === undefined)) &&
      ((this.parent === undefined) ||
        this.parent.equalsPrefix(that.parent)) &&
      (this.label === that.label);
  }

  equalsSuffix(that: any): boolean {
    return (that instanceof PrefixNode) &&
      (this.isFinal === that.isFinal) &&
      (this.label === that.label) &&
      (this.edges.size === that.edges.size) &&
      Array.from(this.edges).every(([label, thisChild]) => {
        let thatChild = that.edges.get(label);
        return thisChild.equalsSuffix(thatChild);
      });
  }

  equals(that: any): boolean {
    return this.equalsPrefix(that) && this.equalsSuffix(that);
  }
}

interface IteratorValue<T> {
  value: T | null;
  done: boolean;
}

export class PrefixIterator {
  private pending: PrefixNode[] = [];
  private ss: string[] = [];
  private value: string | null = null;
  public done: boolean = false;

  constructor(node?: PrefixNode) {
    if (node !== undefined) {
      this.pending.push(node);
      this.advance();
    }
  }

  next(): IteratorValue<string | null> {
    this.advance();
    let value = this.value;
    this.value = null;
    return {
      value: value,
      done: this.done
    };
  }

  advance(): void {
    if ((this.value === null) && (this.pending.length > 0)) {
      do {
        // @ts-ignore: next-line
        let node: PrefixNode = this.pending.shift();
        for (let child of node.edges.values()) {
          this.pending.push(child);
        }
        if (node.isFinal) {
          if (node.term === undefined) {
            this.ss.length = 0;
            node.buffer(this.ss);
            node.term = this.ss.join("");
          }
          this.value = node.term;
          break;
        }
      } while (this.pending.length > 0);
    }
    this.done = (this.value === null);
  }

  [Symbol.iterator](): PrefixIterator {
    return this;
  }

  toString(): string {
    let buffer: string[] = [];
    let pending: PrefixNode[] = this.pending;
    buffer.push("PrefixIterator{value=");
    if (this.value !== null) {
      buffer.push('"');
      buffer.push(this.value);
      buffer.push('"');
    } else {
      buffer.push("null");
    }
    buffer.push(",pending={length=");
    buffer.push(pending.length.toString());
    buffer.push(",values=[");
    for (let i = 0, k = pending.length; i < k; i++) {
      let node: PrefixNode = pending[i];
      buffer.push('"');
      buffer.push(node.toString());
      buffer.push('"');
      if ((i + 1) < k) {
        buffer.push(",");
      }
    }
    buffer.push("]}}");
    return buffer.join("");
  }

  equals(that: any): boolean {
    return (that instanceof PrefixIterator) &&
      (this.value === that.value) &&
      (this.pending.length === that.pending.length) &&
      this.pending.every((thisNode: PrefixNode, index: number) => {
        let thatNode: PrefixNode = that.pending[index];
        return thisNode.equals(thatNode);
      });
  }
}

export class PrefixCursor {
  public curr?: PrefixNode;
  public prev?: PrefixNode;

  constructor(node?: PrefixNode) {
    this.curr = node;
    this.prev = node?.parent;
  }

  seek(suffix: string | string[]): boolean {
    let prev = this.prev;
    let curr = this.curr;
    for (let i = 0, k = suffix.length;
         (i < k) && (curr !== undefined);
         i++) {
      let label: string = suffix[i];
      prev = curr;
      curr = curr.transition(label);
    }
    this.prev = prev;
    this.curr = curr;
    return (this.curr !== undefined);
  }

  rewind(numSteps: number): boolean {
    let prev = this.prev;
    let curr = this.curr;
    while ((numSteps > 0) && (prev !== undefined)) {
      curr = prev;
      prev = prev.parent;
      numSteps--;
    }
    this.prev = prev;
    this.curr = curr;
    return (this.curr !== undefined);
  }

  [Symbol.iterator](): PrefixIterator {
    return new PrefixIterator(this.curr);
  }

  toString(): string {
    let prev: string = (this.prev !== undefined) ? `"${this.prev}"` : "null";
    let curr: string = (this.curr !== undefined) ? `"${this.curr}"` : "null";
    return `PrefixCursor{prev=${prev},curr=${curr}}`;
  }

  equals(that: any): boolean {
    return (that instanceof PrefixCursor) &&
      ((this.curr === undefined) === (that.curr === undefined)) &&
      ((this.curr === undefined) ||
        this.curr.equals(that.curr)) &&
      ((this.prev === undefined) === (that.prev === undefined)) &&
      ((this.prev === undefined) ||
        this.prev.equals(that.prev));
  }
}

export class PrefixTrie {
  public root: PrefixNode = new PrefixNode();
  public size: number = 0;

  insert(term: string): boolean {
    let curr: PrefixNode = this.root;
    for (let i = 0, k = term.length; i < k; i++) {
      let label: string = term[i];
      curr = curr.addEdge(label);
    }
    if (curr.isFinal) {
      return false;
    }
    curr.isFinal = true;
    curr.term = term;
    this.size++;
    return true;
  }

  remove(term: string): boolean {
    let curr: PrefixNode | undefined = this.root;
    for (let i = 0, k = term.length;
         (i < k) && (curr !== undefined);
         i++) {
      let label: string = term[i];
      curr = curr.transition(label);
    }
    if ((curr === undefined) || !curr.isFinal) {
      return false;
    }
    curr.isFinal = false;
    curr.term = undefined;
    while ((curr.edges.size === 0) && !curr.isFinal) {
      let label: string | undefined = curr.label;
      curr = curr.parent;
      if (curr === undefined) {
        break;
      }
      curr.edges.delete(label);
    }
    this.size--;
    return true;
  }

  lookup(term: string): PrefixIterator | undefined {
    let curr: PrefixNode | undefined = this.root;
    for (let i = 0, k = term.length; i < k; i++) {
      let label: string = term[i];
      curr = curr.transition(label);
      if (curr === undefined) {
        break;
      }
    }
    if (curr === undefined) {
      return undefined;
    }
    return new PrefixIterator(curr);
  }

  contains(term: string): boolean {
    let curr: PrefixNode | undefined = this.root;
    for (let i = 0, k = term.length;
         (i < k) && (curr !== undefined);
         i++) {
      let label: string = term[i];
      curr = curr.transition(label);
    }
    return (curr !== undefined) && curr.isFinal;
  }

  cursor() : PrefixCursor {
    return new PrefixCursor(this.root);
  }

  [Symbol.iterator](): PrefixIterator {
    return new PrefixIterator(this.root);
  }

  toString(): string {
    let buffer: string[] = [];
    buffer.push("PrefixTrie{size=");
    buffer.push(this.size.toString())
    buffer.push(",terms=[");
    let iter: PrefixIterator = this[Symbol.iterator]();
    let { "value": term, "done": done } = iter.next();
    if (!done) {
      buffer.push('"');
      buffer.push(term);
      buffer.push('"');
      do {
        let { "value": term, "done": done } = iter.next();
        if (done) {
          break;
        }
        buffer.push(',"');
        buffer.push(term);
        buffer.push('"');
      } while (true);
    }
    buffer.push("]}");
    return buffer.join("");
  }

  equals(that: any): boolean {
    return (that instanceof PrefixTrie) &&
      (this.size === that.size) &&
      this.root.equals(that.root);
  }
}
