type Feature = Record<any, any>;

/**
 * Object of all features, meant to be module augmented.
 */
export interface Features {}

/**
 * Type of provide() function: takes a feature name from Features and the
 * associated object.
 */
export type Provide = (
  feature: keyof Features,
  provider: Features[keyof Features]
) => void;

/**
 * Type of require() function. Takes a feature name and returns a promise to the
 * selected feature. Should fail type checks for non-existent features.
 */
export type Require = <F extends keyof Features>(
  feature: F
) => Promise<Features[F]>;

import { Bridge } from "@bonfire-xmpp/apibridge";
import { Agent } from "@bonfire-xmpp/verse";
export type Client = Agent;

export type HookContext = {
  client: Client;
};

export type HookCb = (ctx: HookContext) => Promise<any> | any;

/**
 * Generic hook type. Takes a callback which will get called on hook.
 */
export type Hook = (cb: HookCb) => void;

/**
 * Hook for connection bind.
 */
export type Bind = Hook;

export interface Context {
  provide: Provide;
  require: Require;
  client: Client;
  bind: Bind;
  bridge: Bridge;
}

export * from "./feature-modules";
import * as Modules from "./feature-modules";

export function setupFeatures(client: Client, bridge: Bridge): void {
  const modules = Modules as Record<
    string,
    { default: (ctx: Context) => void | Promise<void> }
  >;

  // Provided features, name -> feature
  const providedFeatures: Features = {} as Features;

  // All the resolve/reject fns for require() promises waiting to get resolved
  // name -> (provide, reject)
  const waitingOnRequire: Record<
    string,
    [(feature: Feature) => any, (reason: string) => void][]
  > = {};

  // All the require() promises waiting to get resolved
  // name -> Promise
  // Used for a promise race timeout
  const requirePromises: Record<string, Promise<unknown>[]> = {};

  // Passed to all feature modules. Returns a promise to the requested feature.
  const require: Require = (feature) => {
    const promise: Promise<Features[typeof feature]> = new Promise(
      (resolve, reject) => {
        // Put this promise on all the queues
        waitingOnRequire[feature] ??= [];
        waitingOnRequire[feature].push([resolve as any, reject]);
      }
    );
    requirePromises[feature] ??= [];
    requirePromises[feature].push(promise);
    return promise;
  };

  // Passed to all feature modules. Adds feature to global list, resolves any requires()
  const provide: Provide = <F extends keyof Features>(
    feature: F,
    provider: Features[F]
  ) => {
    // Resolve any waiting requires()
    waitingOnRequire[feature]?.map(([resolve]) => resolve(provider));

    // Manually delete everything that was waiting for this feature (slight GC opt)
    delete waitingOnRequire[feature];
    delete requirePromises[feature];

    // Add to global list
    providedFeatures[feature] = provider;
  };

  // Call bind hooks when (re)connected
  const binds: HookCb[] = [];
  const bindHook = (cb: HookCb) => binds.push(cb);
  const bind = () => {
    binds.forEach((f) => f({ client }));
  };
  client.on("session:started", bind);
  client.on("stream:management:resumed", bind);

  // Load all feature modules
  for (const module in modules) {
    modules[module].default({
      bind: bindHook,
      bridge,
      client,
      provide,
      require,
    });
  }

  // 5 second timeout kill all waiting requires()
  Promise.race([
    new Promise((resolve) => setTimeout(resolve, 5000)),
    // So long as _anyone_ is waiting on a require()
    Promise.all(Object.values(requirePromises)),
  ]).then(() => {
    Object.entries(waitingOnRequire).forEach(([feature, fs]) => {
      fs.forEach(([, reject]) =>
        reject(
          `require() for feature \`${feature}\` timed out. ` +
            `Either something is deadlocked, or the feature doesn't exist.`
        )
      );
      delete waitingOnRequire[feature];
      delete requirePromises[feature];
    });
  });

  console.log(providedFeatures);
}
