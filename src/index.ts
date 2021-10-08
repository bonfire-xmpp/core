import * as XMPP from "@bonfire-xmpp/verse";
import { Bridge } from "@bonfire-xmpp/apibridge";

import { setupFeatures } from "./features";

import type { ViewAPI } from "./index.view";

const setupApi = ({ bridge }: { bridge: Bridge }) => {
  const $state = {
    client: XMPP.createClient({}),
  };

  const features = setupFeatures($state.client, bridge);

  // Pass along all stanza events to the main thread
  $state.client.on("*", (e, ...args) => {
    bridge.emit(`stanza:${e}`, args);
    bridge.emit("stanza:*", [e, ...args]);
  });

  return {
    $state,
    ...features,
    connect(opts: XMPP.AgentConfig): void {
      // TODO: return a promise for connecting?
      this.$state.client.updateConfig(opts);
      return this.$state.client.connect();
    },
  };
};

export type ModelAPI = ReturnType<typeof setupApi>;
export type ModelEvents = `stanza:${keyof XMPP.AgentEvents}`;
export type ModelBridge = Bridge<ViewAPI, unknown, ModelAPI, ModelEvents>;

// Create a bridge and register our API to it. The user can call extra
// `define()`s and will have to set up I/O.
const bridge = new Bridge<ViewAPI, unknown, ModelAPI, ModelEvents>();
bridge.define({
  ...setupApi({ bridge }),
});
export default bridge;
