import { StoreCtor, KeyValueStore } from "../types";
import shajs from "sha.js";
import { set, get, del, createStore } from "idb-keyval";

const store = createStore("keyval-db", "keyval-store");

export class IDBKeyValue<
  Model = Record<string, any>
> extends KeyValueStore<Model> {
  #jid: string;
  #encKey: any;
  #isEncrypted: boolean;

  constructor({ jid, encKey, isEncrypted }: StoreCtor) {
    super();
    this.#jid = jid;
    this.#encKey = encKey;
    this.#isEncrypted = isEncrypted;
  }

  get jid() {
    return this.#jid;
  }
  get encKey() {
    return this.#encKey;
  }
  get isEncrypted() {
    return this.#isEncrypted;
  }

  // TODO: implement hash
  private hash(s: string): string {
    return new shajs.sha256().update(s).digest("base64");
  }

  // NOTE: will throw if the key doesn't exist
  get<K extends keyof Model>(key: K): Promise<Model[K] | undefined> {
    // TODO: decrypt read data
    return get(this.hash(this.#jid + key), store);
  }

  set<K extends keyof Model>(key: K, value: Model[K]): Promise<void> {
    return set(
      this.hash(this.#jid + key),
      // TODO: encrypt read data
      value,
      store
    );
  }

  delete<K extends keyof Model>(key: K): Promise<void> {
    return del(this.hash(this.#jid + key), store);
  }
}
