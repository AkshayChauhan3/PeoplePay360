import React, { useState, useEffect, useRef } from 'react';

/**
 * EntityCombobox
 *
 * A reusable, searchable combobox for Foreign Key selections.
 *
 * Props:
 * - value: number | string | null  (The currently selected ID)
 * - onChange: (id: number | null) => void (Emits the selected ID or null)
 * - options: Array<{ id: number | string, label: string, sublabel?: string }>
 * - placeholder?: string
 * - disabled?: boolean
 * - required?: boolean
 * - style?: React.CSSProperties
 */
const EntityCombobox = ({
  value,
  onChange,
  options = [],
  placeholder = 'Type name, code, or ID…',
  disabled = false,
  required = false,
  style = {},
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Find currently selected item
  const selectedItem = options.find(
    (opt) => String(opt.id) === String(value)
  );

  // Synchronize input text when value or options change
  useEffect(() => {
    if (selectedItem) {
      setSearchTerm(selectedItem.label);
    } else if (value !== null && value !== undefined && value !== '') {
      setSearchTerm(`#${value}`);
    } else {
      setSearchTerm('');
    }
  }, [value, selectedItem]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        commitCurrentInput();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [searchTerm, selectedItem, options]);

  // Filter options based on user typing
  const cleanTerm = searchTerm.trim().toLowerCase().replace(/^#/, '');
  const filteredOptions = options.filter((opt) => {
    if (!cleanTerm) return true;
    const labelMatch = (opt.label || '').toLowerCase().includes(cleanTerm);
    const subMatch = (opt.sublabel || '').toLowerCase().includes(cleanTerm);
    const idMatch = String(opt.id).toLowerCase().includes(cleanTerm);
    return labelMatch || subMatch || idMatch;
  });

  const commitCurrentInput = () => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }

    // Check if user input directly matches a numeric ID (e.g. "42" or "#42")
    const numericMatch = trimmed.match(/^#?(\d+)$/);
    if (numericMatch) {
      const parsedId = parseInt(numericMatch[1], 10);
      onChange(parsedId);
      return;
    }

    // Check if input exactly matches a label in options
    const exactOpt = options.find(
      (opt) => opt.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (exactOpt) {
      onChange(Number(exactOpt.id));
      return;
    }

    // Revert to current selected item if invalid input
    if (selectedItem) {
      setSearchTerm(selectedItem.label);
    } else if (value) {
      setSearchTerm(`#${value}`);
    } else {
      setSearchTerm('');
      onChange(null);
    }
  };

  const handleSelect = (opt) => {
    onChange(Number(opt.id));
    setSearchTerm(opt.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else {
        commitCurrentInput();
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
      if (selectedItem) setSearchTerm(selectedItem.label);
    }
  };

  const isSelected = value !== null && value !== undefined && value !== '';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        ...style,
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          className={`form-input ${className}`}
          placeholder={placeholder}
          disabled={disabled}
          required={required && !isSelected}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '38px',
            paddingRight: isSelected ? '54px' : '32px',
            background: disabled ? 'var(--surface-secondary, #f3f4f6)' : '#ffffff',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />

        {/* Clear (✕) Button */}
        {isSelected && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '28px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #6b7280)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Clear selection"
          >
            ✕
          </button>
        )}

        {/* Dropdown Chevron */}
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              if (!isOpen && inputRef.current) inputRef.current.focus();
            }
          }}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: `translateY(-50%) ${isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}`,
            transition: 'transform 0.15s ease',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: 'var(--text-secondary, #6b7280)',
            display: 'flex',
            alignItems: 'center',
            padding: '2px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '230px',
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid var(--border-structural, #e5e7eb)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
          }}
        >
          {filteredOptions.length === 0 ? (
            <div
              style={{
                padding: '10px 14px',
                fontSize: '12px',
                color: 'var(--text-secondary, #6b7280)',
                textAlign: 'center',
              }}
            >
              {searchTerm.trim().match(/^#?\d+$/) ? (
                <span>
                  Press <strong style={{ color: 'var(--primary, #005166)' }}>Enter</strong> to submit raw ID #{searchTerm.replace(/^#/, '')}
                </span>
              ) : (
                <span>No matching options found. You can type a direct numeric ID.</span>
              )}
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isItemHighlighted = idx === highlightedIndex;
              const isItemActive = String(opt.id) === String(value);

              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '13px',
                    background: isItemHighlighted
                      ? 'var(--surface-secondary, #f0fdfa)'
                      : isItemActive
                      ? 'var(--surface-structural, #f3f4f6)'
                      : 'transparent',
                    borderBottom: '1px solid var(--border-structural, #f3f4f6)',
                    transition: 'background 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: '8px' }}>
                    <span
                      style={{
                        fontWeight: isItemActive ? 700 : 500,
                        color: 'var(--text-primary, #111827)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {opt.label}
                    </span>
                    {opt.sublabel && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary, #6b7280)',
                          marginTop: '1px',
                        }}
                      >
                        {opt.sublabel}
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: 'var(--primary, #005166)',
                      background: 'rgba(0, 81, 102, 0.08)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}
                  >
                    #{opt.id}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default EntityCombobox;

