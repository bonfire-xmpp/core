import { Context } from "../features";
import { JID } from "@bonfire-xmpp/verse";

import {
  addPending,
  removePending,
  applyDiff,
  $selectors,
} from "../store/roster";
import { Roster } from "@bonfire-xmpp/verse/protocol";

declare module "../features" {
  interface Features {
    roster: {
      /**
       * Accepts a presence subscription request from `jid`, and sends a request back.
       * When no request is made, this will allow `jid` to subscribe to our presence, if and when they wish.
       * If `jid` was on the `pending` list, it will be removed.
       * @param jid
       */
      accept(jid: string): void;

      /**
       * Declines a presence subscription request from `jid`, and forbids them from seeing our subscription.
       * When no request is made, this function call *should* do nothing -- effectively.
       * If `jid` was on the `pending` list, it will be removed.
       * @param jid
       */
      deny(jid: string): void;
    };
  }
}

const name = "roster";

export default async function ({
  provide,
  require,
  client,
  bind,
  bridge,
}: Context) {
  const storage = await require("storage");

  bind(async () => {
    const roster = await client.getRoster();
    bridge.fn.dispatch(applyDiff(roster));
  });

  // Handle roster updates. The server is aware of the client's current roster
  // version, and all updates are sent as diffs of the current roster version
  client.on("roster:update", ({ roster }) => {
    bridge.fn.dispatch(applyDiff(roster));

    // Subsequent roster updates mean they probably happened on another client.
    // The user, then, must have interacted with the mentioned JIDs: remove them from the pending list.
    // At worst, we'll get the subscription request on next presence (i.e. refresh).
    roster.items?.forEach((i) =>
      bridge.fn.dispatch(removePending(JID.toBare(i.jid)))
    );
  });

  // Somebody wants to subscribe to _us_
  client.on("subscribe", async (presence) => {
    const jid = JID.toBare(presence.from);

    // Batch load the current state
    const [pending, roster] = (await bridge.fn.selectMany([
      $selectors.selectPending,
      $selectors.selectRoster,
    ])) as [string[], Roster];

    // Automatically accept if we're already subscribed to them
    const item = roster.items?.find((i) => i.jid === jid);
    if (item && item.subscription === "to")
      return client.acceptSubscription(presence.from);
    // Otherwise, if the request isn't already pending, ask the user to manually interact
    else if (!pending.includes(jid)) {
      bridge.fn.dispatch(addPending(JID.toBare(presence.from)));

      // TODO: fix avatars, notifications
      /*
      try {
        new Notification(`Bonfire`, {
          body: `Friend request from ${jid}`,
          image: ctx.$store.state[Store.$states.avatars][jid],
          icon: ctx.$store.state[Store.$states.avatars][jid],
        });
        // eslint-disable-next-line no-empty
      } catch (e) {}
      */
    }
  });

  // Somebody unsubscribed from us (but our subscription to them is the same)... Do nothing!
  // The roster:update will handle the change in roster status
  // client.on('unsubscribe', presence => {});

  // We subscribed to somebody (successfully)... Do nothing!
  // The roster:update will handle the change in roster status
  // client.on('subscribed', presence => {});

  // Our request was rejected, or we were removed.
  // Remove their access to our presence, too.
  client.on("unsubscribed", (presence) => {
    bridge.fn.dispatch(removePending(JID.toBare(presence.from)));
    client.denySubscription(presence.from);
  });

  provide(name, {
    accept(jid: string) {
      // TODO: Remove this JID from the `pending` list
      bridge.fn.dispatch(removePending(JID.toBare(jid)));
      client.acceptSubscription(jid);
      client.subscribe(jid);
    },

    deny(jid: string) {
      bridge.fn.dispatch(removePending(JID.toBare(jid)));
      client.denySubscription(jid);
      client.unsubscribe(jid);
    },
  });
}
