import React, { Fragment, useEffect } from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { publicRoutes, privateRoutes } from './router';
import { DefaultLayout } from './Layout/DeafaultLayout';
import PrivateRoute from './router/Privateroutes';
import { useUserContext } from './context/Usercontext';

function AppContent() {
  const { isInitialized } = useUserContext();
  
  // Log trạng thái của Context khi component mount
  useEffect(() => {
    console.log('App mounted, UserContext initialized:', isInitialized);
  }, [isInitialized]);

  return (
    <div className="App">
      <Routes>
        {/* Public Routes */}
        {publicRoutes.map((route, index) => {
          let Layout = DefaultLayout;
          const Page = route.component;

          // Nếu route có layout được set là null
          if (route.layout === null) {
            Layout = Fragment;
          }

          return (
            <Route
              key={index}
              path={route.path}
              element={
                <Layout>
                  <Page />
                </Layout>
              }
            />
          );
        })}

        {/* Private Routes */}
        {privateRoutes.map((route, index) => {
          let Layout = DefaultLayout;
          const Page = route.component;

          // Nếu route có layout được set là null
          if (route.layout === null) {
            Layout = Fragment;
          }

          return (
            <Route
              key={`private-${index}`}
              path={route.path}
              element={
                <PrivateRoute 
                  component={() => (
                    <Layout>
                      <Page />
                    </Layout>
                  )}
                  requiredRoles={route.adminOnly ? ['admin'] : []}
                />
              }
            />
          );
        })}
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;