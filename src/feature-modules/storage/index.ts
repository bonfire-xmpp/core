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
      keyvalue: KeyValueStore<KeyValueModel>;
    };
  }
}

export default async ({ provide, require, client }: Context) => {
  const UID = await require("uid");
  const uid = await UID.getOrRegisterUID(client.config.jid as string);

  // TODO: choose best storage backend using some algorithm
  const keyvalue = new KeyValueStores.idbKeyValue<KeyValueModel>({
    uid,
    isEncrypted: false,
  });

  provide(name, {
    keyvalue,
  });
};
