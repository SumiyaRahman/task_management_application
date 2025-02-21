import React from 'react'

import { createBrowserRouter } from "react-router-dom";
import Login from "../components/Login";
import MainLayout from '../layout/MainLayout';

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout></MainLayout>,
  },    
  {
    path: "/login",
    element: <Login></Login>,
  },
]);

export default router;