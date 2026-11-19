import { open } from '@op-engineering/op-sqlite';
import { Directory, File } from 'expo-file-system';
import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text } from 'react-native';

const NAME = 'w.sqlite';

// Every file in the database's folder whose name starts with the database's name, with its size.
function listFiles(dbPath: string) {
  const folder = new Directory('file://' + dbPath.slice(0, dbPath.lastIndexOf('/')));
  const files = folder
    .list()
    .filter((entry): entry is File => entry instanceof File && entry.name.startsWith(NAME))
    .map((file) => `${file.name} (${file.size} bytes)`);
  return files.length > 0 ? files.join('\n') : '(none)';
}

export default function App() {
  const [log, setLog] = useState('');

  const run = async (checkpointFirst: boolean) => {
    const lines: string[] = [];
    const add = (title: string, body: string) => {
      console.log(`${title}\n${body}`);
      lines.push(`${title}\n${body}`);
    };

    // 1. A WAL database with some writes, then closed.
    const db = open({ name: NAME });
    const path = db.getDbPath();
    await db.execute('PRAGMA journal_mode = WAL');
    await db.execute('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, v TEXT)');
    await db.transaction(async (tx) => {
      for (let i = 0; i < 200; i++) {
        await tx.execute('INSERT INTO t (v) VALUES (?)', [`row ${i}`]);
      }
    });
    if (checkpointFirst) {
      await db.execute('PRAGMA wal_checkpoint(TRUNCATE)');
    }
    db.close();
    add('After writes and close():', listFiles(path));

    // 2. Delete it the way the docs show: open, close, delete.
    const again = open({ name: NAME });
    again.close();
    again.delete();
    add('After delete():', listFiles(path));

    // 3. A new database with the same name.
    const fresh = open({ name: NAME });
    let rows: string;
    try {
      rows = String((await fresh.execute('SELECT count(*) AS n FROM t')).rows[0]?.n);
    } catch (error) {
      rows = `no table t (${(error as Error).message})`;
    }
    fresh.close();
    fresh.delete();
    add('Rows in t after opening the same name again:', rows);

    setLog(lines.join('\n\n'));
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Button title="Run" onPress={() => run(false)} />
      <Button title="Run with wal_checkpoint(TRUNCATE) before close()" onPress={() => run(true)} />
      <Text testID="log" style={styles.log}>
        {log}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 80, paddingHorizontal: 24, gap: 16 },
  log: { fontFamily: 'Menlo', fontSize: 14 },
});
