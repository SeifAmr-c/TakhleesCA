import db from '../../Database/connection.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const userSelectSql = `
  SELECT
    u.UserID, u.FirstName, u.LastName, u.Email, u.Password, u.Type,
    c.PhoneNumber, c.NationalID, c.Address,
    a.LastLogin
  FROM User u
  LEFT JOIN Client c ON u.UserID = c.ClientID
  LEFT JOIN Admin a ON u.UserID = a.AdminID
`;

const sanitizeUser = (row) => {
  if (!row) return null;
  return {
    UserID: row.UserID,
    FirstName: row.FirstName,
    LastName: row.LastName,
    Email: row.Email,
    Type: row.Type,
    PhoneNumber: row.PhoneNumber ?? null,
    NationalID: row.NationalID ?? null,
    Address: row.Address ?? null,
    LastLogin: row.LastLogin ?? null,
  };
};

const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
// ── getUser ──────────────────────────────────────────────
export const getUser = (req, res) => {
    const raw = req.query.UserID;

    let user_id;
    if (raw === undefined || raw === null || raw === '') {
        user_id = '%';
    } else if (raw === '%') {
        user_id = '%';
    } else {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 1) {
            return res.status(400).json({
                error: 'Invalid UserID. Use a positive integer or %.',
            });
        }
        user_id = String(n);
    }

    const sql =
        'SELECT * FROM (User LEFT JOIN Client ON User.UserID = Client.ClientID) LEFT JOIN Admin ON User.UserID = Admin.AdminID WHERE User.UserID LIKE ?';

    db.query(sql, [user_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
    });
};

// ── deleteUser ───────────────────────────────────────────
export const deleteUser = (req, res) => {
    const UserID = req.query.UserID;
    if (UserID === undefined || UserID === null || String(UserID).trim() === '') {
        return res.status(400).json({ error: 'UserID is required (query)' });
    }
    const uid = Number(UserID);
    if (!Number.isFinite(uid)) {
        return res.status(400).json({ error: 'Invalid UserID' });
    }

    db.query(
        "SELECT UserID FROM User WHERE UserID = ?",
        [uid],
        function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }

            if (result.length === 0) {
                return res.status(404).json({
                    "Status": "Error",
                    "Message": "Record Id [" + uid + "] does not exist or has already been deleted."
                });
            }

            const sql = `
                DELETE FROM Client WHERE ClientID = ?;
                DELETE FROM Admin WHERE AdminID = ?;
                DELETE FROM User WHERE UserID = ?
            `;
            db.query(sql, [uid, uid, uid], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }
                res.status(200).json({ "Status": "OK", "Message": "UserID [" + uid + "] deleted successfully" });
                console.log("Delete request processed for UserID [" + uid + "]");
            });
        }
    );
};

// ── updateUser ───────────────────────────────────────────
export const updateUser = (req, res) => {
    console.log('PUT Request Received');
    const UserID = req.query.UserID;
    if (UserID === undefined || UserID === null || String(UserID).trim() === '') {
        return res.status(400).json({ error: 'UserID is required (query)' });
    }
    const uid = Number(UserID);
    if (!Number.isFinite(uid) || !Number.isInteger(uid) || uid < 1) {
        return res.status(400).json({ error: 'Invalid UserID' });
    }
    const { FirstName, LastName, Email, Password, Type } = req.body;
    const sql =
        'UPDATE User SET FirstName = ?, LastName = ?, Email = ?, Password = ?, Type = ? WHERE UserID = ?';
    db.query(sql, [FirstName, LastName, Email, Password, Type, uid], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found', UserID: uid });
        }
        res.json({ Status: 'OK', Message: `UserID [${uid}] updated successfully` });
        console.log(`UserID [${uid}] updated successfully`);
    });
};

// ── updateClient ─────────────────────────────────────────
export const updateClient = (req, res) => {
    const raw = req.query.ClientID;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return res.status(400).json({ error: 'ClientID is required (query)' });
    }
    const clientId = Number(raw);
    if (!Number.isInteger(clientId) || clientId < 1) {
        return res.status(400).json({ error: 'Invalid ClientID' });
    }

    const { PhoneNumber, NationalID, Address } = req.body;
    const phoneDigits = String(PhoneNumber ?? '').replace(/\D/g, '');
    const nidDigits = String(NationalID ?? '').replace(/\D/g, '');
    const phone = parseInt(phoneDigits, 10);
    const nid = parseInt(nidDigits, 10);
    const address = String(Address ?? '').trim();

    if (!Number.isFinite(phone)) {
        return res.status(400).json({ error: 'Invalid PhoneNumber' });
    }
    if (!Number.isFinite(nid)) {
        return res.status(400).json({ error: 'Invalid NationalID' });
    }
    if (!address) {
        return res.status(400).json({ error: 'Address is required' });
    }

    const sql =
        'UPDATE Client SET PhoneNumber = ?, NationalID = ?, Address = ? WHERE ClientID = ?';
    db.query(sql, [phone, nid, address, clientId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Client not found', ClientID: clientId });
        }
        res.json({ Status: 'OK', Message: `ClientID [${clientId}] updated successfully` });
    });
};

// ── updateAdmin ──────────────────────────────────────────
export const updateAdmin = (req, res) => {
    const raw = req.query.AdminID;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return res.status(400).json({ error: 'AdminID is required (query)' });
    }
    const adminId = Number(raw);
    if (!Number.isInteger(adminId) || adminId < 1) {
        return res.status(400).json({ error: 'Invalid AdminID' });
    }

    const sql =
        req.body.LastLogin != null
            ? 'UPDATE Admin SET LastLogin = ? WHERE AdminID = ?'
            : 'UPDATE Admin SET LastLogin = NOW() WHERE AdminID = ?';
    const params =
        req.body.LastLogin != null ? [req.body.LastLogin, adminId] : [adminId];
    db.query(sql, params, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Admin not found', AdminID: adminId });
        }
        res.json({ Status: 'OK', Message: `AdminID [${adminId}] updated successfully` });
    });
};

// ── register ────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const FirstName = String(req.body.FirstName ?? "").trim();
    const LastName = String(req.body.LastName ?? "").trim();
    const Email = normalizeEmail(req.body.Email);
    const Password = String(req.body.Password ?? "");
    const Type = String(req.body.Type ?? "C").toUpperCase().slice(0, 1);

    if (!FirstName || FirstName.length < 2) {
      return res.status(400).json({ ok: false, message: "First name is required." });
    }
    if (!LastName || LastName.length < 2) {
      return res.status(400).json({ ok: false, message: "Last name is required." });
    }
    if (!Email || !Email.includes("@")) {
      return res.status(400).json({ ok: false, message: "Valid email is required." });
    }
    if (!Password || Password.length < 4) {
      return res.status(400).json({ ok: false, message: "Password must be at least 4 characters." });
    }
    if (Type !== "C" && Type !== "A") {
      return res.status(400).json({ ok: false, message: 'Type must be "C" (client) or "A" (admin).' });
    }

    let PhoneNumber = null;
    let NationalID = null;
    let Address = null;

    if (Type === "C") {
      const phoneRaw = req.body.PhoneNumber;
      const nidRaw = req.body.NationalID;
      Address = String(req.body.Address ?? "").trim();

      if (phoneRaw === undefined || phoneRaw === null || String(phoneRaw).trim() === "") {
        return res.status(400).json({ ok: false, message: "Phone number is required for clients." });
      }
      if (nidRaw === undefined || nidRaw === null || String(nidRaw).trim() === "") {
        return res.status(400).json({ ok: false, message: "National ID is required for clients." });
      }
      if (!Address) {
        return res.status(400).json({ ok: false, message: "Address is required for clients." });
      }

      PhoneNumber = parseInt(String(phoneRaw).replace(/\D/g, ""), 10);
      NationalID = parseInt(String(nidRaw).replace(/\D/g, ""), 10);

      if (!Number.isFinite(PhoneNumber)) {
        return res.status(400).json({ ok: false, message: "Invalid phone number." });
      }
      if (!Number.isFinite(NationalID)) {
        return res.status(400).json({ ok: false, message: "Invalid national ID." });
      }
    }

    const existingEmail = await runQuery("SELECT UserID FROM User WHERE Email = ? LIMIT 1", [Email]);
    if (existingEmail.length) {
      return res.status(409).json({ ok: false, message: "Email already exists." });
    }

    if (Type === "C") {
      const existingPhone = await runQuery("SELECT ClientID FROM Client WHERE PhoneNumber = ? LIMIT 1", [PhoneNumber]);
      if (existingPhone.length) {
        return res.status(409).json({ ok: false, message: "Phone number already exists." });
      }

      const existingNID = await runQuery("SELECT ClientID FROM Client WHERE NationalID = ? LIMIT 1", [NationalID]);
      if (existingNID.length) {
        return res.status(409).json({ ok: false, message: "National ID already exists." });
      }
    }

    const hashedPassword = await bcrypt.hash(Password, SALT_ROUNDS);

    const insertRes = await runQuery(
      "INSERT INTO User (FirstName, LastName, Email, Password, Type) VALUES (?, ?, ?, ?, ?)",
      [FirstName, LastName, Email, hashedPassword, Type]
    );

    const userId = insertRes.insertId;

    if (Type === "C") {
      await runQuery(
        "INSERT INTO Client (ClientID, PhoneNumber, NationalID, Address) VALUES (?, ?, ?, ?)",
        [userId, PhoneNumber, NationalID, Address]
      );
    } else {
      await runQuery("INSERT INTO Admin (AdminID, LastLogin) VALUES (?, NOW())", [userId]);
    }

    const userRows = await runQuery(`${userSelectSql} WHERE u.UserID = ? LIMIT 1`, [userId]);

    return res.status(201).json({
      ok: true,
      message: "Registered successfully.",
      data: { user: sanitizeUser(userRows[0]) },
    });
  } catch (err) {
    return next(err);
  }
};

// ── login ───────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const Email = normalizeEmail(req.body.Email);
    const Password = String(req.body.Password ?? "");

    if (!Email || !Email.includes("@")) {
      return res.status(400).json({ ok: false, message: "Valid email is required." });
    }
    if (!Password) {
      return res.status(400).json({ ok: false, message: "Password is required." });
    }

    const rows = await runQuery(`${userSelectSql} WHERE u.Email = ? LIMIT 1`, [Email]);
    if (!rows.length) {
      return res.status(401).json({ ok: false, message: "Invalid email or password." });
    }

    const userRow = rows[0];

    const isMatch = await bcrypt.compare(Password, userRow.Password);
    if (!isMatch) {
      return res.status(401).json({ ok: false, message: "Invalid email or password." });
    }

    req.session.userId = userRow.UserID;

    return res.status(200).json({
      ok: true,
      message: "Logged in successfully.",
      data: { user: sanitizeUser(userRow) },
    });
  } catch (err) {
    return next(err);
  }
};

// ── logout ──────────────────────────────────────────────
export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ ok: false, message: "Logout failed." });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ ok: true, message: "Logged out successfully." });
  });
};

// ── me (get current session user) ───────────────────────
export const me = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Not logged in." });
    }

    const rows = await runQuery(`${userSelectSql} WHERE u.UserID = ? LIMIT 1`, [userId]);
    if (!rows.length) {
      return res.status(404).json({ ok: false, message: "User not found." });
    }

    return res.status(200).json({
      ok: true,
      data: { user: sanitizeUser(rows[0]) },
    });
  } catch (err) {
    return next(err);
  }
};

// ── onlineUsers (list active sessions) ──────────────────
export const onlineUsers = async (req, res, next) => {
  try {
    const sessions = await runQuery("SELECT data FROM sessions WHERE expires > UNIX_TIMESTAMP()");
    const userIds = sessions
      .map((row) => {
        try {
          const parsed = JSON.parse(row.data);
          return parsed.userId ?? null;
        } catch { return null; }
      })
      .filter((id) => id !== null);

    if (!userIds.length) {
      return res.json({ ok: true, count: 0, users: [] });
    }

    const placeholders = userIds.map(() => '?').join(',');
    const rows = await runQuery(
      `${userSelectSql} WHERE u.UserID IN (${placeholders})`,
      userIds
    );

    return res.json({
      ok: true,
      count: rows.length,
      users: rows.map(sanitizeUser),
    });
  } catch (err) {
    return next(err);
  }
};

// ── searchUser ──────────────────────────────────────────
export const searchUser = (req, res) => {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedColumns = ['UserID', 'FirstName', 'LastName', 'Email', 'Type'];
    if (!allowedColumns.includes(keyword)) {
        return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
        return res.status(400).json({ error: 'keyvalue is required' });
    }

    const sql = `SELECT * FROM User WHERE ${keyword} = ? ORDER BY UserID ${sort}`;
    db.query(sql, [keyvalue], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(result);
    });
};