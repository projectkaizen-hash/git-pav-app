# Screen-reader checklist (CS-38)

Run this on a real device before each release, once with VoiceOver (iOS) and once with TalkBack (Android). Use a test account with synthetic data only. The automated check in `pavdental/src/__tests__/accessibility.test.ts` already fails if a button has no role or label, so this list covers what code can't check.

## Each flow

Go through sign-in, booking (service, clinic, clinician, slot, summary, payment), the van request, a video consult from intake to the call, records (plans, prescriptions, tooth chart), messages, and the profile screens.

For every screen:

1. Swipe through from top to bottom. Each item is read once, in the order it appears, with a name that makes sense on its own ("Remove card", not "Button").
2. Selected options are announced as selected (pills, radio choices, tabs, tooth numbers).
3. Checkboxes and switches announce their state, and the new state after a double-tap.
4. Loading and error states are read out, and "Try again" can be reached.
5. A sheet or modal keeps focus inside it until it closes, and the close control is reachable.
6. Nothing important is only conveyed by colour or an emoji.

## Text size and layout

1. Set the largest accessibility text size. Text grows (to the app's 1.5x cap) without clipping or overlapping, and every button is still reachable.
2. On the smallest supported phone width (320 points), no screen scrolls sideways.

## Recording the result

Note the device, OS version, app build and any failures in the release ticket. A failure on a booking, payment or clinical screen blocks the release.
