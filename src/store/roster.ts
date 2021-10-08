import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./index";

import type { Roster } from "@bonfire-xmpp/verse/protocol";

// Define a type for the slice state
interface RosterState {
  value: Roster;
  pending: string[];
}

// Define the initial state using that type
const initialState: RosterState = {
  value: { items: [] },
  pending: [],
};

export const rosterSlice = createSlice({
  name: "counter",
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    addPending: (state, action: PayloadAction<string>) => {
      state.pending.push(action.payload);
    },
    removePending: (state, action: PayloadAction<string>) => {
      const idx = state.pending.indexOf(action.payload);
      if (idx !== -1) state.pending.splice(idx, 1);
    },
    // Use the PayloadAction type to declare the contents of `action.payload`
    applyDiff: (
      state,
      action: PayloadAction<Roster & { items?: { pending?: boolean }[] }>
    ) => {
      const diff = action.payload;

      // We're already up to date
      if (state.value.version === diff.version) return;

      // The current roster
      const items = state.value?.items || [];

      // For each item in the diff
      for (const item of diff.items ?? []) {
        const idx = items.findIndex((i) => i.jid === item.jid);

        // If the current item exists in the current roster, update it
        if (idx !== -1) {
          // If we have no subscription, or the item is removed,
          // find it in the current roster and remove it from there
          if (
            item.subscription === "remove" ||
            (item.subscription === "none" && !item.pending)
          ) {
            items.splice(idx, 1);
          } else {
            items[idx] = item;
          }

          // If the current doesn't exist in the current roster, add it
        } else {
          if (
            ["to", "from", "both"].includes(item.subscription) ||
            item.pending
          )
            items.push(item);
        }
      }

      diff.version && (state.value.version = diff.version);
    },
  },
});

export const { addPending, removePending, applyDiff } = rosterSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectors = {
  selectPending: (state: RootState) => state.roster.pending,
  selectRoster: (state: RootState) => state.roster.value,
};

const name: "roster" = "roster";
type selectorIds = `${typeof name}/${keyof typeof selectors}`;

export const $selectors: Record<keyof typeof selectors, selectorIds> =
  Object.keys(selectors).reduce(
    (acc, k) => (acc[k] = `${name}/${k}`) && acc,
    {} as any
  );

type selectorsLookup = {
  [K in keyof typeof selectors &
    string as `${typeof name}/${K}`]: typeof selectors[K];
};

export const selectorsRPC: selectorsLookup = Object.fromEntries(
  Object.entries(selectors).map(([name, f]) => ["roster/" + name, f])
) as any;

export default rosterSlice.reducer;
