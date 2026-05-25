/**
 * PARENTVAULT-COMMENTARY
 *
 * Expo entrypoint that registers the React Native app.
 *
 * This file should stay tiny; app behavior belongs in App.tsx and src modules.
 *
 * Only change this when Expo/bootstrap requirements change.
 *
 * Reading guide:
 * - Comments in this project explain product intent, privacy/security boundaries, and why a flow exists.
 * - They are deliberately more detailed than normal production comments because this app is being shared for learning, review, and handoff.
 * - If code and comments ever disagree, fix both together; stale privacy/security comments are dangerous.
 */

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
