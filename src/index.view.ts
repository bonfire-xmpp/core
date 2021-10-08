// This file must be imported on the View-thread side of the bridge

import { Bridge } from "@bonfire-xmpp/apibridge";
import type { ModelAPI, ModelEvents } from "./index";

export * as Store from "./store";
import { AppDispatch, store } from "./store";
import selectorsRPC from "./store/selectors";

type Selector<S extends keyof typeof selectorsRPC> = ReturnType<
  typeof selectorsRPC[S]
>;

const api = ({ bridge }: { bridge: Bridge<ModelAPI, ModelEvents> }) => ({
  select<K extends keyof typeof selectorsRPC>(
    selector: K
  ): ReturnType<typeof selectorsRPC[K]> {
    const select = selectorsRPC[selector];
    if (!select) throw `Non-existent selector called '${selector}'`;
    return select(store.getState()) as any;
  },

  selectMany<Keys extends readonly (keyof typeof selectorsRPC)[]>(
    selectors: Keys
  ): {
    [T in keyof Keys]: Keys[T] extends keyof typeof selectorsRPC
      ? Selector<Keys[T]>
      : unknown;
  } {
    return selectors.map((s) => this.select(s)) as any;
  },

  dispatch: ((action: any) => store.dispatch(action)) as AppDispatch,
});

export interface ViewAPI extends ReturnType<typeof api> {}

const bridge = new Bridge<ModelAPI, ModelEvents, ViewAPI>();
bridge.define({
  ...api({ bridge }),
});

export default bridge;
