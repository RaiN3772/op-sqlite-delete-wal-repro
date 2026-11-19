# op-sqlite: `delete()` leaves the `-wal` and `-shm` files

A blank Expo app (SDK 58, React Native 0.88.1, New Architecture) with `@op-engineering/op-sqlite` 19.0.5.

`App.tsx` opens `w.sqlite`, switches it to WAL, writes 200 rows in a transaction and closes it. Then it opens it again,
closes it and calls `delete()`, as the docs show. After each step it lists the files in the database's folder whose
names start with `w.sqlite`.

```sh
bun install
bunx expo run:ios     # or bunx expo run:android
```

Tap **Run**.

Seen on the iOS simulator (iOS 27.0):

```
After writes and close():
w.sqlite (4096 bytes)
w.sqlite-shm (32768 bytes)
w.sqlite-wal (12392 bytes)

After delete():
w.sqlite-shm (32768 bytes)
w.sqlite-wal (12392 bytes)
```

The leftover `w.sqlite-wal` still holds all 200 rows (`strings w.sqlite-wal | grep -c "row "` prints 200).

**Run with wal_checkpoint(TRUNCATE) before close()** runs `PRAGMA wal_checkpoint(TRUNCATE)` before the first
`close()`. Then `close()` leaves only `w.sqlite`, and `delete()` leaves nothing.

Screenshots: `screenshots/ios-run.png`, `screenshots/ios-checkpoint-first.png`.
