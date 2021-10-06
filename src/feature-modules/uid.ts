import { Context } from "../features";

declare module "../features" {
  interface Features {
    uid: {
      /**
       * Registers a new JID to a UID. Will throw if JID was already registered.
       * @returns generated UID
       */
      registerJID(jid: string): Promise<string>;

      /**
       * Gets the UID for given JID. Will throw if JID isn't already registered.
       * @returns registered UID
       */
      getUID(jid: string): string;

      /**
       * Gets the UID for given JID, or registers the JID if it isn't already.
       * @returns registered UID
       */
      getOrRegisterUID(jid: string): Promise<string>;
    };
  }
}

import shajs from "sha.js";
import { nanoid } from "nanoid";
import { set, createStore, entries } from "idb-keyval";

export default async function ({ provide, bind }: Context) {
  const store = createStore("uid-db", "uid-store");

  const hash = (s: string): string =>
    new shajs.sha256().update(s).digest("base64");

  const existing: Record<string, string> = Object.fromEntries(
    await entries(store)
  );

  // Auto-register whoever's logged in
  bind(({ client }) => {
    const jid = client.config.jid;
    if (!jid) return;

    const sha = hash(jid);
    if (existing[sha] === undefined) {
      registerJID(jid);
    }
  });

  const registerJID = async (jid: string): Promise<string> => {
    const sha = hash(jid);

    if (existing[sha] !== undefined) {
      throw "JID already registered to a UID";
    }

    // It'll take ~200 days to reach 0.01 probability of at least 1 collision,
    // if you register new JIDs once an hour; or 1073741824 JIDs total possible.
    const uid = nanoid(5);

    existing[sha] = uid;
    await set(sha, uid, store);
    return uid;
  };

  const getUID = (jid: string): string => {
    const uid = existing[hash(jid)];
    if (uid === undefined) {
      throw "JID isn't registered";
    }
    return uid;
  };

  provide("uid", {
    registerJID,
    getUID,
    async getOrRegisterUID(jid: string): Promise<string> {
      try {
        const uid = await registerJID(jid);
        return uid;
      } catch (_) {
        return getUID(jid);
      }
    },
  });
}
