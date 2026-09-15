---
"mobile": patch
---

Expo moves to the patch `expo-doctor` expects, and `expo-doctor` itself is declared as a dependency — CI invoked a binary the workspace never installed, so the mobile job failed on every run.
