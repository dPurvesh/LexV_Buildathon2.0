'use client';

import React from 'react';
import { useRole } from '../context/RoleContext';

export default function RoleBadge() {
  const { roleInfo, openSwitchModal } = useRole();

  return (
    <button
      type="button"
      className="role-selector-pill"
      onClick={openSwitchModal}
      style={{
        borderColor: `${roleInfo.color}44`,
      }}
      title={`Active Persona: ${roleInfo.name}. Click to switch role.`}
    >
      <span className="role-dot" style={{ backgroundColor: roleInfo.color, boxShadow: `0 0 8px ${roleInfo.color}` }} />
      <span className="role-name">{roleInfo.badge}</span>
      <span className="role-chevron">▾</span>
    </button>
  );
}
