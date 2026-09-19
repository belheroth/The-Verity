import React, { useState } from 'react';

// Reusable Filter Chip Component
const FilterChip = ({
  options = ['Active', 'Pending', 'Archived', 'New', 'Critical'],
  onChange,
  defaultValue = 'All'
}) => {
  const [selectedValue, setSelectedValue] = useState(defaultValue);

  const handleSelect = (value) => {
    setSelectedValue(value);
    if (onChange) onChange(value);
  };

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginBottom: '16px'
    }}>
      {['All', ...options].map(option => (
        <button
          key={option}
          value={option}
          onClick={() => handleSelect(option)}
          style={{
            padding: '6px 16px',
            borderRadius: '9999px',
            border: selectedValue === option
              ? '1px solid #007bff'
              : '1px solid #e2e8f0',
            backgroundColor: selectedValue === option
              ? '#e0f2fe'
              : 'white',
            color: selectedValue === option
              ? '#0369a1'
              : '#64748b',
            fontSize: '0.875rem',
            fontWeight: selectedValue === option ? '600' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (selectedValue !== option) {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedValue !== option) {
              e.currentTarget.style.backgroundColor = 'white';
            }
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default FilterChip;