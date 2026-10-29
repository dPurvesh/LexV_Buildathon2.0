'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRole, ROLES, Role } from '../context/RoleContext';
import { Lock, KeyRound, X, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function RoleLockModal() {
  const {
    lockModalState,
    closeLockModal,
    verifyAndSwitchRole,
    currentRole,
    isSwitchModalOpen,
    closeSwitchModal,
  } = useRole();

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
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
      setShowPin(false);
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
          <X size={16} />
        </button>

        <div className="role-modal-header">
          <div className="lock-icon-halo">
            {isLockActive ? <Lock size={26} color="var(--amber)" /> : <KeyRound size={26} color="var(--cyan)" />}
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
            <span className="arrow-sep"><ArrowRight size={14} color="var(--cyan)" /></span>
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
              type={showPin ? 'text' : 'password'}
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
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setShowPin(!showPin)}
              title={showPin ? 'Hide PIN' : 'Show PIN'}
              style={{ padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button className="button button-primary pin-submit-btn" onClick={() => handleVerify()}>
              {isLockActive ? 'Unlock' : 'Authenticate'}
            </button>
          </div>
          {error && <span className="pin-error-msg">{error}</span>}

          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <small style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Authorized Role Clearance PINs:
            </small>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {Object.values(ROLES).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setPin(r.pin);
                    handleVerify(r.pin);
                  }}
                  className="button button-secondary"
                  style={{
                    fontSize: '11px',
                    padding: '4px 9px',
                    borderRadius: '6px',
                    borderColor: r.id === targetRole ? r.color : undefined,
                    background: r.id === targetRole ? `${r.color}18` : undefined,
                    color: r.id === targetRole ? r.color : 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  title={`Click to authenticate as ${r.name} (PIN: ${r.pin})`}
                >
                  <span style={{ fontWeight: 600 }}>{r.name}:</span>
                  <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.pin}</code>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="role-modal-footer">
          <small>Role policies enforce Section 65B forensic chain-of-custody compliance.</small>
        </div>
      </div>
    </div>
  );
}
