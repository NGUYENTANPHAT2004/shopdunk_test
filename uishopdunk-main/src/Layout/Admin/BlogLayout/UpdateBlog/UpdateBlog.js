import { Modal } from '../../../../components/Modal';
import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

function UpdateBlog({ isOpen, onClose, fetchdata, idblog }) {
  const [tieude_blog, setTieudeBlog] = useState('');
  const [file, setFile] = useState(null);
  const [noidung, setNoidung] = useState('');
  const [imagetieude, setImagetieude] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchChitiet = async () => {
    // Only fetch if we have a single blog ID
    if (!idblog || idblog.length !== 1) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3005/chitietblog1/${idblog[0]}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setTieudeBlog(data.tieude_blog || '');
      setNoidung(data.noidung || '');
      setImagetieude(data.img_blog || '');
      setError(null);
    } catch (error) {
      console.error('Error fetching blog details:', error);
      setError('Failed to load blog data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idblog && idblog.length === 1 && isOpen) {
      fetchChitiet();
    }
  }, [idblog, isOpen]);

  const handleClose = () => {
    setImagetieude('');
    setTieudeBlog('');
    setNoidung('');
    setFile(null);
    setError(null);
    onClose();
  };

  const handleEditBlog = async () => {
    if (!tieude_blog.trim()) {
      alert('Vui lòng nhập tiêu đề');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('tieude_blog', tieude_blog);
      formData.append('noidung', noidung);

      if (file) {
        formData.append('image', file);
      }

      const response = await fetch(`http://localhost:3005/putblog/${idblog[0]}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update blog');
      }

      handleClose();
      fetchdata();
    } catch (error) {
      console.error('Error updating blog:', error);
      setError(error.message || 'Failed to update blog. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className='addtheloai'>
        <h2>Cập nhật Blog</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className='div_input_group'>
          <div className='input-group1'>
            {imagetieude && (
              <img 
                src={imagetieude} 
                alt="Blog thumbnail" 
                width={300} 
                height={200}
                onError={(e) => e.target.src = 'placeholder-image.jpg'} 
              />
            )}
          </div>
          <div className='input-group'>
            <label>Ảnh</label>
            <input
              type='file'
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setFile(file);
                  setImagetieude(URL.createObjectURL(file));
                }
              }}
            />
          </div>
        </div>
        
        <div className='input-group'>
          <label>Tiêu đề:</label>
          <input
            type='text'
            value={tieude_blog}
            onChange={(e) => setTieudeBlog(e.target.value)}
            placeholder='Nhập tiêu đề'
            required
          />
          
          <label>Nội dung:</label>
          <ReactQuill
            value={noidung}
            onChange={setNoidung}
            placeholder='Nhập nội dung'
            theme='snow'
          />
        </div>

        <div className='button-group'>
          <button 
            onClick={handleEditBlog} 
            className='btnaddtl'
            disabled={loading}
          >
            {loading ? 'Đang cập nhật...' : 'Cập nhật'}
          </button>
          <button 
            onClick={handleClose} 
            className='btncancel'
          >
            Hủy
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default UpdateBlog;