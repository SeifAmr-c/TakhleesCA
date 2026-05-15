import bcrypt from 'bcrypt';
import User from '../../Database/mongo/user.mongo.js';
import Application from '../../Database/mongo/application.mongo.js';
import SupportTicket from '../../Database/mongo/support_ticket.mongo.js';
import mongoose from '../../Database/mongo_connection.js';
import { nextId } from '../../Database/mongo/counters.js';

const SALT_ROUNDS = 10;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
};

const isValidEmail = (email) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/* Flatten a User doc into the legacy response shape the React frontend
   expects: top-level UserID/FirstName/etc plus the embedded client/admin
   fields hoisted to the same level. Strips Password and Mongo internals. */
const sanitizeUser = (doc) => {
  if (!doc) return null;
  const u = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    UserID:      u.UserID,
    FirstName:   u.FirstName,
    LastName:    u.LastName,
    Email:       u.Email,
    Type:        u.Type,
    PhoneNumber: u.client?.PhoneNumber ?? null,
    NationalID:  u.client?.NationalID  ?? null,
    Address:     u.client?.Address     ?? null,
    LastLogin:   u.admin?.LastLogin    ?? null,
  };
};

export const getUser = async (req, res, next) => {
  try {
    const raw = req.query.UserID;
    if (raw === undefined || raw === '' || raw === '%') {
      const users = await User.find().sort({ UserID: 1 });
      return res.json(users.map(sanitizeUser));
    }
    const uid = Number(raw);
    if (!Number.isInteger(uid) || uid < 1) {
      return res.status(400).json({ error: 'Invalid UserID. Use a positive integer or %.' });
    }
    const user = await User.findOne({ UserID: uid });
    return res.json(user ? [sanitizeUser(user)] : []);
  } catch (err) {
    return next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const raw = req.query.UserID;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return res.status(400).json({ error: 'UserID is required (query)' });
    }
    const uid = Number(raw);
    if (!Number.isFinite(uid)) {
      return res.status(400).json({ error: 'Invalid UserID' });
    }

    const deleted = await User.findOneAndDelete({ UserID: uid });
    if (!deleted) {
      return res.status(404).json({
        Status: "Error",
        Message: `Record Id [${uid}] does not exist or has already been deleted.`,
      });
    }

    return res.status(200).json({ Status: "OK", Message: `UserID [${uid}] deleted successfully` });
  } catch (err) {
    return next(err);
  }
};

export const canDelete = async (req, res, next) => {
  try {
    const uid = req.session.userId;
    const count = await Application.countDocuments({
      ClientID: uid,
      Status: { $in: ['Pending', 'In Progress'] },
    });
    return res.json({ ok: true, hasActiveApplications: count > 0 });
  } catch (err) {
    return next(err);
  }
};

export const deleteProfile = async (req, res, next) => {
  try {
    const uid = req.session.userId;

    const activeCount = await Application.countDocuments({
      ClientID: uid,
      Status: { $in: ['Pending', 'In Progress'] },
    });
    if (activeCount > 0) {
      return res.status(400).json({ ok: false, message: "Cannot delete account if there is an active application." });
    }

    /* Wrap the multi-collection cleanup in a transaction so the parent
       user doc can't disappear while their support tickets or completed
       applications still point at them. */
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await SupportTicket.deleteMany({ ClientID: uid }).session(session);
        /* Completed applications are kept as historical financial
           records — anonymize by nulling ClientID and the client
           snapshot, instead of deleting them. */
        await Application.updateMany(
          { ClientID: uid },
          { $set: { ClientID: null, client: null } }
        ).session(session);
        await User.deleteOne({ UserID: uid }).session(session);
      });
    } finally {
      await session.endSession();
    }

    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      return res.status(200).json({ ok: true, message: "Account deleted successfully." });
    });
  } catch (err) {
    return next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const raw = req.query.UserID;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return res.status(400).json({ error: 'UserID is required (query)' });
    }
    const uid = Number(raw);
    if (!Number.isInteger(uid) || uid < 1) {
      return res.status(400).json({ error: 'Invalid UserID' });
    }

    if (req.body.FirstName !== undefined &&
        (typeof req.body.FirstName !== 'string' || req.body.FirstName.trim().length < 2)) {
      return res.status(400).json({ ok: false, message: "FirstName must be a string of at least 2 characters." });
    }
    if (req.body.LastName !== undefined &&
        (typeof req.body.LastName !== 'string' || req.body.LastName.trim().length < 2)) {
      return res.status(400).json({ ok: false, message: "LastName must be a string of at least 2 characters." });
    }
    if (req.body.Email !== undefined && !isValidEmail(req.body.Email)) {
      return res.status(400).json({ ok: false, message: "Valid email is required." });
    }
    if (req.body.Type !== undefined) {
      const t = typeof req.body.Type === 'string' ? req.body.Type.toUpperCase() : '';
      if (t !== 'C' && t !== 'A') {
        return res.status(400).json({ ok: false, message: 'Type must be "C" or "A".' });
      }
    }

    const existing = await User.findOne({ UserID: uid });
    if (!existing) {
      return res.status(404).json({
        Status: "Error",
        Message: `Record Id [${uid}] does not exist or has already been deleted. Update aborted.`,
      });
    }

    const $set = {};
    if (req.body.FirstName !== undefined) $set.FirstName = req.body.FirstName;
    if (req.body.LastName  !== undefined) $set.LastName  = req.body.LastName;
    if (req.body.Email     !== undefined) $set.Email     = normalizeEmail(req.body.Email);
    if (req.body.Type      !== undefined) $set.Type      = String(req.body.Type).toUpperCase();
    if (req.body.Password  !== undefined) {
      const passwordError = validatePassword(req.body.Password);
      if (passwordError) {
        return res.status(400).json({ ok: false, message: passwordError });
      }
      $set.Password = await bcrypt.hash(req.body.Password, SALT_ROUNDS);
    }

    await User.updateOne({ UserID: uid }, { $set });
    return res.status(200).json({ Status: 'OK', Message: `UserID [${uid}] updated successfully` });
  } catch (err) {
    return next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const uid = req.session?.userId;
    if (!uid) {
      return res.status(401).json({ ok: false, message: "Not logged in." });
    }

    const FirstName = String(req.body.FirstName ?? "").trim();
    const LastName = String(req.body.LastName ?? "").trim();
    const Email = normalizeEmail(req.body.Email);

    if (FirstName.length < 2) {
      return res.status(400).json({ ok: false, message: "First name must be at least 2 characters." });
    }
    if (LastName.length < 2) {
      return res.status(400).json({ ok: false, message: "Last name must be at least 2 characters." });
    }
    if (!isValidEmail(Email)) {
      return res.status(400).json({ ok: false, message: "Valid email is required." });
    }

    const dup = await User.findOne({ Email, UserID: { $ne: uid } }).select({ UserID: 1 });
    if (dup) {
      return res.status(409).json({ ok: false, message: "Email already in use." });
    }

    const updated = await User.findOneAndUpdate(
      { UserID: uid },
      { $set: { FirstName, LastName, Email } },
      { returnDocument: 'after' }
    );
    if (!updated) {
      return res.status(404).json({ ok: false, message: "User not found." });
    }

    /* Fan-out: refresh the client snapshot on every Application this
       user has filed so list views stay consistent. */
    await Application.updateMany(
      { ClientID: uid },
      { $set: { 'client.FirstName': FirstName, 'client.LastName': LastName } }
    );

    return res.status(200).json({
      ok: true,
      message: "Profile updated.",
      data: { user: sanitizeUser(updated) },
    });
  } catch (err) {
    return next(err);
  }
};

export const updateClient = async (req, res, next) => {
  try {
    const raw = req.query.ClientID;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return res.status(400).json({ error: 'ClientID is required (query)' });
    }
    const clientId = Number(raw);
    if (!Number.isInteger(clientId) || clientId < 1) {
      return res.status(400).json({ error: 'Invalid ClientID' });
    }

    const existing = await User.findOne({ UserID: clientId, Type: 'C' });
    if (!existing || !existing.client) {
      return res.status(404).json({
        Status: "Error",
        Message: `Record Id [${clientId}] does not exist or has already been deleted. Update aborted.`,
      });
    }

    const rawPhone = req.body.PhoneNumber !== undefined ? req.body.PhoneNumber : existing.client.PhoneNumber;
    const rawNID   = req.body.NationalID  !== undefined ? req.body.NationalID  : existing.client.NationalID;
    const Address  = req.body.Address     !== undefined ? String(req.body.Address).trim() : existing.client.Address;

    const phoneDigits = String(rawPhone ?? '').replace(/\D/g, '');
    const nidDigits   = String(rawNID ?? '').replace(/\D/g, '');

    if (!phoneDigits) return res.status(400).json({ error: 'Invalid PhoneNumber' });
    if (!nidDigits)   return res.status(400).json({ error: 'Invalid NationalID' });
    if (!Address)     return res.status(400).json({ error: 'Address is required' });

    await User.updateOne(
      { UserID: clientId },
      { $set: {
        'client.PhoneNumber': phoneDigits,
        'client.NationalID':  nidDigits,
        'client.Address':     Address,
      } }
    );

    return res.status(200).json({ Status: 'OK', Message: `ClientID [${clientId}] updated successfully` });
  } catch (err) {
    return next(err);
  }
};

export const updateAdmin = async (req, res, next) => {
  try {
    const raw = req.query.AdminID;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return res.status(400).json({ error: 'AdminID is required (query)' });
    }
    const adminId = Number(raw);
    if (!Number.isInteger(adminId) || adminId < 1) {
      return res.status(400).json({ error: 'Invalid AdminID' });
    }

    const existing = await User.findOne({ UserID: adminId, Type: 'A' });
    if (!existing) {
      return res.status(404).json({
        Status: "Error",
        Message: `Record Id [${adminId}] does not exist or has already been deleted. Update aborted.`,
      });
    }

    const LastLogin = req.body.LastLogin != null ? new Date(req.body.LastLogin) : new Date();
    await User.updateOne({ UserID: adminId }, { $set: { 'admin.LastLogin': LastLogin } });

    return res.status(200).json({ Status: 'OK', Message: `AdminID [${adminId}] updated successfully` });
  } catch (err) {
    return next(err);
  }
};

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
    if (!isValidEmail(Email)) {
      return res.status(400).json({ ok: false, message: "Valid email is required." });
    }
    const passwordError = validatePassword(Password);
    if (passwordError) {
      return res.status(400).json({ ok: false, message: passwordError });
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

      PhoneNumber = String(phoneRaw).replace(/\D/g, "");
      NationalID = String(nidRaw).replace(/\D/g, "");

      if (!PhoneNumber) {
        return res.status(400).json({ ok: false, message: "Invalid phone number." });
      }
      if (!NationalID) {
        return res.status(400).json({ ok: false, message: "Invalid national ID." });
      }
    }

    const existingEmail = await User.findOne({ Email }).select({ _id: 1 });
    if (existingEmail) {
      return res.status(409).json({ ok: false, message: "Email already exists." });
    }

    if (Type === "C") {
      const existingPhone = await User.findOne({ 'client.PhoneNumber': PhoneNumber }).select({ _id: 1 });
      if (existingPhone) {
        return res.status(409).json({ ok: false, message: "Phone number already exists." });
      }
      const existingNID = await User.findOne({ 'client.NationalID': NationalID }).select({ _id: 1 });
      if (existingNID) {
        return res.status(409).json({ ok: false, message: "National ID already exists." });
      }
    }

    const hashedPassword = await bcrypt.hash(Password, SALT_ROUNDS);
    const UserID = await nextId('user');

    const created = await User.create({
      UserID,
      FirstName,
      LastName,
      Email,
      Password: hashedPassword,
      Type,
      client: Type === 'C'
        ? { PhoneNumber, NationalID, Address }
        : null,
      admin: Type === 'A' ? { LastLogin: new Date() } : null,
    });

    return res.status(201).json({
      ok: true,
      message: "Registered successfully.",
      data: { user: sanitizeUser(created) },
    });
  } catch (err) {
    return next(err);
  }
};

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

    const user = await User.findOne({ Email });
    if (!user) {
      return res.status(401).json({ ok: false, message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(Password, user.Password);
    if (!isMatch) {
      return res.status(401).json({ ok: false, message: "Invalid email or password." });
    }

    req.session.userId = user.UserID;
    req.session.role = user.Type === "A" ? "admin" : "client";

    return res.status(200).json({
      ok: true,
      message: "Logged in successfully.",
      data: { user: sanitizeUser(user) },
    });
  } catch (err) {
    return next(err);
  }
};

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

/* List currently signed-in users. Sessions live in the same Mongo
   database (collection 'sessions'), so we query connect-mongo's TTL-managed
   collection directly and join back by UserID. */
export const onlineUsers = async (req, res, next) => {
  try {
    const sessions = await mongoose.connection.db
      .collection('sessions')
      .find({ expires: { $gt: new Date() } })
      .toArray();

    const userIds = sessions
      .map((s) => {
        try {
          /* connect-mongo stores the session blob either as an object
             (default) or as a JSON string depending on options; handle
             both shapes defensively. */
          const sess = typeof s.session === 'string' ? JSON.parse(s.session) : s.session;
          return sess?.userId ?? null;
        } catch {
          return null;
        }
      })
      .filter((id) => id !== null);

    if (!userIds.length) {
      return res.json({ ok: true, count: 0, users: [] });
    }

    const users = await User.find({ UserID: { $in: userIds } });
    return res.json({
      ok: true,
      count: users.length,
      users: users.map(sanitizeUser),
    });
  } catch (err) {
    return next(err);
  }
};

export const searchUser = async (req, res, next) => {
  try {
    const keyword = req.query.keyword;
    const keyvalue = req.query.keyvalue;
    const sort = req.query.sort?.toUpperCase() === 'DESC' ? -1 : 1;

    const allowedColumns = ['UserID', 'FirstName', 'LastName', 'Email', 'Type'];
    if (!allowedColumns.includes(keyword)) {
      return res.status(400).json({ error: `Invalid keyword. Allowed: ${allowedColumns.join(', ')}` });
    }
    if (!keyvalue) {
      return res.status(400).json({ error: 'keyvalue is required' });
    }

    /* UserID is numeric in storage — coerce so equality matches.
       Other allowed columns are strings, used as-is. */
    const value = keyword === 'UserID' ? Number(keyvalue) : keyvalue;
    const users = await User.find({ [keyword]: value }).sort({ UserID: sort });
    return res.json(users.map(sanitizeUser));
  } catch (err) {
    return next(err);
  }
};
