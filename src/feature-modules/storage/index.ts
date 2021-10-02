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

export default ({ provide, require, client }: Context) => {
  // TODO: choose best storage backend using some algorithm
  const keyvalue = new KeyValueStores.idbKeyValue<KeyValueModel>({
    jid: client.config.jid as string,
    isEncrypted: false,
  });

  provide(name, {
    keyvalue,
  });
};
