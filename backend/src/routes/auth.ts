import express from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, role, name, company_name } = req.body;

  // Validation
  if (!email || !password || !role) {
    return res.status(400).json({
      error: 'Email, password, and role are required'
    });
  }

  if (!['school', 'catering'].includes(role)) {
    return res.status(400).json({
      error: 'Role must be either "school" or "catering"'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters'
    });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [email, password_hash, role]
    );

    const user = userResult.rows[0];

    // If catering, create catering profile
    if (role === 'catering' && company_name) {
      await pool.query(
        `INSERT INTO caterings (name, company_name, email, user_id)
         VALUES ($1, $2, $3, $4)`,
        [name || company_name, company_name, email, user.id]
      );
    }

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'nutrichain-secret-key';
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      secret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/auth/register-admin (admin registration with invite code)
router.post('/register-admin', async (req: Request, res: Response) => {
  const { email, password, name, inviteCode } = req.body;

  // Validation
  if (!email || !password || !inviteCode) {
    return res.status(400).json({
      error: 'Email, password, and invite code are required'
    });
  }

  // Validate invite code (hardcoded for now, can be stored in DB later)
  const ADMIN_INVITE_CODE = process.env.ADMIN_INVITE_CODE || 'MBG-ADMIN-2025';
  if (inviteCode !== ADMIN_INVITE_CODE) {
    return res.status(403).json({
      error: 'Invalid invite code'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters for admin accounts'
    });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    // Hash password
    const saltRounds = 12; // Higher for admin accounts
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert admin user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, created_at`,
      [email, password_hash, 'admin', true]
    );

    const user = userResult.rows[0];

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'nutrichain-secret-key';
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      secret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Admin registration successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      error: 'Admin registration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required'
    });
  }

  try {
    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account is disabled'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'nutrichain-secret-key';
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      secret,
      { expiresIn: '7d' }
    );

    // siapkan response user
    let userResponse: any = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    // jika role adalah school, ambil data sekolah
    if (user.role === 'school') {
      const schoolResult = await pool.query(
        `SELECT id, name, npsn, address, province, city, district, jenjang
         FROM schools WHERE user_id = $1`,
        [user.id]
      );

      if (schoolResult.rows.length > 0) {
        const school = schoolResult.rows[0];
        userResponse.school_id = school.id;
        userResponse.school_name = school.name;
        userResponse.school_npsn = school.npsn;
        userResponse.school_address = school.address;
        userResponse.name = school.name; // gunakan nama sekolah sebagai nama user
      }
    }

    // jika role adalah catering, ambil data catering
    if (user.role === 'catering') {
      const cateringResult = await pool.query(
        `SELECT id, name, company_name
         FROM caterings WHERE user_id = $1`,
        [user.id]
      );

      if (cateringResult.rows.length > 0) {
        const catering = cateringResult.rows[0];
        userResponse.catering_id = catering.id;
        userResponse.catering_name = catering.company_name || catering.name;
        userResponse.name = catering.name;
      }
    }

    res.json({
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/auth/me (get current user info)
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'nutrichain-secret-key';
    const decoded = jwt.verify(token, secret) as {
      id: number;
      email: string;
      role: string;
    };

    // Get user info from database
    const result = await pool.query(
      'SELECT id, email, role, is_active, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: result.rows[0]
    });
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
});

export default router;
