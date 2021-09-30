import * as XMPP from "@bonfire-xmpp/verse";
import type { Bridge } from "@bonfire-xmpp/apibridge";

const api = ({ bridge }: { bridge: Bridge }) => ({
  $state: {
    client: null as unknown as XMPP.Agent,
  },
  async connect(opts: XMPP.AgentConfig): Promise<void> {
    this.$state.client = XMPP.createClient(opts);
    this.$state.client.on("*", (e, ...args) => {
      bridge.emit(`stanza:${e}`, args)
      bridge.emit("stanza:*", [e, ...args]);
    });
    await this.$state.client.connect();
  },
});

export default api;

export type API = ReturnType<typeof api>;
export type Events = `stanza:${keyof XMPP.AgentEvents}`;