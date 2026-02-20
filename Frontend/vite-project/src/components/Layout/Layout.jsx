import Header from './Header';
import Footer from './Footer';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <div className="ann-bar">
        Free delivery on orders above ৳999
        <span> | </span>
        Authentic handcrafted goods from across Bangladesh
        <span> | </span>
        Cash on delivery available
      </div>
      <Header />
      <main className="main-content">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
