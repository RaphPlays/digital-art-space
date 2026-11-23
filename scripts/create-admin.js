const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

async function ask(prompt) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try { return (await rl.question(prompt)).trim(); }
  finally { rl.close(); }
}

function askHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
      reject(new Error('Run this script in an interactive terminal so the password can be hidden.'));
      return;
    }

    let value = '';
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function finish(error) {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    }

    function onData(character) {
      if (character === '\u0003') return finish(new Error('Cancelled.'));
      if (character === '\r' || character === '\n') return finish();
      if (character === '\u007f' || character === '\b') {
        if (value.length) {
          value = value.slice(0, -1);
          stdout.write('\b \b');
        }
        return;
      }
      if (character >= ' ' && character !== '\u007f') {
        value += character;
        stdout.write('*');
      }
    }

    stdin.on('data', onData);
  });
}

async function main() {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error('Missing database settings: ' + missing.join(', ') + '. Copy .env.example to .env and fill in your TiDB connection details first.');
  }

  const email = (await ask('Admin email: ')).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    throw new Error('Enter a valid email address.');
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionLimit: 1
  });

  try {
    const [rows] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows[0]) {
      const confirmation = await ask('That account already exists. Its current password will be kept. Type PROMOTE to make it an admin: ');
      if (confirmation !== 'PROMOTE') throw new Error('Promotion cancelled.');
      await pool.execute("UPDATE users SET role = 'admin', artist_status = 'none' WHERE id = ?", [rows[0].id]);
      await pool.execute('UPDATE artists SET user_id = NULL WHERE user_id = ?', [rows[0].id]);
      console.log('Existing account promoted to administrator. Its password was not changed, and any artist-profile link was cleared.');
    } else {
      const displayName = await ask('Display name: ');
      if (displayName.length < 2 || displayName.length > 80) {
        throw new Error('Display name must be 2 to 80 characters.');
      }
      const password = await askHidden('Admin password (8–72 characters): ');
      if (password.length < 8 || Buffer.byteLength(password) > 72) {
        throw new Error('Password must be 8 to 72 characters.');
      }
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.execute(
        "INSERT INTO users (email, display_name, password_hash, role, artist_status) VALUES (?, ?, ?, 'admin', 'none')",
        [email, displayName, passwordHash]
      );
      console.log('Administrator account created.');
    }
    console.log('You can now sign in on the live site and open Admin Studio.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('\nCould not create the administrator account:', error.message);
  process.exitCode = 1;
});