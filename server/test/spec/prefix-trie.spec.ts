import {
  PrefixCursor,
  PrefixIterator,
  PrefixNode,
  PrefixTrie,
} from "../../src/prefix-trie";

import { assert } from "chai";

import "mocha";

import fc from "fast-check";

interface PrefixPath {
  root: PrefixNode;
  leaf: PrefixNode;
}

describe("PrefixNode", () => {
  let chart = (term: string): PrefixPath => {
    let root: PrefixNode = new PrefixNode();
    let leaf: PrefixNode = root;
    for (let i = 0, k = term.length; i < k; i++) {
      let label = term[i];
      leaf = leaf.addEdge(label);
    }
    leaf.isFinal = true;
    return { root, leaf };
  };

  it("reconstructs the original term", () => {
    fc.assert(
      fc.property(
        fc.string(),
        (term: string): void => {
          let { leaf } = chart(term);
          let prefix: string = leaf.collect();
          assert.equal(prefix, term);
        }
      )
    );
  });

  it("transitions along the path of the term", () => {
    fc.assert(
      fc.property(
        fc.string(),
        (term: string): void => {
          let { root } = chart(term);
          let path: PrefixNode = root;
          for (let i = 0, k = term.length; i < k; i++) {
            let label: string = term[i];
            path = path.transition(label);
            assert.isDefined(path);
          }
          assert.isTrue(path.isFinal);
        }
      )
    );
  });

  it("is comparable with other PrefixNodes", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        (v: string, w: string): void => {
          let { "root": lhs } = chart(v);
          let { "root": rhs } = chart(v);
          assert.isTrue(
            lhs.equals(rhs),
            `Expected ${lhs} to equal ${rhs} for term="${v}"`
          );
          if (v !== w) {
            let { "root": rhs } = chart(w);
            assert.isFalse(
              lhs.equals(rhs),
              `Expected ${lhs} to not equal ${rhs} for terms v="${v}" and w="${w}"`
            );
          }
        }
      )
    );
  });
});

function insert(root: PrefixNode, term: string): PrefixNode {
  let curr: PrefixNode = root;
  for (let i = 0, k = term.length; i < k; i++) {
    let label = term[i];
    curr = curr.addEdge(label);
  }
  curr.isFinal = true;
  return curr;
};

describe("PrefixIterator", () => {
  it("iterates over all the terms reachable from the root", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string()),
        (terms: string[]): void => {
          let root: PrefixNode = new PrefixNode();
          for (let term of terms) {
            let leaf: PrefixNode = insert(root, term);
            assert.equal(leaf.collect(), term);  // sanity check
          }

          // Validate against explicit iterator operations
          let pending: Set<string> = new Set(terms);
          let iter = new PrefixIterator(root);
          assert.equal(iter.done, (terms.length === 0));
          while (!iter.done) {
            let { "value": term, done } = iter.next();
            if (done) {
              assert.isNull(term);
              assert.isTrue(iter.done);
            } else {
              assert.include(pending, term);
              pending.delete(term);
            }
          }
          assert.isEmpty(pending);

          // Validate against implicit iterator operations
          pending = new Set(terms);
          for (let term of new PrefixIterator(root)) {
            assert.include(pending, term);
            pending.delete(term);
          }
          assert.isEmpty(pending);
        }
      )
    );
  });

  it("is comparable against other PrefixIterators", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string()),
        fc.uniqueArray(fc.string()),
        (vs: string[], ws: string[]): void => {
          let vt = new PrefixNode();
          let wt = new PrefixNode();
          for (let v of vs) {
            insert(vt, v);
          }
          for (let w of ws) {
            insert(wt, w);
          }
          assert.isTrue(
            new PrefixIterator(vt).equals(new PrefixIterator(vt)),
            `Expected iterators over ${vs} to be equivalent.`
          );
          if ((vs.length === ws.length) && vs.every((v, i) => (v === ws[i]))) {
            assert.isTrue(
              new PrefixIterator(vt).equals(new PrefixIterator(wt)),
              `Expected iterators over ${vs} and ${ws} to be equivalent.`
            );
          } else {
            assert.isFalse(
              new PrefixIterator(vt).equals(new PrefixIterator(wt)),
              `Expected iterators over ${vs} and ${ws} to be inequivalent.`
            );
          }
        }
      )
    );
  });
});

describe("PrefixCursor", () => {
  let alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let alphanumeric = (gen): string => {
    let index: number = gen(fc.nat, { max: alphabet.length - 1 });
    let alnum: string = alphabet[index];
    return alnum;
  };

  let ins = (buffer: string[], index: number, value: string): void => {
    buffer.splice(index, 0, value);
  };

  let del = (buffer: string[], index: number): void => {
    buffer.splice(index, 1);
  };

  let sub = (buffer: string[], index: number, value: string): void => {
    buffer[index] = value;
  };

  let mutate = (gen, buffer: string[]): number => {
    let index: number;
    if (buffer.length === 0) {
      index = 0;
      let value: string = alphanumeric(gen);
      buffer.push(value);
    } else {
      index = gen(fc.nat, { max: buffer.length - 1 });
      let op = gen(fc.nat, { max: 2 });
      switch (op) {
        case 0: {
          let value: string = alphanumeric(gen);
          ins(buffer, index, value);
          break;
        }
        case 1: {
          del(buffer, index);
          break;
        }
        case 2: {
          let value: string = alphanumeric(gen);
          sub(buffer, index, value);
          break;
        }
      }
    }
    return index;
  };

  let uniform = (gen): number => {
    return gen(fc.double, { min: 0.0, max: 1.0 });
  }

  let selectWeighted = (gen, probability: number): boolean => {
    return uniform(gen) <= probability;
  };

  let normalized = (length: number): number => {
    return 1.0 / length;
  };

  let sampleLabel = (gen, node: PrefixNode): string | undefined => {
    let prev: string | undefined;
    let prob: number = normalized(node.edges.size);
    for (let label of node.edges.keys()) {
      if (selectWeighted(gen, prob)) {
        return label;
      }
      prev = label;
    }
    return prev;
  };

  let checkCandidates = (terms: string[],
                         cursor: PrefixCursor,
                         buffer: string[]): void => {
    let prefix = buffer.join("");
    let expected = terms.filter(term => term.startsWith(prefix));
    let actual: string[] = Array.from(cursor);
    expected.sort();
    actual.sort();
    assert.deepEqual(actual, expected);
  };

  it("navigates forward as the user types", () => {
    fc.assert(
      fc.property(
        fc.gen(),
        fc.uniqueArray(fc.string()),
        (gen, terms: string[]) => {
          let root = new PrefixNode();
          for (let term of terms) {
            insert(root, term);
          }

          let cursor = new PrefixCursor(root);
          let buffer: string[] = [];
          checkCandidates(terms, cursor, buffer);

          while (cursor.curr !== undefined) {
            let label: string;
            if (selectWeighted(gen, 0.85)) {
              label = sampleLabel(gen, cursor.curr);
              if (label === undefined) {
                // If we've reached the end of the branch, generate an arbitrary
                // character to append.
                label = alphanumeric(gen);
              }
            } else {
              // With a small probability, generate a likely error.
              label = alphanumeric(gen);
            }
            buffer.push(label);
            cursor.seek(label);
            checkCandidates(terms, cursor, buffer);
          }
        }
      )
    );
  });

  it("can backtrack when the term is edited inline", () => {
    fc.assert(
      fc.property(
        fc.gen(),
        fc.uniqueArray(fc.string()),
        (gen, terms: string[]) => {
          let root = new PrefixNode();
          for (let term of terms) {
            insert(root, term);
          }

          let cursor = new PrefixCursor(root);
          let buffer: string[] = [];
          checkCandidates(terms, cursor, buffer);

          while (cursor.curr !== undefined) {
            let label: string | undefined = sampleLabel(gen, cursor.curr);
            if (label !== undefined) {
              buffer.push(label);
              cursor.seek(label);
            }
            let length: number = buffer.length;
            let index: number = mutate(gen, buffer);
            let numSteps: number = length - index;
            cursor.rewind(numSteps);
            let suffix: string[] = buffer.slice(index);
            cursor.seek(suffix);
            checkCandidates(terms, cursor, buffer);
          }
        }
      )
    );
  })
});

describe("PrefixTrie", () => {
  it("behaves like a collection of terms", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string()),
        (terms: string[]) => {
          let dict = new PrefixTrie();
          let visited = new Set<string>();
          for (let term of terms) {
            let inserted: boolean = dict.insert(term);
            assert.equal(inserted, !visited.has(term));
            visited.add(term);

            let found: boolean = false;
            for (let candidate of dict.lookup(term)) {
              assert.isTrue(candidate.startsWith(term));
              found ||= (candidate === term);
            }
            assert.isTrue(found);
          }

          assert.equal(dict.size, visited.size);

          for (let term of dict) {
            assert.include(visited, term);
            visited.delete(term);
          }
          assert.isEmpty(visited);
        }
      )
    );
  });

  it("can delete terms", () => {
    let shuffle = (terms: string[]): void => {
      for (let i = terms.length; i !== 0;) {
        let j = Math.floor(Math.random() * (i--));
        [terms[i], terms[j]] = [terms[j], terms[i]];
      }
    };

    fc.assert(
      fc.property(
        fc.array(fc.string()),
        (terms: string[]) => {
          let dict = new PrefixTrie();
          let visited = new Set<string>(terms);
          for (let term of terms) {
            dict.insert(term);
          }

          // delete them in a different order
          shuffle(terms);

          for (let term of terms) {
            if (visited.has(term)) {
              assert.isTrue(dict.contains(term));
              assert.isTrue(dict.remove(term));
              visited.delete(term);
            } else {
              assert.isFalse(dict.contains(term));
              assert.isFalse(dict.remove(term));
            }
          }
          assert.equal(dict.size, visited.size);
          assert.equal(dict.size, 0);
        }
      )
    );
  });
});
