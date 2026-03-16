import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context';

const RequireAdmin = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RequireAdmin;
