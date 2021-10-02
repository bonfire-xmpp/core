import * as XMPP from "@bonfire-xmpp/verse";
import type { Bridge } from "@bonfire-xmpp/apibridge";

import { setupFeatures } from "./features";

const api = ({ bridge }: { bridge: Bridge }) => ({
  $state: {
    client: null as XMPP.Agent | null,
  },

  async connect(opts: XMPP.AgentConfig): Promise<void> {
    // Perform an init the first time around
    if (this.$state.client === null) {
      this.$state.client = XMPP.createClient(opts);
      setupFeatures(this.$state.client, bridge);
      this.$state.client.on("*", (e, ...args) => {
        bridge.emit(`stanza:${e}`, args);
        bridge.emit("stanza:*", [e, ...args]);
      });
    }

    // We've been called before, just connect with the new options
    return this.$state.client.connect(opts);
  },
});

export default api;

export type API = ReturnType<typeof api>;
export type Events = `stanza:${keyof XMPP.AgentEvents}`;
