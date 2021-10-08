import { Context } from "../../features";
import KeyValueStores from "./keyvalue";
import { KeyValueStore } from "./types";

const name = "storage";

interface KeyValueModel {
  sendTypingNotification: boolean;
  sendReadReciepts: boolean;
}

declare module "../../features" {
  interface Features {
    storage: {
      keyvalue:
        | KeyValueStore<KeyValueModel>
        | Promise<KeyValueStore<KeyValueModel>>;
    };
  }
}

export default async ({ provide, require, bind }: Context) => {
  const UID = await require("uid");

  let resolve: (store: KeyValueStore<KeyValueModel>) => void;
  const keyvalue: Promise<KeyValueStore<KeyValueModel>> = new Promise((r) => {
    resolve = r;
  });

  bind(async ({ client }) => {
    const uid = await UID.getOrRegisterUID(client.config.jid as string);

    // TODO: choose best storage backend using some algorithm
    resolve(
      new KeyValueStores.idbKeyValue<KeyValueModel>({
        uid,
        isEncrypted: false,
      })
    );
  });

  provide(name, {
    keyvalue,
  });
};
