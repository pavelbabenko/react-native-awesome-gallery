# Changelog

All notable changes to this project will be documented in this file.

## [0.5.0] - 2026-05-21

### BREAKING CHANGES

- Upgraded to `react-native-reanimated@^4.0.0`. Reanimated 4 requires the New Architecture; consumers on Legacy Architecture or Reanimated 3 must stay on `0.4.3`.
- Added `react-native-worklets` as a new peer dependency (`>=0.7.0`). The worklets runtime moved out of `react-native-reanimated` into its own package in v4.

### Changed

- Swapped the Babel plugin from `react-native-reanimated/plugin` to `react-native-worklets/plugin`.
- Imported `SharedValue` directly from `react-native-reanimated` (no longer exported under the `Animated` namespace in v4).
- Annotated `withDecaySpring` with an explicit `number` return type and cast the `defineAnimation` generic to satisfy v4's stricter typing.
- Typed the `useCallback` parameter that React 19 no longer infers implicitly.
- Bumped dev dependencies for compatibility with Reanimated 4's type definitions: `typescript ^5.7.0`, `@types/react ^19.0.0`, `react 19.2.0`, `react-native 0.83.6`, `react-native-gesture-handler ~2.30.0`, `react-native-builder-bob ^0.40.13`.
- Example app upgraded to Expo SDK 55, which natively ships `react-native-reanimated@4.2.1` + `react-native-worklets@0.7.4`. React Navigation bumped to v7.

### Removed

- Dropped the deprecated `importsNotUsedAsValues` tsconfig option (removed in TypeScript 5.5).
- Removed the unused `@expo/webpack-config` and `babel-loader` devDeps from the example app — Expo serves web via Metro since SDK 50.

## [0.4.3]

See git history for releases prior to 0.5.0.
