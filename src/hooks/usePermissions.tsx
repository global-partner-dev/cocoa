import { useState, useEffect } from 'react';
import { ContestsService } from '@/lib/contestsService';

export const usePermissions = () => {
  const [canManageContests, setCanManageContests] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const hasPermission = await ContestsService.canManageContests();
        setCanManageContests(hasPermission);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setCanManageContests(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, []);

  return { canManageContests, loading };
};