export class PrefixNode {
  public isFinal: boolean = false;
  public edges: Map<string, PrefixNode> = new Map();

  public parent?: PrefixNode;
  public label?: string;
  public value?: object | string;

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
    return this.edges.get(label);
  }

  buffer(ss: string[]): string[] {
    if (this.parent !== undefined) {
      this.parent.buffer(ss);
      // @ts-expect-error: next-line
      ss.push(this.label);
    }
    return ss;
  }

  collect(): object | string {
    if (this.value === undefined) {
      const ss: string[] = [];
      this.buffer(ss);
      this.value = ss.join("");
    }
    return this.value;
  }

  toString(): string {
    const ss: string[] = [];
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
        const thatChild = that.edges.get(label);
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
  private visited: Set<number> = new Set();
  private ss: string[] = [];
  private value: object | string | null = null;
  public done: boolean = false;

  constructor(node?: PrefixNode) {
    if (node !== undefined) {
      this.pending.push(node);
      this.advance();
    }
  }

  next(): IteratorValue<object | string | null> {
    this.advance();
    const value = this.value;
    this.value = null;
    return {
      value: value,
      done: this.done
    };
  }

  advance(): void {
    if ((this.value === null) && (this.pending.length > 0)) {
      const pending: PrefixNode[] = this.pending;
      do {
        // @ts-expect-error: next-line
        const node: PrefixNode = pending.shift();
        for (const child of node.edges.values()) {
          pending.push(child);
        }
        if (node.isFinal) {
          if (node.value === undefined) {
            this.ss.length = 0;
            node.buffer(this.ss);
            node.value = this.ss.join("");
          }
          this.value = node.value;
          break;
        }
      } while (pending.length > 0);
    }
    this.done = (this.value === null);
  }

  [Symbol.iterator](): PrefixIterator {
    return this;
  }

  toString(): string {
    const buffer: string[] = [];
    const pending: PrefixNode[] = this.pending;
    buffer.push("PrefixIterator{value=");
    if (this.value !== null) {
      buffer.push('"');
      buffer.push(this.value.toString());
      buffer.push('"');
    } else {
      buffer.push("null");
    }
    buffer.push(",pending={length=");
    buffer.push(pending.length.toString());
    buffer.push(",values=[");
    for (let i = 0, k = pending.length; i < k; i++) {
      const node: PrefixNode = pending[i];
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
        const thatNode: PrefixNode = that.pending[index];
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
      const label: string = suffix[i];
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
    const prev: string = (this.prev !== undefined) ? `"${this.prev}"` : "null";
    const curr: string = (this.curr !== undefined) ? `"${this.curr}"` : "null";
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
  static noop: PrefixNode = new PrefixNode();
  public root: PrefixNode = new PrefixNode();
  public size: number = 0;

  public static from(terms: string[], values?: object[] | string[]): PrefixTrie {
    if (values === undefined) {
      values = terms;
    }
    const dict = new PrefixTrie();
    for (let i = 0, k = terms.length; i < k; i++) {
      const term: string = terms[i];
      const value: object | string = values[i];
      dict.insert(term, value);
    }
    return dict;
  }

  insert(term: string, value?: object | string): boolean {
    if (value === undefined) {
      value = term;
    }
    term = term.toLowerCase();
    let curr: PrefixNode = this.root;
    const path: PrefixNode[] = [];
    path.push(curr);
    for (let i = 0, k = term.length; i < k; i++) {
      const label: string = term[i];
      curr = curr.addEdge(label);
      path.push(curr);
    }
    if (curr.isFinal) {
      return false;
    }
    curr.isFinal = true;
    curr.value = value;
    this.size++;
    return true;
  }

  remove(term: string): boolean {
    term = term.toLowerCase();
    let curr: PrefixNode | undefined = this.root;
    for (let i = 0, k = term.length;
         (i < k) && (curr !== undefined);
         i++) {
      const label: string = term[i];
      curr = curr.transition(label);
    }
    if ((curr === undefined) || !curr.isFinal) {
      return false;
    }
    curr.isFinal = false;
    curr.value = undefined;
    while ((curr.edges.size === 0) && !curr.isFinal) {
      const label: string | undefined = curr.label;
      curr = curr.parent;
      if (curr === undefined) {
        break;
      }
      // @ts-expect-error: next-line
      curr.edges.delete(label);
    }
    this.size--;
    return true;
  }

  exactLookup(term: string): object | string | undefined {
    term = term.toLowerCase();
    let curr: PrefixNode | undefined = this.root;
    for (let i = 0, k = term.length;
         (i < k) && (curr !== undefined);
         i++) {
      const label: string = term[i];
      curr = curr.transition(label);
    }
    if (curr !== undefined) {
      return curr.value;
    }
  }

  lookup(term: string): PrefixIterator {
    term = term.toLowerCase();
    let curr: PrefixNode | undefined = this.root;
    for (let i = 0, k = term.length; i < k; i++) {
      const label: string = term[i];
      curr = curr.transition(label);
      if (curr === undefined) {
        break;
      }
    }
    if (curr === undefined) {
      return new PrefixIterator(PrefixTrie.noop);
    }
    return new PrefixIterator(curr);
  }

  contains(term: string): boolean {
    term = term.toLowerCase();
    let curr: PrefixNode | undefined = this.root;
    for (let i = 0, k = term.length;
         (i < k) && (curr !== undefined);
         i++) {
      const label: string = term[i];
      curr = curr.transition(label);
    }
    return (curr !== undefined) && curr.isFinal;
  }

  cursor(): PrefixCursor {
    return new PrefixCursor(this.root);
  }

  [Symbol.iterator](): PrefixIterator {
    return new PrefixIterator(this.root);
  }

  toString(): string {
    const buffer: string[] = [];
    buffer.push("PrefixTrie{size=");
    buffer.push(this.size.toString())
    buffer.push(",terms=[");
    const iter: PrefixIterator = this[Symbol.iterator]();
    const { "value": term, "done": done } = iter.next();
    if (!done) {
      buffer.push('"');
      // @ts-expect-error: next-line
      buffer.push(term);
      buffer.push('"');
      do {
        const { "value": term, "done": done } = iter.next();
        if (done) {
          break;
        }
        buffer.push(',"');
        // @ts-expect-error: next-line
        buffer.push(term);
        buffer.push('"');
      } while (!done);
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
