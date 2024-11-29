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
  const chart = (term: string): PrefixPath => {
    const root: PrefixNode = new PrefixNode();
    let leaf: PrefixNode = root;
    for (let i = 0, k = term.length; i < k; i++) {
      const label = term[i];
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
          const { leaf } = chart(term);
          const prefix: string = leaf.collect();
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
          const { root } = chart(term);
          let path: PrefixNode = root;
          for (let i = 0, k = term.length; i < k; i++) {
            const label: string = term[i];
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
          const { "root": lhs } = chart(v);
          const { "root": rhs } = chart(v);
          assert.isTrue(
            lhs.equals(rhs),
            `Expected ${lhs} to equal ${rhs} for term="${v}"`
          );
          if (v !== w) {
            const { "root": rhs } = chart(w);
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
    const label = term[i];
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
          const root: PrefixNode = new PrefixNode();
          for (const term of terms) {
            const leaf: PrefixNode = insert(root, term);
            assert.equal(leaf.collect(), term);  // sanity check
          }

          // Validate against explicit iterator operations
          let pending: Set<string> = new Set(terms);
          const iter = new PrefixIterator(root);
          assert.equal(iter.done, (terms.length === 0));
          while (!iter.done) {
            const { "value": term, done } = iter.next();
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
          for (const term of new PrefixIterator(root)) {
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
          const vt = new PrefixNode();
          const wt = new PrefixNode();
          for (const v of vs) {
            insert(vt, v);
          }
          for (const w of ws) {
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
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const alphanumeric = (gen): string => {
    const index: number = gen(fc.nat, { max: alphabet.length - 1 });
    const alnum: string = alphabet[index];
    return alnum;
  };

  const ins = (buffer: string[], index: number, value: string): void => {
    buffer.splice(index, 0, value);
  };

  const del = (buffer: string[], index: number): void => {
    buffer.splice(index, 1);
  };

  const sub = (buffer: string[], index: number, value: string): void => {
    buffer[index] = value;
  };

  const mutate = (gen, buffer: string[]): number => {
    let index: number;
    if (buffer.length === 0) {
      index = 0;
      const value: string = alphanumeric(gen);
      buffer.push(value);
    } else {
      index = gen(fc.nat, { max: buffer.length - 1 });
      const op = gen(fc.nat, { max: 2 });
      switch (op) {
        case 0: {
          const value: string = alphanumeric(gen);
          ins(buffer, index, value);
          break;
        }
        case 1: {
          del(buffer, index);
          break;
        }
        case 2: {
          const value: string = alphanumeric(gen);
          sub(buffer, index, value);
          break;
        }
      }
    }
    return index;
  };

  const uniform = (gen): number => {
    return gen(fc.double, { min: 0.0, max: 1.0 });
  }

  const selectWeighted = (gen, probability: number): boolean => {
    return uniform(gen) <= probability;
  };

  const normalized = (length: number): number => {
    return 1.0 / length;
  };

  const sampleLabel = (gen, node: PrefixNode): string | undefined => {
    let prev: string | undefined;
    const prob: number = normalized(node.edges.size);
    for (const label of node.edges.keys()) {
      if (selectWeighted(gen, prob)) {
        return label;
      }
      prev = label;
    }
    return prev;
  };

  const checkCandidates = (terms: string[],
                         cursor: PrefixCursor,
                         buffer: string[]): void => {
    const prefix = buffer.join("");
    const expected = terms.filter(term => term.startsWith(prefix));
    const actual: string[] = Array.from(cursor);
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
          const root = new PrefixNode();
          for (const term of terms) {
            insert(root, term);
          }

          const cursor = new PrefixCursor(root);
          const buffer: string[] = [];
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
          const root = new PrefixNode();
          for (const term of terms) {
            insert(root, term);
          }

          const cursor = new PrefixCursor(root);
          const buffer: string[] = [];
          checkCandidates(terms, cursor, buffer);

          while (cursor.curr !== undefined) {
            const label: string | undefined = sampleLabel(gen, cursor.curr);
            if (label !== undefined) {
              buffer.push(label);
              cursor.seek(label);
            }
            const length: number = buffer.length;
            const index: number = mutate(gen, buffer);
            const numSteps: number = length - index;
            cursor.rewind(numSteps);
            const suffix: string[] = buffer.slice(index);
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
          const dict = new PrefixTrie();
          const visited = new Set<string>();
          for (const term of terms) {
            const lowercaseTerm = term.toLowerCase();
            const inserted: boolean = dict.insert(term);
            assert.equal(inserted, !visited.has(lowercaseTerm));
            visited.add(lowercaseTerm);

            let found: boolean = false;
            for (const candidate of dict.lookup(term)) {
              const lowercaseCandidate = candidate.toLowerCase();
              const lowercaseTerm = term.toLowerCase();
              assert.isTrue(lowercaseCandidate.startsWith(lowercaseTerm),
                            `Expected "${lowercaseCandidate}" to start with "${lowercaseTerm}"`);
              found ||= (lowercaseCandidate === lowercaseTerm);
            }
            assert.isTrue(found);
          }

          assert.equal(dict.size, visited.size);

          for (const term of dict) {
            const lowercaseTerm = term.toLowerCase();
            assert.include(visited, lowercaseTerm);
            visited.delete(lowercaseTerm);
          }
          assert.isEmpty(visited);
        }
      )
    );
  });

  it("can delete terms", () => {
    const shuffle = (terms: string[]): void => {
      for (let i = terms.length; i !== 0;) {
        const j = Math.floor(Math.random() * (i--));
        [terms[i], terms[j]] = [terms[j], terms[i]];
      }
    };

    fc.assert(
      fc.property(
        fc.array(fc.string()),
        (terms: string[]) => {
          const dict = new PrefixTrie();
          const visited = new Set<string>(terms.map(term => term.toLowerCase()));
          for (const term of terms) {
            dict.insert(term);
          }

          // delete them in a different order
          shuffle(terms);

          for (const term of terms) {
            const lowercaseTerm = term.toLowerCase();
            if (visited.has(lowercaseTerm)) {
              assert.isTrue(dict.contains(lowercaseTerm));
              assert.isTrue(dict.remove(lowercaseTerm));
              visited.delete(lowercaseTerm);
            } else {
              assert.isFalse(dict.contains(lowercaseTerm));
              assert.isFalse(dict.remove(lowercaseTerm));
            }
          }
          assert.equal(dict.size, visited.size);
          assert.equal(dict.size, 0);
        }
      )
    );
  });

  it("can match terms exactly", () => {
    fc.assert(
      fc.property(
        fc.gen(),
        fc.uniqueArray(fc.string()),
        fc.string(),
        (gen, terms: string[], randomQuery: string) => {
          const dict: PrefixTrie = PrefixTrie.from(terms);

          if (terms.length > 0) {
            const exactIndex: number = gen(fc.nat, { max: terms.length - 1 });
            const exactQuery: string = terms[exactIndex];
            const exactMatch: string = dict.exactLookup(exactQuery) as string;
            assert.isDefined(exactMatch);
            assert.equal(exactQuery.toLowerCase(), exactMatch.toLowerCase());
          }

          if (dict.contains(randomQuery)) {
            const exactMatch: string | undefined = dict.exactLookup(randomQuery) as string;
            assert.isDefined(exactMatch);
            assert.equal(randomQuery.toLowerCase(), exactMatch.toLowerCase());
          } else {
            const exactMatch: string | undefined = dict.exactLookup(randomQuery) as string;
            assert.isUndefined(exactMatch);
          }
        }
      )
    );
  });
});
