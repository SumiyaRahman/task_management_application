import React from 'react'

import { createBrowserRouter } from "react-router-dom";
import Login from "../components/Login";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login></Login>,
  },
]);

export default router;