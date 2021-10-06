export interface StoreCtor {
  uid: string;
  encKey?: any;
  isEncrypted: boolean;
}

export abstract class Store {
  abstract get encKey(): any;
  abstract get isEncrypted(): boolean;
  abstract get uid(): string;
}

export abstract class KeyValueStore<
  Model = Record<string, any>,
  T extends keyof Model = keyof Model
> extends Store {
  abstract get<K extends T>(key: K): Promise<Model[K] | undefined>;
  abstract set<K extends T>(key: K, value: Model[K]): Promise<void>;
  abstract delete<K extends T>(key: K): Promise<void>;
}
