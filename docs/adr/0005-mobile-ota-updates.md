# ADR-0005: Add EAS Update before the first store build

## Status
Proposed (needs the owner's go-ahead because it adds an Expo service used in production; EAS Update has a free tier).

## Context
`pavdental/eas.json` defines `development`, `preview` and `production` channels, but `expo-updates` is not installed, so the channels do nothing. A bad release can only be fixed by a new store build and review. The previous release checklist promised an "EAS Update rollback" that was not possible.

## Decision
Install `expo-updates`, keep `runtimeVersion.policy: "appVersion"`, and publish JavaScript-only fixes to the `preview` channel first, then `production`. Native changes (new permissions, SDK upgrades) always go through a store build with a new app version. Updates that change what the app claims or collects still follow the store's rules (no feature changes that bypass review).

## Alternatives considered
- **Store releases only**: nothing to add, but rollback takes days.
- **Self-hosted updates server** (Expo Updates protocol): no vendor, but another service to host and secure.

## Consequences
- Positive: a broken screen can be rolled back in minutes; the same build can be pointed at a fixed update.
- Negative: Expo receives the JS bundle (no patient data) and must be in the processor list; a careless update could ship untested code, so updates go through the same CI and preview channel.
- Follow-ups: RB-20.

## References
- EAS Update introduction, https://docs.expo.dev/eas-update/introduction/
