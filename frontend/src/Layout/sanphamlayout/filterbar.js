import React from 'react';
import './filterbar.scss';

const FilterBar = ({
  activeFilters = [],
  loading = false,
  sortOrder = 'asc',
  onSortOrderChange,
  onRemoveFilter,
  onClearAllFilters,
  onToggleMobileFilters
}) => {
  return (
    <div className="filter-bar">
      <div className="filter-bar__header">
        <div className="filter-bar__title">
          <h2>Sản phẩm</h2>
          {loading && <span className="filter-bar__loading-indicator">Đang tải...</span>}
        </div>
        
        <div className="filter-bar__actions">
          <button 
            className="filter-bar__sort-btn"
            onClick={onSortOrderChange}
          >
            <span>Giá: {sortOrder === 'asc' ? 'Thấp đến Cao' : 'Cao đến Thấp'}</span>
            <i className={`fas fa-sort-amount-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
          </button>
          
          <button 
            className="filter-bar__mobile-filter-btn"
            onClick={onToggleMobileFilters}
          >
            <i className="fas fa-filter"></i>
            <span>Lọc</span>
          </button>
        </div>
      </div>
      
      {activeFilters.length > 0 && (
        <div className="filter-bar__active-filters">
          <span className="filter-bar__filters-label">Lọc theo:</span>
          
          <div className="filter-bar__filter-tags">
            {activeFilters.map((filter, index) => (
              <div key={index} className="filter-bar__filter-tag">
                <span>{filter.name}</span>
                <button 
                  onClick={() => onRemoveFilter(filter.type)}
                  className="filter-bar__remove-tag"
                  aria-label={`Xóa bộ lọc ${filter.name}`}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
          </div>
          
          <button 
            className="filter-bar__clear-all"
            onClick={onClearAllFilters}
          >
            Xóa tất cả
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;