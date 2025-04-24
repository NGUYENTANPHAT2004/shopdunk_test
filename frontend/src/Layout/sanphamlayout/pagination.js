import React from 'react';
import './pagination.scss';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // Adjust start and end to always show 5 pages if possible
    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(startPage + 4, totalPages);
      } else if (endPage === totalPages) {
        startPage = Math.max(endPage - 4, 1);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
  };

  return (
    <div className="pagination">
      <button 
        className="pagination__arrow"
        disabled={currentPage === 1}
        onClick={() => onPageChange(1)}
        aria-label="Trang đầu tiên"
      >
        <i className="fas fa-angle-double-left"></i>
      </button>
      
      <button 
        className="pagination__arrow"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Trang trước"
      >
        <i className="fas fa-angle-left"></i>
      </button>
      
      {currentPage > 3 && totalPages > 5 && (
        <>
          <button 
            className="pagination__number"
            onClick={() => onPageChange(1)}
          >
            1
          </button>
          
          {currentPage > 4 && totalPages > 6 && (
            <span className="pagination__ellipsis">...</span>
          )}
        </>
      )}
      
      {getPageNumbers().map(number => (
        <button 
          key={number}
          className={`pagination__number ${currentPage === number ? 'active' : ''}`}
          onClick={() => onPageChange(number)}
        >
          {number}
        </button>
      ))}
      
      {currentPage < totalPages - 2 && totalPages > 5 && (
        <>
          {currentPage < totalPages - 3 && totalPages > 6 && (
            <span className="pagination__ellipsis">...</span>
          )}
          
          <button 
            className="pagination__number"
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </button>
        </>
      )}
      
      <button 
        className="pagination__arrow"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Trang sau"
      >
        <i className="fas fa-angle-right"></i>
      </button>
      
      <button 
        className="pagination__arrow"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(totalPages)}
        aria-label="Trang cuối cùng"
      >
        <i className="fas fa-angle-double-right"></i>
      </button>
    </div>
  );
};

export default Pagination;