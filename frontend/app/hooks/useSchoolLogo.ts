/**
 * Custom hook to fetch and return school logo URL
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { schoolsApi } from '@/lib/api';

export function useSchoolLogo() {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchoolLogo = async () => {
      if (!user?.school_id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await schoolsApi.getById(user.school_id);
        const school = response.school;
        setLogoUrl(school.logo_url || '');
      } catch (error) {
        console.error('Failed to fetch school logo:', error);
        setLogoUrl('');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchoolLogo();
  }, [user?.school_id]);

  return { logoUrl, isLoading };
}
