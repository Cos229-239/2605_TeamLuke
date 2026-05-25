# ParentVault screen map

Each bottom tab has its own screen file. If you want to change a tab, start here.

| App tab | File to edit | What belongs here |
|---|---|---|
| Profiles | `ProfilesScreen.tsx` | Child profile, school, medical, emergency, custody details |
| Schedule | `ScheduleScreen.tsx` | Custody calendar, school dates, appointments, medications, reminders |
| Chat | `ChatScreen.tsx` | Natural-language command center and quick updates |
| Import | `ImportScreen.tsx` | Paste/import documents, screenshots, PDFs, school notes, custody notes |
| Journal | `JournalScreen.tsx` | Factual notes, incidents, tags, evidence-style records |
| Settings | `SecurityScreen.tsx` | Privacy, security, theme, and safety settings |
| Onboarding | `OnboardingScreen.tsx` | First-run setup before the main tabs unlock |

## Where tab navigation lives

Tab labels, order, and screen assignments live in:

`../navigation/tabs.tsx`

The root `../../App.tsx` should stay small. It should only connect theme, onboarding, and tab navigation.
