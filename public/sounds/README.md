# Timer sound overrides

Drop MP3 files here to replace the built-in synthesized cues. Missing files are ignored and the synth tones play instead.

## Round voice lines (recommended)

Rename numbered clips to `round` + number before committing:

| Your file | Rename to | When it plays |
|-----------|-----------|----------------|
| `1.mp3` | `round1.mp3` | Start of Round 1 |
| `2.mp3` | `round2.mp3` | Start of Round 2 |
| … | … | … |
| `9.mp3` | `round9.mp3` | Start of Round 9 |
| `round.mp3` | keep as `round.mp3` | Round-start bell (if `start.mp3` is absent) |

## Other optional cues

| File | When it plays |
|------|----------------|
| `ready.mp3` | Each second of Get Ready |
| `start.mp3` | Round start bell (overrides `round.mp3`) |
| `soon.mp3` | 10-second warning |
| `finish.mp3` | End of round / session |
| `checkin.mp3` | Student check-in chime |
| `announce-ready.mp3` | Voice line when Get Ready begins |
| `announce-start.mp3` | Fallback voice if `roundN.mp3` is missing |
| `announce-soon.mp3` | Voice line with the 10s warning |

Keep clips short. Do not commit copyrighted material you do not have rights to use.
