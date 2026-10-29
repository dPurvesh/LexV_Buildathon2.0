'use client';

import React from 'react';
import { useRole } from '../context/RoleContext';
import { ShieldCheck, Microscope, Scale, ChevronDown } from 'lucide-react';

export default function RoleBadge() {
  const { roleInfo, openSwitchModal } = useRole();

  const renderRoleIcon = () => {
    switch (roleInfo.id) {
      case 'investigator':
        return <ShieldCheck size={14} color={roleInfo.color} />;
      case 'forensic_analyst':
        return <Microscope size={14} color={roleInfo.color} />;
      case 'auditor':
        return <Scale size={14} color={roleInfo.color} />;
      default:
        return <ShieldCheck size={14} color={roleInfo.color} />;
    }
  };

  return (
    <button
      type="button"
      className="role-selector-pill"
      onClick={openSwitchModal}
      style={{
        borderColor: `${roleInfo.color}44`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
      }}
      title={`Active Persona: ${roleInfo.name}. Click to switch role.`}
    >
      <span className="role-dot" style={{ backgroundColor: roleInfo.color, boxShadow: `0 0 8px ${roleInfo.color}` }} />
      {renderRoleIcon()}
      <span className="role-name">{roleInfo.badge}</span>
      <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
    </button>
  );
}
