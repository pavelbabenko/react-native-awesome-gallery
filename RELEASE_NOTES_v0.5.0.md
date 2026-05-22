# v0.5.0 — Reanimated 4.2.x

Upgrades the library to **react-native-reanimated 4.2.x**.

## ⚠️ Breaking changes

- Peer dependency is now `react-native-reanimated@^4.0.0`. **Consumers on Legacy Architecture, or who can't move off Reanimated 3, must stay on `0.4.3`** — Reanimated 4 dropped Legacy Arch support entirely.
- `react-native-worklets` is now a required peer dependency (`>=0.7.0`). The worklets runtime moved out of `react-native-reanimated` into its own package in v4.
- Update your `babel.config.js`: replace `react-native-reanimated/plugin` with `react-native-worklets/plugin`.

## Migration steps for consumers

```bash
# 1. Install the new peer and bump reanimated
yarn add react-native-reanimated@^4.2.0 react-native-worklets

# 2. Edit babel.config.js
# - plugins: ['react-native-reanimated/plugin']
# + plugins: ['react-native-worklets/plugin']

# 3. Make sure the New Architecture is enabled in your app
```

For Expo apps: SDK 55 ships compatible native binaries out of the box.

## What's inside

- `peerDependencies`: `react-native-reanimated@^4.0.0`, `react-native-worklets@>=0.7.0`.
- Library source updated for v4 type changes: `SharedValue` imported directly instead of from `Animated.SharedValue`, `withDecaySpring` return type annotated for v4's stricter `defineAnimation` generic.
- Example app bumped to Expo SDK 55 (RN 0.83.6 / React 19.2.0 / reanimated 4.2.1 / worklets 0.7.4) with React Navigation v7.
- Dev dependencies (`typescript`, `@types/react`, `react`, `react-native`, `react-native-gesture-handler`, `react-native-builder-bob`) bumped to versions that resolve cleanly against Reanimated 4's type definitions.

## Verification done in this release

- ✅ `yarn prepare` — bob compiles commonjs + module + typescript declarations
- ✅ `yarn typescript` — `tsc --noEmit` clean across library + example
- ✅ `yarn lint` — eslint clean

Runtime verification on iOS/Android simulators is recommended before publishing.
