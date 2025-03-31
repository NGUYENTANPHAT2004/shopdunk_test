import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './splienquan.scss';

export const RelatedProducts = ({ category, currentProductId }) => {
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!category) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`http://localhost:3005/san-pham/${category}`);
        
        if (!response.ok) {
          throw new Error('Server responded with an error');
        }
        
        const data = await response.json();
        
        // Check if data contains the sanpham array property
        if (data && data.sanpham && Array.isArray(data.sanpham)) {
          // Filter out the current product if it exists in the related products
          const filteredProducts = data.sanpham.filter(
            product => product._id !== currentProductId
          );
          setRelatedProducts(filteredProducts);
        } else {
          throw new Error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching related products:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRelatedProducts();
  }, [category, currentProductId]);

  if (isLoading) {
    return (
      <div className="related-products">
        <h3>Sản phẩm liên quan</h3>
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="related-products">
        <h3>Sản phẩm liên quan</h3>
        <div className="error">Lỗi: {error}</div>
      </div>
    );
  }

  return (
    <div className="related-products">
      <h3>Sản phẩm liên quan</h3>
      {relatedProducts.length > 0 ? (
        <div className="related-products-grid">
          {relatedProducts.map((product) => (
            <Link to={`/chitietsanpham/${category}/${product.namekhongdau}`} key={product._id} className="related-product-item">
              <img src={product.image} alt={product.name} />
              <h4>{product.name}</h4>
              <p className="price">{product.price.toLocaleString()}đ</p>
            </Link>
          ))}
        </div>
      ) : (
        <p>Không tìm thấy sản phẩm liên quan.</p>
      )}
    </div>
  );
};

export default RelatedProducts;