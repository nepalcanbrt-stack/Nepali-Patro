import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useFirebase } from '../contexts/FirebaseContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  IconThemeId,
  isValidIconThemeId,
  isValidThemeId,
  THEME_PALETTES,
  ThemeId,
} from '../types/theme';

const PREFS_STORAGE_KEY = 'nepal_patro_prefs_v1';
const PRIVATE_LOCK_STORAGE_KEY = 'nepal_patro_private_lock_v1';

interface LocalPrefs {
  preferredRashi: string;
  useDevanagariNums: boolean;
  theme: ThemeId;
  iconTheme: IconThemeId;
}

export function useUserPreferences() {
  const { user, authReady, isVerifiedIdentity } = useFirebase();
  const [localPrefs, setLocalPrefs] = useState<LocalPrefs>(() => {
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          preferredRashi: typeof parsed.preferredRashi === 'string' ? parsed.preferredRashi : 'mesha',
          useDevanagariNums:
            typeof parsed.useDevanagariNums === 'boolean' ? parsed.useDevanagariNums : true,
          theme: isValidThemeId(parsed.theme) ? parsed.theme : 'lavender-dawn',
          iconTheme: isValidIconThemeId(parsed.iconTheme) ? parsed.iconTheme : 'nepali-cultural',
        };
      }
    } catch {
      // Ignore storage errors
    }
    return {
      preferredRashi: 'mesha',
      useDevanagariNums: true,
      theme: 'lavender-dawn',
      iconTheme: 'nepali-cultural',
    };
  });

  const [privateLockEnabled, setPrivateLockEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PRIVATE_LOCK_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [cloudPrefs, setCloudPrefs] = useState<LocalPrefs | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(localPrefs));
    } catch {
      // Ignore storage errors
    }
  }, [localPrefs]);

  useEffect(() => {
    try {
      localStorage.setItem(PRIVATE_LOCK_STORAGE_KEY, String(privateLockEnabled));
    } catch {
      // Ignore storage errors
    }
  }, [privateLockEnabled]);

  const isCloud = Boolean(authReady && user && isVerifiedIdentity);

  useEffect(() => {
    if (!isCloud || !user) {
      setCloudPrefs(null);
      return;
    }

    const path = `users/${user.uid}/preferences/settings`;
    const ref = doc(db, 'users', user.uid, 'preferences', 'settings');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCloudPrefs({
            preferredRashi:
              typeof data.preferredRashi === 'string' ? data.preferredRashi : 'mesha',
            useDevanagariNums:
              typeof data.useDevanagariNums === 'boolean' ? data.useDevanagariNums : true,
            theme: isValidThemeId(data.theme) ? data.theme : localPrefs.theme,
            iconTheme: isValidIconThemeId(data.iconTheme) ? data.iconTheme : localPrefs.iconTheme,
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return unsub;
  }, [isCloud, user, localPrefs.theme, localPrefs.iconTheme]);

  const activePrefs = cloudPrefs ?? localPrefs;

  // Apply active theme to <html> element immediately
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', activePrefs.theme);
    const meta = THEME_PALETTES.find((t) => t.id === activePrefs.theme);
    if (meta?.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [activePrefs.theme]);

  const updatePreferences = useCallback(
    async (partial: Partial<LocalPrefs>) => {
      const next: LocalPrefs = {
        preferredRashi: (partial.preferredRashi ?? activePrefs.preferredRashi).slice(0, 24),
        useDevanagariNums: partial.useDevanagariNums ?? activePrefs.useDevanagariNums,
        theme: isValidThemeId(partial.theme) ? partial.theme : activePrefs.theme,
        iconTheme: isValidIconThemeId(partial.iconTheme) ? partial.iconTheme : activePrefs.iconTheme,
      };
      setLocalPrefs(next);
      if (cloudPrefs) {
        setCloudPrefs(next);
      }

      if (isCloud && user) {
        const path = `users/${user.uid}/preferences/settings`;
        const ref = doc(db, 'users', user.uid, 'preferences', 'settings');
        try {
          await setDoc(ref, {
            ownerUid: user.uid,
            preferredRashi: next.preferredRashi,
            useDevanagariNums: next.useDevanagariNums,
            theme: next.theme,
            iconTheme: next.iconTheme,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }
    },
    [activePrefs, cloudPrefs, isCloud, user]
  );

  return {
    preferredRashi: activePrefs.preferredRashi,
    useDevanagariNums: activePrefs.useDevanagariNums,
    theme: activePrefs.theme,
    iconTheme: activePrefs.iconTheme,
    privateLockEnabled,
    setPrivateLockEnabled,
    updatePreferences,
  };
}
