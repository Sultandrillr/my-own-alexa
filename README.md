# my-own-alexa

Personal lighting control system: voice control, motion sensors, and a mobile app, all running on my own home server.

## Architecture

```
ESP32 (motion sensor, mic) --> Home server (Docker) <--> React Native app
                                 |- API
                                 |- Database
                                 |- Voice command classifier (small model)
```

## Layout

| Folder | What's in it |
|---|---|
| `firmware/` | ESP32 code (sensors, sending data to the server) |
| `api/` | Backend API |
| `classifier/` | Small model that classifies voice commands |
| `app/` | React Native app |
| `docker/` | Docker Compose setup for API, database and classifier |
| `docs/` | Documentation, written as work is done |

## Status

Just started. See `docs/` for progress notes.
