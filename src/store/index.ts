import { configureStore } from "@reduxjs/toolkit";

import roster from "./roster";

export const store = configureStore({
  reducer: {
    roster,
  },
  devTools: true,
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
