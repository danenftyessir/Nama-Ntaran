import express, { type Request, type Response } from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// interface untuk menu item
interface MenuItem {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  vitamins: string;
  price: number;
  imageUrl: string;
}

// GET /api/catering/menu - get semua menu milik catering
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // get catering id dari user
    const cateringResult = await pool.query(
      'SELECT id FROM caterings WHERE user_id = $1',
      [userId]
    );

    if (cateringResult.rows.length === 0) {
      return res.status(404).json({ error: 'Catering tidak ditemukan' });
    }

    const cateringId = cateringResult.rows[0].id;

    // TO DO: query ke database untuk mendapatkan menu
    // contoh query (sesuaikan dengan schema database)
    const menusResult = await pool.query(
      `SELECT
        id,
        name,
        description,
        calories,
        protein,
        vitamins,
        price,
        image_url
      FROM menus
      WHERE catering_id = $1
      ORDER BY created_at DESC`,
      [cateringId]
    );

    // map ke format frontend
    const menus: MenuItem[] = menusResult.rows.map((row, index) => ({
      id: row.id.toString(),
      name: row.name || `Menu ${index + 1}`,
      description: row.description || '',
      calories: row.calories || 0,
      protein: row.protein || 0,
      vitamins: row.vitamins || '',
      price: row.price || 0,
      imageUrl: row.image_url || getDefaultImage(index),
    }));

    res.json({
      menus,
      totalCount: menus.length,
    });
  } catch (error) {
    console.error('Error fetching menus:', error);
    res.status(500).json({ error: 'Gagal mengambil data menu' });
  }
});

// GET /api/catering/menu/:id - get detail menu
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const menuId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // TO DO: implementasi query untuk detail menu
    const result = await pool.query(
      `SELECT
        m.id,
        m.name,
        m.description,
        m.calories,
        m.protein,
        m.vitamins,
        m.price,
        m.image_url
      FROM menus m
      JOIN caterings c ON m.catering_id = c.id
      WHERE m.id = $1 AND c.user_id = $2`,
      [menuId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu tidak ditemukan' });
    }

    const row = result.rows[0];

    res.json({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      calories: row.calories,
      protein: row.protein,
      vitamins: row.vitamins,
      price: row.price,
      imageUrl: row.image_url,
    });
  } catch (error) {
    console.error('Error fetching menu detail:', error);
    res.status(500).json({ error: 'Gagal mengambil detail menu' });
  }
});

// POST /api/catering/menu - tambah menu baru
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { name, description, calories, protein, vitamins, price, imageUrl } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // validasi input
    if (!name || !price) {
      return res.status(400).json({ error: 'Nama dan harga menu wajib diisi' });
    }

    // get catering id dari user
    const cateringResult = await pool.query(
      'SELECT id FROM caterings WHERE user_id = $1',
      [userId]
    );

    if (cateringResult.rows.length === 0) {
      return res.status(404).json({ error: 'Catering tidak ditemukan' });
    }

    const cateringId = cateringResult.rows[0].id;

    // TO DO: implementasi insert menu ke database
    const result = await pool.query(
      `INSERT INTO menus (catering_id, name, description, calories, protein, vitamins, price, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [cateringId, name, description, calories, protein, vitamins, price, imageUrl]
    );

    res.status(201).json({
      id: result.rows[0].id.toString(),
      message: 'Menu berhasil ditambahkan',
    });
  } catch (error) {
    console.error('Error creating menu:', error);
    res.status(500).json({ error: 'Gagal menambahkan menu' });
  }
});

// PUT /api/catering/menu/:id - update menu
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const menuId = req.params.id;
    const { name, description, calories, protein, vitamins, price, imageUrl } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // TO DO: implementasi update menu di database
    const result = await pool.query(
      `UPDATE menus m
      SET name = $1, description = $2, calories = $3, protein = $4,
          vitamins = $5, price = $6, image_url = $7, updated_at = NOW()
      FROM caterings c
      WHERE m.id = $8 AND m.catering_id = c.id AND c.user_id = $9
      RETURNING m.id`,
      [name, description, calories, protein, vitamins, price, imageUrl, menuId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu tidak ditemukan' });
    }

    res.json({
      id: result.rows[0].id.toString(),
      message: 'Menu berhasil diperbarui',
    });
  } catch (error) {
    console.error('Error updating menu:', error);
    res.status(500).json({ error: 'Gagal memperbarui menu' });
  }
});

// DELETE /api/catering/menu/:id - hapus menu
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const menuId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // TO DO: implementasi delete menu dari database
    const result = await pool.query(
      `DELETE FROM menus m
      USING caterings c
      WHERE m.id = $1 AND m.catering_id = c.id AND c.user_id = $2
      RETURNING m.id`,
      [menuId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu tidak ditemukan' });
    }

    res.json({
      message: 'Menu berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting menu:', error);
    res.status(500).json({ error: 'Gagal menghapus menu' });
  }
});

// helper function untuk mendapatkan default image
function getDefaultImage(index: number): string {
  const images = [
    '/aesthetic view.jpg',
    '/aesthetic view 2.jpg',
    '/aesthetic view 3.jpg',
    '/aesthetic view 4.jpg',
    '/aesthetic view 5.jpg',
    '/jagung.jpg',
  ];
  return images[index % images.length];
}

export default router;
