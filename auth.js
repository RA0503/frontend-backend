import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const router = express.Router();
const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRE || '2h';


router.post('/signup', async (req, res) => {
  try {
    console.log(req.body);
    
    const { email, password, name } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Admin already exists' });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const admin = new Admin({ email, passwordHash, name });
    await admin.save();
    return res.status(201).json({ message: 'Admin created', adminId: admin._id });
  } catch (err) {
    console.error('Signup error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ sub: admin._id, email: admin.email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ token, expiresIn: JWT_EXPIRES_IN });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
