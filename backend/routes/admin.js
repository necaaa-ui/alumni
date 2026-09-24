const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const getGuestAccessCollection = () => mongoose.connection.useDb('local_Administration').collection('guest_access');

const normalizeGuestEmail = (email) => String(email || '').trim().toLowerCase();

router.get('/guest-access', async (req, res) => {
  try {
    const collection = getGuestAccessCollection();
    const guests = await collection.find({}).sort({ createdAt: -1 }).toArray();
    const Member = req.app.locals.Member;
    if (Member) {
      await Promise.all(guests.map(async (guest) => {
        if (guest.name && guest.phone) return;
        const escapedEmail = normalizeGuestEmail(guest.email).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const member = await Member.findOne({ 'basic.email_id': { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }).lean();
        const name = guest.name || member?.basic?.name || '';
        const phone = guest.phone || member?.contact_details?.mobile || member?.contact_details?.phone || member?.mobile || member?.phone || '';
        if (name || phone) {
          guest.name = name;
          guest.phone = phone;
          await collection.updateOne({ _id: guest._id }, { $set: { name, phone } });
        }
      }));
    }
    return res.json(guests);
  } catch (error) {
    console.error('Error fetching guest access:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/guest-access/lookup', async (req, res) => {
  try {
    const email = normalizeGuestEmail(req.query?.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'A valid guest email is required' });
    }

    const Member = req.app.locals.Member;
    if (!Member) return res.json({ name: '', phone: '' });
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const member = await Member.findOne({ 'basic.email_id': { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }).lean();
    return res.json({
      name: member?.basic?.name || '',
      phone: member?.contact_details?.mobile || member?.contact_details?.phone || member?.mobile || member?.phone || ''
    });
  } catch (error) {
    console.error('Error looking up guest details:', error);
    return res.status(500).json({ message: 'Failed to look up member details' });
  }
});

router.post('/guest-access', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = normalizeGuestEmail(req.body?.email);
    const phone = String(req.body?.phone || '').trim();
    if (!name || !phone) {
      return res.status(400).json({ message: 'Guest name and phone number are required' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'A valid guest email is required' });
    }

    const collection = getGuestAccessCollection();
    const existing = await collection.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Guest email already exists' });

    const guest = { name, email, phone, enabled: true, createdAt: new Date(), source: 'admin' };
    await collection.insertOne(guest);
    return res.status(201).json(guest);
  } catch (error) {
    console.error('Error adding guest access:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/guest-access/:id', async (req, res) => {
  try {
    const collection = getGuestAccessCollection();
    const result = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { enabled: Boolean(req.body?.enabled), updatedAt: new Date() } }
    );
    if (!result.matchedCount) return res.status(404).json({ message: 'Guest access record not found' });
    return res.json({ message: 'Guest access updated successfully' });
  } catch (error) {
    console.error('Error updating guest access:', error);
    return res.status(400).json({ message: 'Invalid guest access id' });
  }
});

router.delete('/guest-access/:id', async (req, res) => {
  try {
    const collection = getGuestAccessCollection();
    const result = await collection.deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
    if (!result.deletedCount) return res.status(404).json({ message: 'Guest access record not found' });
    return res.json({ message: 'Guest access removed successfully' });
  } catch (error) {
    console.error('Error removing guest access:', error);
    return res.status(400).json({ message: 'Invalid guest access id' });
  }
});


// ==========================================
// CHECK MEMBER BY EMAIL
// ==========================================
router.get("/check-member", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const member = await mongoose.connection.db
      .collection("members")
      .findOne({
        "basic.email_id": { $regex: new RegExp(`^${email}$`, "i") }
      });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const adminDb = mongoose.connection.useDb("local_Administration");

    const assignedRoles = await adminDb
      .collection("assign_roles")
      .find({ memberId: member._id })
      .toArray();

    const existingRoleIds = assignedRoles.map(r => r.roleId);

    res.json({
      memberId: member._id,
      name: member.basic.name,
      email: member.basic.email_id,
      existingRoles: existingRoleIds
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// ==========================================
// GET ALL ROLES
// ==========================================
router.get("/roles", async (req, res) => {
  try {
    const roles = await mongoose.connection.db
      .collection("roles")
      .find({})
      .toArray();

    res.json(roles);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


// ==========================================
// ASSIGN ROLES
// ==========================================
router.post("/assign-roles", async (req, res) => {
  try {
    const { memberId, roleIds } = req.body;

    console.log("Incoming Data:", req.body);

    if (!memberId || !Array.isArray(roleIds)) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const adminDb = mongoose.connection.useDb("local_Administration");

    const objectMemberId = new mongoose.Types.ObjectId(memberId);

    // 🔹 Explicitly create collection if not exists
    const collections = await adminDb.db.listCollections().toArray();
    const exists = collections.some(c => c.name === "assign_roles");

    if (!exists) {
      await adminDb.createCollection("assign_roles");
      console.log("assign_roles collection created");
    }

    // 🔹 Delete previous roles
    await adminDb.collection("assign_roles").deleteMany({
      memberId: objectMemberId
    });

    // 🔹 Insert new roles
    if (roleIds.length > 0) {
      const docs = roleIds.map(roleId => ({
        memberId: objectMemberId,
        roleId: Number(roleId),
        assignedAt: new Date()
      }));

      const result = await adminDb.collection("assign_roles").insertMany(docs);

      console.log("Inserted:", result.insertedCount);
    }

    res.json({ message: "Roles assigned successfully" });

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
