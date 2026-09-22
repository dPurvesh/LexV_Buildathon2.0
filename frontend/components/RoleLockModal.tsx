'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRole, ROLES, Role } from '../context/RoleContext';

export default function RoleLockModal() {
  const {
    lockModalState,
    closeLockModal,
    verifyAndSwitchRole,
    currentRole,
    isSwitchModalOpen,
    closeSwitchModal,
    switchRoleDirect,
  } = useRole();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isLockActive = lockModalState.isOpen;
  const isSwitchActive = isSwitchModalOpen;
  const isOpen = isLockActive || isSwitchActive;

  const targetRole: Role = isLockActive
    ? lockModalState.requiredRole
    : currentRole;
  const targetRoleInfo = ROLES[targetRole];

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isLockActive) closeLockModal();
    if (isSwitchActive) closeSwitchModal();
  };

  const handleVerify = (customPin?: string) => {
    const pinToTest = customPin ?? pin;
    if (!pinToTest.trim()) {
      setError('Please enter a role PIN');
      return;
    }
    const result = verifyAndSwitchRole(pinToTest);
    if (result.success) {
      setError('');
      handleClose();
      if (isLockActive && lockModalState.onUnlock) {
        lockModalState.onUnlock();
      }
    } else {
      setError(result.error ?? 'Invalid PIN');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleVerify();
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <div className="role-modal-backdrop" onClick={handleClose}>
      <div className="role-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={handleClose} title="Close">
          ✕
        </button>

        <div className="role-modal-header">
          <div className="lock-icon-halo">
            {isLockActive ? '🔒' : '🔐'}
          </div>
          <h3>{isLockActive ? 'Access Restricted' : 'Switch Forensic Persona'}</h3>
          <p className="role-modal-desc">
            {isLockActive ? (
              <>
                <strong>{lockModalState.featureName}</strong> requires clearance reserved for{' '}
                <span className="role-highlight" style={{ color: targetRoleInfo?.color }}>
                  {targetRoleInfo?.name}
                </span>
                .
              </>
            ) : (
              'Enter an authorized 4-digit PIN to authenticate.'
            )}
          </p>
        </div>

        {isLockActive && (
          <div className="role-status-comparison">
            <div className="role-pill current">
              <small>Your Active Role</small>
              <strong>{ROLES[currentRole].badge}</strong>
            </div>
            <span className="arrow-sep">➔</span>
            <div className="role-pill required" style={{ borderColor: targetRoleInfo.color }}>
              <small>Required Role</small>
              <strong style={{ color: targetRoleInfo.color }}>{targetRoleInfo.badge}</strong>
            </div>
          </div>
        )}

        <div className="pin-entry-section">
          <label htmlFor="role-pin-input">Authorization PIN</label>
          <div className="pin-input-wrap">
            <input
              id="role-pin-input"
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={8}
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              className={`pin-input ${error ? 'has-error' : ''}`}
            />
            <button className="button button-primary pin-submit-btn" onClick={() => handleVerify()}>
              {isLockActive ? 'Unlock' : 'Authenticate'}
            </button>
          </div>
          {error && <span className="pin-error-msg">{error}</span>}
        </div>

        <div className="role-modal-footer">
          <small>Role policies enforce Section 65B forensic chain-of-custody compliance.</small>
        </div>
      </div>
    </div>
  );
}
