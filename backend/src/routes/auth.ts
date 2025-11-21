// @ts-nocheck
import express from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database.js';

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
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash,
        role
      })
      .select('id, email, role, created_at')
      .single();

    if (userError || !user) {
      throw new Error(userError?.message || 'Failed to create user');
    }

    // If catering, create catering profile
    if (role === 'catering' && company_name) {
      await supabase
        .from('caterings')
        .insert({
          name: name || company_name,
          company_name,
          email,
          user_id: user.id
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
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    // Hash password
    const saltRounds = 12; // Higher for admin accounts
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert admin user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash,
        role: 'admin',
        is_active: true
      })
      .select('id, email, role, created_at')
      .single();

    if (userError || !user) {
      throw new Error(userError?.message || 'Failed to create admin user');
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
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash, role, is_active')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

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
      const { data: school } = await supabase
        .from('schools')
        .select('id, name, npsn, address, province, city, district, jenjang')
        .eq('user_id', user.id)
        .single();

      if (school) {
        userResponse.school_id = school.id;
        userResponse.school_name = school.name;
        userResponse.school_npsn = school.npsn;
        userResponse.school_address = school.address;
        userResponse.name = school.name; // gunakan nama sekolah sebagai nama user
      }
    }

    // jika role adalah catering, ambil data catering
    if (user.role === 'catering') {
      const { data: catering } = await supabase
        .from('caterings')
        .select('id, name, company_name')
        .eq('user_id', user.id)
        .single();

      if (catering) {
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
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role, is_active, created_at')
      .eq('id', decoded.id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user
    });
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
});

export default router;
