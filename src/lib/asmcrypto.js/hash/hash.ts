import { _heap_write } from '../other/utils.js';
import { IllegalStateError } from '../other/errors.js';
import { sha1result } from './sha1/sha1.asm.js';
import { sha256result } from './sha256/sha256.asm.js';
import { sha512result } from './sha512/sha512.asm.js';

export abstract class Hash<T extends sha1result | sha256result | sha512result> {
  public result!: Uint8Array | null;
  public pos: number = 0;
  public len: number = 0;
  public asm!: T;
  public heap!: Uint8Array;
  public BLOCK_SIZE!: number;
  public HASH_SIZE!: number;

  reset() {
    this.result = null;
    this.pos = 0;
    this.len = 0;

    this.asm.reset();

    return this;
  }

  process(data: Uint8Array) {
    if (this.result !== null) throw new IllegalStateError('state must be reset before processing new data');

    let asm = this.asm;
    let heap = this.heap;
    let hpos = this.pos;
    let hlen = this.len;
    let dpos = 0;
    let dlen = data.length;
    let wlen = 0;

    while (dlen > 0) {
      wlen = _heap_write(heap, hpos + hlen, data, dpos, dlen);
      hlen += wlen;
      dpos += wlen;
      dlen -= wlen;

      wlen = asm.process(hpos, hlen);

      hpos += wlen;
      hlen -= wlen;

      if (!hlen) hpos = 0;
    }

    this.pos = hpos;
    this.len = hlen;

    return this;
  }

  finish() {
    if (this.result !== null) throw new IllegalStateError('state must be reset before processing new data');

    this.asm.finish(this.pos, this.len, 0);

    this.result = new Uint8Array(this.HASH_SIZE);
    this.result.set(this.heap.subarray(0, this.HASH_SIZE));

    this.pos = 0;
    this.len = 0;

    return this;
  }
}
