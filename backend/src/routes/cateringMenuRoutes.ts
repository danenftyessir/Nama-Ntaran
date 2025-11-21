// @ts-nocheck
import express, { type Request, type Response } from 'express';
import { supabase } from '../config/database.js';
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
    const { data: catering, error: cateringError } = await supabase
      .from('caterings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (cateringError || !catering) {
      return res.status(404).json({ error: 'Catering tidak ditemukan' });
    }

    const cateringId = catering.id;

    // Query ke database untuk mendapatkan menu items
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, description, calories, protein, vitamins, price, image_url, created_at')
      .eq('catering_id', cateringId)
      .order('created_at', { ascending: false });

    if (menuError) {
      console.error('Error fetching menus:', menuError);
      return res.status(500).json({ error: 'Gagal mengambil data menu' });
    }

    // map ke format frontend
    const menus: MenuItem[] = (menuItems || []).map((row, index) => ({
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

    // Query untuk detail menu dengan JOIN
    const { data: menuItem, error } = await supabase
      .from('menu_items')
      .select(`
        id,
        name,
        description,
        calories,
        protein,
        vitamins,
        price,
        image_url,
        caterings!inner(user_id)
      `)
      .eq('id', menuId)
      .eq('caterings.user_id', userId)
      .single();

    if (error || !menuItem) {
      return res.status(404).json({ error: 'Menu tidak ditemukan' });
    }

    res.json({
      id: menuItem.id.toString(),
      name: menuItem.name,
      description: menuItem.description,
      calories: menuItem.calories,
      protein: menuItem.protein,
      vitamins: menuItem.vitamins,
      price: menuItem.price,
      imageUrl: menuItem.image_url,
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
    const { data: catering, error: cateringError } = await supabase
      .from('caterings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (cateringError || !catering) {
      return res.status(404).json({ error: 'Catering tidak ditemukan' });
    }

    // Insert menu baru ke database
    const { data: newMenu, error: insertError } = await supabase
      .from('menu_items')
      .insert({
        catering_id: catering.id,
        name,
        description,
        calories,
        protein,
        vitamins,
        price,
        image_url: imageUrl,
      })
      .select('id')
      .single();

    if (insertError || !newMenu) {
      console.error('Error creating menu:', insertError);
      return res.status(500).json({ error: 'Gagal menambahkan menu' });
    }

    res.status(201).json({
      id: newMenu.id.toString(),
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

    // Verifikasi ownership dulu
    const { data: menuItem, error: checkError } = await supabase
      .from('menu_items')
      .select('id, caterings!inner(user_id)')
      .eq('id', menuId)
      .eq('caterings.user_id', userId)
      .single();

    if (checkError || !menuItem) {
      return res.status(404).json({ error: 'Menu tidak ditemukan' });
    }

    // Update menu di database
    const { data: updatedMenu, error: updateError } = await supabase
      .from('menu_items')
      .update({
        name,
        description,
        calories,
        protein,
        vitamins,
        price,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', menuId)
      .select('id')
      .single();

    if (updateError || !updatedMenu) {
      console.error('Error updating menu:', updateError);
      return res.status(500).json({ error: 'Gagal memperbarui menu' });
    }

    res.json({
      id: updatedMenu.id.toString(),
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

    // Verifikasi ownership dulu
    const { data: menuItem, error: checkError } = await supabase
      .from('menu_items')
      .select('id, caterings!inner(user_id)')
      .eq('id', menuId)
      .eq('caterings.user_id', userId)
      .single();

    if (checkError || !menuItem) {
      return res.status(404).json({ error: 'Menu tidak ditemukan' });
    }

    // Delete menu dari database
    const { error: deleteError } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', menuId);

    if (deleteError) {
      console.error('Error deleting menu:', deleteError);
      return res.status(500).json({ error: 'Gagal menghapus menu' });
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
  return images[index % images.length] || '/aesthetic view.jpg';
}

export default router;
