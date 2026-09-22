'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'investigator' | 'forensic_analyst' | 'auditor';

export type Permission =
  | 'upload'
  | 'custody_transfer'
  | 'ela_heatmap'
  | 'transcript'
  | 'court_dossier'
  | 'export_csv'
  | 'verify'
  | 'repository'
  | 'cases'
  | 'health';

export interface RoleInfo {
  id: Role;
  name: string;
  badge: string;
  code: string;
  color: string;
  pin: string;
  title: string;
  description: string;
}

export const ROLES: Record<Role, RoleInfo> = {
  investigator: {
    id: 'investigator',
    name: 'Investigator',
    badge: '🛡️ Investigator',
    code: 'INV',
    color: '#6366f1', // Indigo
    pin: '1001',
    title: 'Lead Forensic Investigator',
    description: 'Authorized for case ingestion, evidence registration, and legal custody handovers.',
  },
  forensic_analyst: {
    id: 'forensic_analyst',
    name: 'Forensic Analyst',
    badge: '🔬 Forensic Analyst',
    code: 'ANA',
    color: '#a855f7', // Purple/Violet
    pin: '2002',
    title: 'Digital Forensics Specialist',
    description: 'Authorized for deep tamper detection, ELA compression heatmaps, and audio transcription.',
  },
  auditor: {
    id: 'auditor',
    name: 'Auditor',
    badge: '⚖️ Court Auditor',
    code: 'AUD',
    color: '#10b981', // Emerald
    pin: '3003',
    title: 'Section 65B Compliance Auditor',
    description: 'Authorized for statutory Court Dossier certification and global cryptographic ledger audits.',
  },
};

const PERMISSIONS_MAP: Record<Permission, Role[]> = {
  upload: ['investigator'],
  custody_transfer: ['investigator'],
  ela_heatmap: ['forensic_analyst'],
  transcript: ['forensic_analyst'],
  court_dossier: ['auditor'],
  export_csv: ['auditor'],
  verify: ['investigator', 'forensic_analyst', 'auditor'],
  repository: ['investigator', 'forensic_analyst', 'auditor'],
  cases: ['investigator', 'forensic_analyst', 'auditor'],
  health: ['investigator', 'forensic_analyst', 'auditor'],
};

interface LockModalState {
  isOpen: boolean;
  featureName: string;
  requiredRole: Role;
  onUnlock?: () => void;
}

interface RoleContextType {
  currentRole: Role;
  roleInfo: RoleInfo;
  hasPermission: (permission: Permission) => boolean;
  verifyAndSwitchRole: (pin: string) => { success: boolean; role?: Role; error?: string };
  switchRoleDirect: (role: Role) => void;
  openLockModal: (featureName: string, requiredRole: Role, onUnlock?: () => void) => void;
  closeLockModal: () => void;
  lockModalState: LockModalState;
  isSwitchModalOpen: boolean;
  openSwitchModal: () => void;
  closeSwitchModal: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<Role>('investigator');
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [lockModalState, setLockModalState] = useState<LockModalState>({
    isOpen: false,
    featureName: '',
    requiredRole: 'investigator',
  });

  // Load saved role from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lexvault_active_role') as Role | null;
      if (saved && ROLES[saved]) {
        setCurrentRole(saved);
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, []);

  const switchRoleDirect = (role: Role) => {
    setCurrentRole(role);
    try {
      localStorage.setItem('lexvault_active_role', role);
    } catch {
      // Ignore
    }
  };

  const verifyAndSwitchRole = (pin: string) => {
    const trimmed = pin.trim();
    for (const [rId, info] of Object.entries(ROLES)) {
      if (info.pin === trimmed) {
        const role = rId as Role;
        switchRoleDirect(role);
        return { success: true, role };
      }
    }
    return { success: false, error: 'Invalid authorization PIN. Access denied.' };
  };

  const hasPermission = (permission: Permission): boolean => {
    const allowed = PERMISSIONS_MAP[permission] ?? [];
    return allowed.includes(currentRole);
  };

  const openLockModal = (featureName: string, requiredRole: Role, onUnlock?: () => void) => {
    setLockModalState({
      isOpen: true,
      featureName,
      requiredRole,
      onUnlock,
    });
  };

  const closeLockModal = () => {
    setLockModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const openSwitchModal = () => setIsSwitchModalOpen(true);
  const closeSwitchModal = () => setIsSwitchModalOpen(false);

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        roleInfo: ROLES[currentRole],
        hasPermission,
        verifyAndSwitchRole,
        switchRoleDirect,
        openLockModal,
        closeLockModal,
        lockModalState,
        isSwitchModalOpen,
        openSwitchModal,
        closeSwitchModal,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return ctx;
}
