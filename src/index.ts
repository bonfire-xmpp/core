import * as XMPP from "@bonfire-xmpp/verse";
import { Bridge } from "@bonfire-xmpp/apibridge";

import { setupFeatures, Features } from "./features";

import type { ViewAPI } from "./view";

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

    return this.$state.client.connect(opts);
  },
});

export type API = ReturnType<typeof api>;
export type Events = `stanza:${keyof XMPP.AgentEvents}`;

export type ModelBridge = Bridge<ViewAPI, unknown, API, Events>;

const bridge = new Bridge<ViewAPI, unknown, API, Events>();
bridge.define({
  ...api({ bridge }),
  // TODO: expose features
});
export default bridge;
